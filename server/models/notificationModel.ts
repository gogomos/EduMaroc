import e from "express";
import mongoose, { Schema, Document, Model } from "mongoose";
import { title } from 'process';

interface INotification extends Document {
    userId: string;
    title : string;
    message: string;
    status: string;
    createdAt: Date;
}

const notificationSchema = new Schema<INotification>({
    userId: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    message: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        required: true,
        default: "unread",
    },
}, {
    timestamps: true,
});

const NotificationModel: Model<INotification> = mongoose.model<INotification>("Notification", notificationSchema);

export default NotificationModel;