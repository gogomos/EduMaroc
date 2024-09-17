require("dotenv").config;
import { Response } from "express";
import { IUser } from "../models/user.model";
import { redis } from "./redis";

interface ITokenOptions {
  exprires: Date;
  maxAge: number;
  httpOnly: boolean;
  sameSite: "lax" | "strict" | "none" | undefined;
  secure?: boolean;
}

//parse environment variables to integrate with callbacl value
const accessTokenExpire = parseInt(
  process.env.ACCESS_TOKEN_EXPIRE || "300",
  10
);
const refreshTokenExpire = parseInt(
  process.env.REFRESH_TOKEN_EXPIRE || "1200",
  10
);

export const accessTokenOptions: ITokenOptions = {
  exprires: new Date(Date.now() + accessTokenExpire * 1000 * 60 * 60),
  maxAge: accessTokenExpire * 1000 * 60 * 60,
  httpOnly: true,
  sameSite: "lax",
};

export const refreshTokenOptions: ITokenOptions = {
  exprires: new Date(Date.now() + refreshTokenExpire * 1000 * 60 * 60 * 24),
  maxAge: refreshTokenExpire * 1000 *24 * 60 *60,
  httpOnly: true, // Can't be accessed by JavaScript, improving security.
  sameSite: "lax", // Helps mitigate CSRF (Cross-Site Request Forgery) attacks.
};

export const sendToken = (user: IUser, statusCode: number, res: Response) => {
  const accessToken = user.SignAccessToken();
  const refreshToken = user.SignRefreshToken();

  //upload refresh token to redis
  redis.set(user.id, JSON.stringify(user) as any);

  //only set secure to true in production
  if (process.env.NODE_ENV === "production") {
    accessTokenOptions.secure = true; //Only sent over HTTPS connections.
  }
  res.cookie("access_token", accessToken, accessTokenOptions);
  res.cookie("refresh_token", refreshToken, refreshTokenOptions);
  res.status(statusCode).json({
    success: true,
    message: "Logged in successfully",
    user,
  });
};
