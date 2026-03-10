import { Request, Response } from "express";
import { JwtPayload } from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { MessageService } from "./message.service";

const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const result = await MessageService.sendMessageToDB(
    req.user as JwtPayload,
    req.body,
  );

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Message sent successfully",
    data: result,
  });
});

const getMessages = catchAsync(async (req: Request, res: Response) => {
  const result = await MessageService.getMessagesFromDB(
    req.user as JwtPayload,
    req.params.deliveryId,
    req.query,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Messages retrieved successfully",
    data: result,
  });
});

const markMessagesAsRead = catchAsync(async (req: Request, res: Response) => {
  const result = await MessageService.markMessagesAsReadToDB(
    req.user as JwtPayload,
    req.params.deliveryId,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Messages marked as read successfully",
    data: result,
  });
});

export const MessageController = {
  sendMessage,
  getMessages,
  markMessagesAsRead,
};