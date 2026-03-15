import express, { NextFunction, Request, Response } from "express";
import { USER_ROLES } from "../../../enums/user";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { AuthController } from "./auth.controller";
import { AuthValidation } from "./auth.validation";
const router = express.Router();




router.post("/google", AuthController.googleLogin);

router.post(
  "/login",
  validateRequest(AuthValidation.createLoginZodSchema),
  AuthController.loginUser,
);

router.post(
  "/forget-password",
  validateRequest(AuthValidation.createForgetPasswordZodSchema),
  AuthController.forgetPassword,
);

router.post("/refresh-token", AuthController.newAccessToken);

router.post("/resend-otp", AuthController.resendVerificationEmail);

router.post(
  "/verify-email",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, oneTimeCode } = req.body;

      req.body = { email, oneTimeCode: Number(oneTimeCode) };
      next();
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Failed to convert string to number" });
    }
  },
  validateRequest(AuthValidation.createVerifyEmailZodSchema),
  AuthController.verifyEmail,
);

router.post(
  "/verify-phone",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { phone, code, countryCode } = req.body;

      if (!code) {
        return res.status(400).json({ message: "OTP code is required" });
      }

      req.body = { phone, code: Number(code), countryCode }; 
      next();
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Failed to convert OTP to number" });
    }
  },
  validateRequest(AuthValidation.createVerifyPhoneZodSchema),
  AuthController.verifyPhone,
);

router.post(
  "/reset-password",
  auth(USER_ROLES.ADMIN, USER_ROLES.CUSTOMER),
  validateRequest(AuthValidation.createResetPasswordZodSchema),
  AuthController.resetPassword,
);


router.post(
  "/change-password",
  auth(USER_ROLES.ADMIN, USER_ROLES.CUSTOMER,USER_ROLES.SUPER_ADMIN),
  validateRequest(AuthValidation.createChangePasswordZodSchema),
  AuthController.changePassword,
);
 
// router.delete(
//   "/delete-account",
//   auth(USER_ROLES.ADMIN),
//   AuthController.deleteUser,
// );

export const AuthRoutes = router;
