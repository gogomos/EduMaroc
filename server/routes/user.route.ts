// user route

import express from "express";
// import { registrationUser } from "../controllers/user.controller";
import {getUserInfo, registrationUser, socialAuth, updateAccessToken, updateUserInfo} from '../controllers/user.controller';
import {activateUser} from '../controllers/user.controller';
import {loginUser} from '../controllers/user.controller';
import {logoutUser} from '../controllers/user.controller';
import { isAuthenticated } from "../middleware/auth";
const userRouter = express.Router();


userRouter.post('/registration', registrationUser);
userRouter.post('/activate-user', activateUser);
userRouter.post('/login', loginUser);
userRouter.get('/logout', isAuthenticated, logoutUser);
userRouter.get('/refresh', updateAccessToken);
userRouter.get('/me', isAuthenticated, getUserInfo);
userRouter.post("/social-auth", socialAuth);
userRouter.put("/update-user-info", isAuthenticated, updateUserInfo);


export default userRouter;