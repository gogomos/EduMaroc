// user route

import express from "express";
// import { registrationUser } from "../controllers/user.controller";
import {registrationUser} from '../controllers/user.controller';
import {activateUser} from '../controllers/user.controller';
const userRouter = express.Router();


userRouter.post('/registration', registrationUser);
userRouter.post('/activate-user', activateUser);

export default userRouter;