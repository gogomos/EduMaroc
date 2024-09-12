// user route

import express from "express";
// import { registrationUser } from "../controllers/user.controller";
import {registrationUser} from '../controllers/user.controller';
import {activateUser} from '../controllers/user.controller';
import {loginUser} from '../controllers/user.controller';
import {logoutUser} from '../controllers/user.controller';
const userRouter = express.Router();


userRouter.post('/registration', registrationUser);
userRouter.post('/activate-user', activateUser);
userRouter.post('/login', loginUser);
userRouter.post('/logout', logoutUser);

export default userRouter;