import express from "express";
import { getNotifications, updateNotification } from "../controllers/notification.controller";
import { isAuthenticated, authorizeRoles } from "../middleware/auth";

const notificationRouter = express.Router();

notificationRouter.get(
  "/get-notifications",
  isAuthenticated,
  authorizeRoles("admin"),
  getNotifications
);
notificationRouter.put(
  "/update-notification-status/:id",
  isAuthenticated,
  authorizeRoles("admin"),
  updateNotification
);


export default notificationRouter;
