 
import { Types } from "mongoose";
import { PayoutStatus, Transaction, TransactionStatus } from "../payment/transaction.model";
import QueryBuilder from "../../builder/queryBuilder";

interface GetTransactionsQuery {
  [key: string]: unknown;
  searchTerm?: string;
  page?: number;
  limit?: number;
  sort?: string;
  fields?: string;
  status?: string;
}

const getDriverTransactionsFromDB = async (
  driverId: string,
  query: Record<string, unknown>
) => {
  const baseQuery = Transaction.find({ driverId })
    .populate("deliveryId")
    .populate("customerId", "name email phone profileImage")
    .populate("driverId", "name email phone profileImage");

  const queryBuilder = new QueryBuilder(baseQuery, query)
    .filter()
    .sort()
    .paginate()
    .fields();

  const meta = await queryBuilder.countTotal();
  const result = await queryBuilder.modelQuery;

  return {
    meta,
    data: result,
  };
};

const getAllTransactions = async (query: GetTransactionsQuery) => {
  const baseQuery = Transaction.find().populate("orderId").populate({
    path: "orderId",
    populate: { path: "eventId userId ticketCategoryId" },
  });

    ;
  const qb = new QueryBuilder(baseQuery, query);

  qb.search(["_id", "orderId", "method", "status", "stripePaymentIntentId"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const transactions = await qb.modelQuery;
  const meta = await qb.countTotal();

  return { transactions, meta };
};

const getTransactionById = async (id: string) => {
  if (!Types.ObjectId.isValid(id)) throw new Error("Invalid Transaction ID");
  const transaction = await Transaction.findById(id);
  if (!transaction) throw new Error("Transaction not found");
  return transaction;
};

const updateTransaction = async (id: string, payload: Partial<typeof Transaction>) => {
  if (!Types.ObjectId.isValid(id)) throw new Error("Invalid Transaction ID");
  const transaction = await Transaction.findByIdAndUpdate(id, payload, {
    new: true,
  });
  if (!transaction) throw new Error("Transaction not found");
  return transaction;
};

const deleteTransaction = async (id: string) => {
  if (!Types.ObjectId.isValid(id)) throw new Error("Invalid Transaction ID");
  const transaction = await Transaction.findByIdAndDelete(id);
  if (!transaction) throw new Error("Transaction not found");
  return transaction;
};

// ========== Get platform monthly revenue ==========
const getPlatformMonthlyRevenue = async (year?: number) => {
  const targetYear = year ?? new Date().getFullYear();

  const startOfYear = new Date(targetYear, 0, 1);           // 1 Jan, targetYear
  const endOfYear = new Date(targetYear + 1, 0, 1);         // 1 Jan, next year

  const revenueData = await Transaction.aggregate([
    {
      $match: {
        status: TransactionStatus.SUCCEEDED,           // customer paid
        payoutStatus: PayoutStatus.SUCCEEDED,          // host ke payout kora hoyeche 
        commissionAmount: { $gt: 0 },                  // commission ache
        updatedAt: { $gte: startOfYear, $lt: endOfYear }, // payout howar month 
      },
    },
    {
      $group: {
        _id: { $month: "$updatedAt" },                 // payout month
        revenue: { $sum: "$commissionAmount" },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  // 12 months er full array banao (jate 0% month o dekha jay)
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const monthlyRevenue = months.map((monthName, index) => {
    const monthNumber = index + 1;
    const data = revenueData.find(item => item._id === monthNumber);
    return {
      month: monthNumber,
      monthName,
      revenue: data ? Math.round(data.revenue) : 0,
    };
  });

  const totalRevenue = monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0);

  return {
    year: targetYear,
    totalRevenue,
    monthly: monthlyRevenue,
  };
};


export const TransactionService = {
  getDriverTransactionsFromDB,
  getAllTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  getPlatformMonthlyRevenue,
};
