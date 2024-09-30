import { Request, Response, NextFunction } from "express";
import OrderModel , { IOrder } from "../models/orderModel";
import CourseModel from "../models/course.model";
import userModel from "../models/user.model";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import path from "path";
import sendMail from "../utils/sendMail";
import ejs from "ejs";
import { getAllOrdersService, newOrder } from "../services/order.service";
import { privateDecrypt } from "crypto";
import NotificationModel from "../models/notificationModel";


//create order
export const createOrder = CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { courseId, payment_info } = req.body as IOrder;
            const user = await userModel.findById(req.user?._id);
            
            const userExistInUser = user?.courses.some(
                (course: any) => course._id.toString() === courseId
            )
            // console.log(userExistInUser)
            if (userExistInUser) {
                return next(
                    new ErrorHandler("You are already enrolled in this course", 400)
                );
            }
            const course = await CourseModel.findById(courseId);
            if (!course) {
                return next(new ErrorHandler("Course not found", 404));
            }
            // console.log("==============================================================1")
            // console.log(course);
            const data: any = {
                courseId: course._id,
                userId: user?._id,
                payment_info: payment_info,
            };
            newOrder(data, res, next);
            const mailData = {
                order: {
                    _id: course.id.slice(0,6),// if i wan t to accsess to id in data base as a string i use .id 
                    name: course.name,
                    price: course.price,
                    date : new Date().toLocaleDateString('en-US',{year: 'numeric', month: 'long', day: 'numeric'}),
                }
            }
            // console.log(mailData)
            const html = await ejs.renderFile(
                path.join(__dirname, "../mails/order-confirmation.ejs"),
                mailData
            )
            try {
                if (user) {
                    await sendMail({
                        email: user.email,
                        subject: "Order Confirmation",
                        template: "order-confirmation",
                        data: mailData,
                    })
                }
            } catch (error: any) {
                console.log(error)
                return next(new ErrorHandler(error.message, 500));
            }

            //didn t understad this 
            user?.courses.push(course?.id)
            await user?.save();
            await NotificationModel.create({
                userId: user?._id,
                title: "new-order",
                message: `You have successfully enrolled in ${course?.name}`,
            });
            // course.purchased ? course.purchased += 1 : course.purchased;
            if (course.purchased || course.purchased === 0) {
                course.purchased += 1
            }else {
                course.purchased = 0;
            }
            await course.save();
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 500));
        }
    });


    // get all orders ---only for admin

export const getAllOrders = CatchAsyncError( async(req: Request, res: Response, next: NextFunction) => {
    try {
      getAllOrdersService(res);
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 400));
    }
  })