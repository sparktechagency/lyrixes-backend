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

const getDriverDetails =catchAsync(async(req ,res)=>{
    const driverId = req.params.driverId;
    const result = await AnalyticsServices.getDriverDetailsService(driverId);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Driver details fetched successfully",
        data: result,
    });
});

const getAllDriversDetails =catchAsync(async(req ,res)=>{
    const result = await AnalyticsServices.getAllDriversDetailsService(req.query);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Driver details fetched successfully",
        data: result.data,
        meta: result.meta,
    });
});

const getCustomerDetails =catchAsync(async(req ,res)=>{
    const customerId = req.params.customerId;
    const result = await AnalyticsServices.getCustomerDetailsService(customerId);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Customer details fetched successfully",
        data: result,
    });
});

const getAllCustomersDetails =catchAsync(async(req ,res)=>{
    const result = await AnalyticsServices.getAllCustomersDetailsService(req.query);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Customer details fetched successfully",
        data: result.data,
        meta: result.meta,
    });
});


const getDeliveryDetails =catchAsync(async(req ,res)=>{
    const deliveryId = req.params.deliveryId;
    const result = await AnalyticsServices.getDeliveryDetailsService(deliveryId);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Delivery details fetched successfully",
        data: result,
    });
});

const getAllDeliveriesDetails =catchAsync(async(req ,res)=>{
    const result = await AnalyticsServices.getAllDeliveriesDetailsService(req.query);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Delivery details fetched successfully",
        data: result.data,
        meta: result.meta,
    });
});

const getDeliveryStats =catchAsync(async(req ,res)=>{
    const result = await AnalyticsServices.getDeliveryStatsService();
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Delivery stats fetched successfully",
        data: result,
    });
});

const getTransactionDetails =catchAsync(async(req ,res)=>{
    const transactionId = req.params.transactionId;
    const result = await AnalyticsServices.getTransactionDetailsService(transactionId);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Transaction details fetched successfully",
        data: result,
    });
});

const getAllTransactionsDetails =catchAsync(async(req ,res)=>{
    const result = await AnalyticsServices.getAllTransactionsDetailsService(req.query);
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Transaction details fetched successfully",
        data: result.data,
        meta: result.meta,
    });
});

const getTransactionStats =catchAsync(async(req ,res)=>{
    const result = await AnalyticsServices.getTransactionStatsService();
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Transaction stats fetched successfully",
        data: result,
    });
});

const getDashboardStats =catchAsync(async(req ,res)=>{
    const result = await AnalyticsServices.getDashboardStatsService();
    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Dashboard stats fetched successfully",
        data: result,
    });
});



export const AnalyticsControllers={
    getAnalytics,
    getDriverDetails,
    getAllDriversDetails,
    getCustomerDetails,
    getAllCustomersDetails,
    getDeliveryDetails,
    getAllDeliveriesDetails,
    getDeliveryStats,
    getTransactionDetails,
    getAllTransactionsDetails,
    getTransactionStats,
    getDashboardStats,
}