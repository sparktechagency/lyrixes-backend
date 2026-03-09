import express from "express";
import { TransactionController } from "./transaction.controller";
import { USER_ROLES } from "../../../enums/user";
import auth from "../../middlewares/auth";
 

const router = express.Router();


router.get(
  "/driver-transactions",
  auth(USER_ROLES.DRIVER),
  TransactionController.getDriverTransactions
);


// Admin + SuperAdmin routes
router.get(
  "/",
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
  TransactionController.getAllTransactions
);

router.get(
  "/platform-revenue",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  TransactionController.getPlatformRevenue  // ei controller ta thakte hobe
);

router.get(
  "/:id",
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
  TransactionController.getTransactionById
);

router.patch(
  "/:id",
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
  TransactionController.updateTransaction
);

router.delete(
  "/:id",
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
  TransactionController.deleteTransaction
);

// transaction.routes.ts

export const transactionRoutes = router;

