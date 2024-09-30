import { NextFunction, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import OrderModel from "../models/orderModel";

//create new order

export const newOrder =  CatchAsyncError (
    async ( order: any,res: Response, next: NextFunction) => {
        const newOrder = await OrderModel.create(order);
        res.status(201).json({
            success: true,
            newOrder
        })
        // return newOrder;
    }
);

export const getAllOrdersService = async (res: Response) => {
    const orders = await OrderModel.find().sort({createdAt: -1});
    res.status(201).json({
        success: true,
        orders
    })
 }  