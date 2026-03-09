import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { TransactionService } from "./transaction.service";
 

const getDriverTransactions = catchAsync(async (req: Request, res: Response) => {
  const driverId = req.user.id;
  console.log("Driver ID from token:", driverId);

  const result = await TransactionService.getDriverTransactionsFromDB(
    driverId,
    req.query
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Driver transaction history retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getAllTransactions = catchAsync(async (req: Request, res: Response) => {
  const result = await TransactionService.getAllTransactions(req.query);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Transactions retrieved successfully",
    data: result.transactions,
    meta: result.meta,
  });
});

const getTransactionById = catchAsync(async (req: Request, res: Response) => {
  const result = await TransactionService.getTransactionById(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Transaction retrieved successfully",
    data: result,
  });
});

const updateTransaction = catchAsync(async (req: Request, res: Response) => {
  const result = await TransactionService.updateTransaction(req.params.id, req.body);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Transaction updated successfully",
    data: result,
  });
});

const deleteTransaction = catchAsync(async (req: Request, res: Response) => {
  const result = await TransactionService.deleteTransaction(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Transaction deleted successfully",
    data: result,
  });
});

// ========== Get platform monthly revenue ==========
const getPlatformRevenue = catchAsync(async (req: Request, res: Response) => {
  const year = req.query.year ? Number(req.query.year) : undefined;

  if (year && (isNaN(year) || year < 2010 || year > 2100)) {
    return sendResponse(res, {
      statusCode: 400,
      success: false,
      message: "Invalid year",
    });
  }

  const result = await TransactionService.getPlatformMonthlyRevenue(year);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Platform revenue retrieved successfully",
    data: result,
  });
});
export const TransactionController = {
  getDriverTransactions,
  getAllTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  getPlatformRevenue,
};
