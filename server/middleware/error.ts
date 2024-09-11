import ErrorHandler from '../utils/ErrorHandler';
import { NextFunction , Request , Response } from 'express';

export const ErrorMiddleware = (err: any, req: Request, res: Response, next: NextFunction) => {
    err.statusCode = err.statusCode || 500;
    err.message = err.message || "Internal Server Error";

    //wrong mongoDb error
    if(err.name === "CastError"){
        const message = `Resource not found. Invalid: ${err.path}`;
        err = new ErrorHandler(message, 400);
    }

    // duplicate key error 
    if (err.code === 11000) {
        const message = `Duplicate ${Object.keys(err.keyValue)} entered`;
        err = new ErrorHandler(message, 400);

    }

    //jwt error
    if(err.name === "JsonWebTokenError"){
        const message = `Json Web Token is invalid, Try again`;
        err = new ErrorHandler(message, 400);
    }
    if (!res.headersSent) {
        res.status(err.statusCode).json({
          success: false,
          message: err.message
        });
      } else {
        next(err); // Pass the error to the next middleware function
      }
}


