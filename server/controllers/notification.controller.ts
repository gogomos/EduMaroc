import { Request, Response, NextFunction } from "express";
import OrderModel , { IOrder } from "../models/orderModel";
import CourseModel from "../models/course.model";
import userModel from "../models/user.model";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import path from "path";
import sendMail from "../utils/sendMail";
import ejs from "ejs";
import { newOrder } from "../services/order.service";
import { privateDecrypt } from "crypto";
import NotificationModel from "../models/notificationModel";
import cron from "node-cron";


// get all notification only for admin

export const getNotifications = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const notifications = await NotificationModel.find().sort({createdAt: -1});
            res.status(200).json({
                success: true,
                notifications,
            });
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
});

// update notification status 

export const updateNotification = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const {id} = req.params;
            const notification = await NotificationModel.findById(id);
            if (!notification) {
                return next(new ErrorHandler("Notification not found", 404));
            }
            notification.status = "read";
            await notification.save();
            const notifications = await NotificationModel.find().sort({createdAt: -1});
            //i sent al nofification to help the client side to sort them
            res.status(200).json({
                success: true,
                notifications,
            });
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
});

// delete notification --- only admin
cron.schedule("0 0 * * *", async () => {
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = new Date(Date.now() - thirtyDays);
    await NotificationModel.deleteMany({
        status: "read",
        createdAt: { $lt: thirtyDaysAgo },
    });
})