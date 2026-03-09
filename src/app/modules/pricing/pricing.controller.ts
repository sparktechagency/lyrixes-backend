import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { JwtPayload } from "jsonwebtoken";
import * as PricingService from "./pricing.service";

export const PricingController = {
  estimate: catchAsync(async (req, res) => {
    const result = await PricingService.calculateEstimateToDB(req.body);
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: "Pricing estimate",
      data: result,
    });
  }),

  getConfig: catchAsync(async (_req, res) => {
    const result = await PricingService.getPricingConfigToDB();
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: "Pricing config",
      data: result,
    });
  }),

  upsertConfig: catchAsync(async (req, res) => {
    const result = await PricingService.upsertPricingConfigToDB(
      (req.user as JwtPayload).id,
      req.body,
    );
    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: "Pricing config updated",
      data: result,
    });
  }),
};