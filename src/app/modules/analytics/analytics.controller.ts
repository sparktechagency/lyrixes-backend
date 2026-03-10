import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { AnalyticsServices } from "./analytics.service";

const getAnalytics =catchAsync(async(req ,res)=>{
    const result = await AnalyticsServices.getUserStats();
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "User stats fetched successfully",
        data: result,
    });
});

export const AnalyticsControllers={
    getAnalytics,
}