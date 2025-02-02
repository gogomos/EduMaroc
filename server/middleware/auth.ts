import { Request , Response, NextFunction} from 'express';
import { CatchAsyncError } from './catchAsyncErrors';
import ErrorHandler from '../utils/ErrorHandler';
require('dotenv').config();
import  jwt, { JwtPayload } from 'jsonwebtoken';
import { redis } from '../utils/redis';

// check if user is authenticated 
export const isAuthenticated = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    const access_token = await req.cookies.access_token as string;
    // console.log(access_token);

    if(!access_token){
        return next(new ErrorHandler("Please login to access this resource", 401));
    }
    const decoded = jwt.verify(access_token, process.env.ACCESS_TOKEN as string) as JwtPayload;
    if (!decoded) {
        return next(new ErrorHandler("access token is not valid", 400))
    }
    // if didn t work check _id
    const user = await redis.get(decoded.id);
    if (!user) {
        return next(new ErrorHandler("access token is not valid", 400))
    }

    req.user = JSON.parse(user);
    next();
});

//validate user role
export const authorizeRoles = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!roles.includes(req.user.role)) {
            return next(new ErrorHandler(`${req.user.role} is not allowed to access this resource`, 403));
        }
        next();
    }
}