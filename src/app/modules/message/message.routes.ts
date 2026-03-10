import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { USER_ROLES } from "../../../enums/user";
import { MessageController } from "./message.controller";
import { MessageValidation } from "./message.validation";

const router = express.Router();

router.post(
  "/",
  auth(USER_ROLES.CUSTOMER, USER_ROLES.DRIVER),
  validateRequest(MessageValidation.sendMessage),
  MessageController.sendMessage,
);

router.get(
  "/:deliveryId",
  auth(USER_ROLES.CUSTOMER, USER_ROLES.DRIVER),
  validateRequest(MessageValidation.getMessages),
  MessageController.getMessages,
);

router.patch(
  "/:deliveryId/read",
  auth(USER_ROLES.CUSTOMER, USER_ROLES.DRIVER),
  validateRequest(MessageValidation.markAsRead),
  MessageController.markMessagesAsRead,
);

export const MessageRoutes = router;