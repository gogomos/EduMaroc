import { Request, Response, NextFunction } from "express";
import userModel, { IUser } from "../models/user.model";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import jwt, { Secret , JwtPayload } from "jsonwebtoken";
import ejs from "ejs";
import path from "path";
import sendMail from "../utils/sendMail";
import { sendToken } from './../utils/jwt';
import { redis } from "../utils/redis";
import { accessTokenOptions, refreshTokenOptions } from "../utils/jwt";
import { getAllUsersService, getUserById, updateUserRoleService } from "../services/user.service";
import cloudinary from "cloudinary";
import { assert } from "console";
require("dotenv").config();

//register user
interface IRegisterUser {
  name: string;
  email: string;
  password: string;
  avatar?: string;
}

export const registrationUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password, avatar } = req.body as IRegisterUser;
      const isEmailExist = await userModel.findOne({ email });
      if (isEmailExist) {
        return next(new ErrorHandler("Email already exists", 400));
      }
      const user: IRegisterUser = {
        name,
        email,
        password,
      };
      const activationToken = createActivationToken(user);
      const activationCode = activationToken.activationCode;
      const data = { user: { name: user.name }, activationCode };
      const html = await ejs.renderFile(
        path.join(__dirname, "../mails/avtivation-mail.ejs"),
        data
      );

      try {
        await sendMail({
          email: user.email,
          subject: "Activate your account",
          template: "avtivation-mail",
          data,
        });
        // Ineed to send the user
        res.status(201).json({
          success: true,
          message: `Please check your email - ${user.email} to activate your account`,
          activationToken: activationToken.token,
        });
      } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

interface IActivationToken {
  token: string;
  activationCode: string;
}
export const createActivationToken = (user: any): IActivationToken => {
  const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

  const token = jwt.sign(
    { user, activationCode },
    process.env.ACTIVATION_TOKEN_SECRET as Secret,
    {
      expiresIn: "5m",
    }
  );
  return {
    activationCode,
    token,
  };
};

//activate user
 interface IActivationRequest {
  activation_token: string;
  activation_code: string;
 }

 export const activateUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { activation_token, activation_code } = req.body as IActivationRequest;
     const newUser: {user: IUser, activationCode: string} = jwt.verify(
      activation_token,
      process.env.ACTIVATION_TOKEN_SECRET as Secret
    ) as {user: IUser, activationCode: string};
    if (newUser.activationCode !== activation_code) {
      return next(new ErrorHandler("Invalid activation code", 400));
    }

    const { name, email, password } = newUser.user;
    const existUser = await userModel.findOne({ email });
    if (existUser) {
      return next(new ErrorHandler("User already exists", 400));
    }
    const user = await userModel.create({ name, email, password });
    res.status(201).json({
      success: true,
      message: "Account has been activated",
      user,
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 400));
  }
});

//login user

interface ILoginRequest {
  email: string;
  password: string;
}

export const loginUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body as ILoginRequest;
    if (!email || !password) {
      return next(new ErrorHandler("Please Enter Email & Password", 400));
    }
    const user = await userModel.findOne({ email }).select("+password");

    if (!user) {
      return next(new ErrorHandler("Invalid Email or Password", 400));
    }
    const isPasswordMatched = await user.comparePassword(password);
    if (!isPasswordMatched) {
      return next(new ErrorHandler("Invalid Email or Password", 400));
    }
    sendToken(user, 200, res);
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 400));
  }
});

export const logoutUser = (req: Request, res: Response, next: NextFunction) => {
  try {
    // console.log("logout user")
    res.cookie("access_token", "", {maxAge: 1});
    res.cookie("refresh_token", "", {maxAge: 1});
    const userId = req.user._id;
    redis.del(userId);
    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    })
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 400));
  }
}

//update accses token
export const updateAccessToken = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refresh_token = req.cookies.refresh_token as string;
      if (!refresh_token) {
        return next(new ErrorHandler("Please login to access this resource", 401));
      }
      const decoded = jwt.verify(refresh_token, process.env.REFRESH_TOKEN as Secret) as JwtPayload;
      if (!decoded) {
        return next(new ErrorHandler("Could not refresh token", 401));
      }
      const session = await redis.get(decoded.id as string);
      if (!session) {
        return next(new ErrorHandler("Could not refresh token", 401));
      }
      const user = JSON.parse(session);
      const accsesToken = jwt.sign({ id: user._id }, process.env.ACCESS_TOKEN as Secret , {
        expiresIn: "5m",
      });
      const refreshToken = jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN as Secret , {
        expiresIn: "3d",
      });
      req.user = user;
      res.cookie("access_token", accsesToken, accessTokenOptions);
      res.cookie("refresh_token", refreshToken, refreshTokenOptions);
      res.status(200).json({
        success: true,
        accsesToken
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
)

// get user info 
export const getUserInfo = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try{
      const userId = req.user?._id;
      getUserById(userId, res)
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
)

interface ISocialRequest {
  email: string;
  name: string;
  avatar: string;
}
// social auth
export const socialAuth = CatchAsyncError(
  async(req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, avatar } = req.body as ISocialRequest;
      const user = await userModel.findOne({ email });
      if (!user) {
        const user = await userModel.create({ name, email, avatar });
        sendToken(user, 200, res);
      }
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
});

//update user info

interface IUpdateUserInfo {
  name?: string;
  email?: string;
}

export const updateUserInfo = CatchAsyncError(
  async(req: Request, res: Response,  next: NextFunction) => {
    try {
      const {name, email } = req.body as IUpdateUserInfo;
      // console.log(name);
      const userId = req.user?._id;
      const user = await userModel.findById(userId);
      if (email && user) {
        const isEmailExist = await userModel.findOne({ email });
        if (isEmailExist) {
          return next(new ErrorHandler("Email already exist", 400));
        }
        user.email = email;
      }
      if (name && user) {
        user.name = name;
      }
      await user?.save();
      await redis.set(userId, JSON.stringify(user));
      res.status(200).json({
        success: true,
        user
      })
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// update user password

interface IUpdateUserPasswrd {
  oldPassword: string;
  newPassword: string;
}

export const updateUserPassword = CatchAsyncError(
  async (req : Request, res: Response, next: NextFunction) => {
    try {
      const { oldPassword, newPassword } = req.body as IUpdateUserPasswrd;
      if(!oldPassword || !newPassword) {
        return next(new ErrorHandler("Please provide old and new password", 400));
      }
      const userId = req.user?._id;
      const user = await userModel.findById(userId).select("+password");
      if (user?.password === undefined) {
        return next(new ErrorHandler("invalid user", 400));
      }
      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }
      const isMatch = await user?.comparePassword(oldPassword);
      if (!isMatch) {
        return next(new ErrorHandler("Old password is incorrect", 400));
      }
      user.password = newPassword;
      await user.save();
      await redis.set(userId, JSON.stringify(user));
      // sendToken(user, 200, res); i nedd to add this function
      res.status(200).json({
        success: true,
        user
      })
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
); 

// update user avatar
interface IUpdateUserAvatar {
  avatar: string;
}
export const updateUserAvatar = CatchAsyncError(
  async (req : Request, res: Response, next: NextFunction) => {
    try {
      const { avatar } = req.body as IUpdateUserAvatar;
      const userId = req.user?._id;
      const user = await userModel.findById(userId);
      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }
      if (avatar && user) {
        // if there is an avatar
        if(user?.avatar?.public_id) {
          //delete the old avatar 
          await cloudinary.v2.uploader.destroy(user?.avatar?.public_id);
          // create new one 
          const myCloud = await cloudinary.v2.uploader.upload(avatar, {
            folder: "avatars",
            width: 150,
          });
          user.avatar = {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
          };
        } else {
          const myCloud = await cloudinary.v2.uploader.upload(avatar, {
            folder: "avatars",
            width: 150,
          });
          user.avatar = {
            public_id: myCloud.public_id,
            url: myCloud.secure_url,
          };
          
        }
      }
      
      await user.save();
      await redis.set(userId, JSON.stringify(user));
      res.status(200).json({
        success: true,
        message: "Avatar updated successfully",
      })
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

// get all user ---only for admin

export const getAllUsers = CatchAsyncError( async(req: Request, res: Response, next: NextFunction) => {
  try {
    getAllUsersService(res);
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 400));
  }
})

// update user role --- only for admin

export const updateUserRole = CatchAsyncError( async(req: Request, res: Response, next: NextFunction) => {
  try {
    const {id, role} = req.body;
    updateUserRoleService(id, role, res);
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 400));
  }
});

// delete user --- only for admin

export const deleteUser = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try{
      const userId = req.params.id;
      const user = await userModel.findById(userId);
      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }
      await user.deleteOne({userId});
      await redis.del(userId);

      res.status(200).json({
        success: true,
        message: "User deleted successfully",
      });

    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  }     
)
