// user route

import express from "express";
// import { registrationUser } from "../controllers/user.controller";
import {deleteUser, getAllUsers, getUserInfo, registrationUser, socialAuth, updateAccessToken, updateUserAvatar, updateUserInfo, updateUserPassword, updateUserRole} from '../controllers/user.controller';
import {activateUser} from '../controllers/user.controller';
import {loginUser} from '../controllers/user.controller';
import {logoutUser} from '../controllers/user.controller';
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
const userRouter = express.Router();


userRouter.post('/registration', registrationUser);
userRouter.post('/activate-user', activateUser);
userRouter.post('/login', loginUser);
userRouter.get('/logout', isAuthenticated, logoutUser);
userRouter.get('/refresh', updateAccessToken);
userRouter.get('/me', isAuthenticated, getUserInfo);
userRouter.post("/social-auth", socialAuth);

userRouter.put("/update-user-info", isAuthenticated, updateUserInfo);
userRouter.put("/update-user-password", isAuthenticated, updateUserPassword);
userRouter.put("/update-user-avatar", isAuthenticated, updateUserAvatar);
userRouter.get("/get-users", isAuthenticated,authorizeRoles("admin"), getAllUsers);
userRouter.put("/update-user-role", isAuthenticated,authorizeRoles("admin"), updateUserRole);
userRouter.delete("/delete-user", isAuthenticated,authorizeRoles("admin"), deleteUser);


export default userRouter;