import express, { Application, Request, Response } from "express";
import cors from "cors";
import path from "path";
import { StatusCodes } from "http-status-codes";

import { Morgan } from "./shared/morgan";
import globalErrorHandler from "./app/middlewares/globalErrorHandler";
import { PaymentController } from "./app/modules/payment/payment.controller";
import router from "./app/routes";

const app: Application = express();

/**
 * =========================
 * Stripe Webhook (RAW BODY)
 * =========================
 * Must be BEFORE express.json()
 */
// app.post(
//   "/api/v1/payments/webhook/stripe",
//   express.raw({ type: "application/json" }),
//   PaymentController.stripeWebhook,
// );
// Stripe webhook (must be RAW body)
// Stripe webhook must use raw body
app.post(
  "/api/v1/payments/stripe/webhook",
  express.raw({ type: "application/json" }),
  PaymentController.stripeWebhook,
);


/**
 * =========================
 * CORS (GLOBAL)
 * =========================
 */
app.use(
  cors({
    origin: [
      "http://dashboard.adrienticket.com",
      "http://72.62.190.141:4173",
      "http://adrienticket.com",
      "http://72.62.190.141:3000",
      "http://10.10.7.49:3000",
      "http://10.10.7.49:5173",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-auth-token"],
  }),
);

/**
 * =========================
 * View Engine
 * =========================
 */
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/**
 * =========================
 * Logger
 * =========================
 */
app.use(Morgan.successHandler);
app.use(Morgan.errorHandler);

/**
 * =========================
 * Body Parsers
 * =========================
 * multipart/form-data handled by multer (NOT here)
 */
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

/**
 * =========================
 * Static Files
 * =========================
 * uploads/image
 * uploads/thumbnail
 * uploads/seatingView
 * etc.
 */
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

/**
 * =========================
 * API Routes
 * =========================
 */
app.use("/api/v1", router);

/**
 * =========================
 * Health Check
 * =========================
 */
app.get("/", (req: Request, res: Response) => {
  res.send("Server is running...");
});

/**
 * =========================
 * Global Error Handler
 * =========================
 */
app.use(globalErrorHandler);

/**
 * =========================
 * Not Found Handler
 * =========================
 */
app.use((req: Request, res: Response) => {
  res.status(StatusCodes.NOT_FOUND).json({
    success: false,
    message: "Not Found",
    errorMessages: [
      {
        path: req.originalUrl,
        message: "API DOESN'T EXIST",
      },
    ],
  });
});

export default app;

// import express, { Application, Request, Response } from "express";
// import cors from "cors";
// import { StatusCodes } from "http-status-codes";
// import { Morgan } from "./shared/morgan";
// import globalErrorHandler from "./app/middlewares/globalErrorHandler";
// import path from "path";
// import { PaymentController } from "./app/modules/payment/payment.controller";
// import { globalRateLimiter } from "./app/middlewares/rateLimiter";
// import router from "./app/routes";

// const app: Application = express();

// app.post(
//   "/api/v1/payments/webhook/stripe",
//   express.raw({ type: "application/json" }),
//   PaymentController.stripeWebhook,
// );

// // ====================

// app.use(
//   cors({
//     origin: [
//       "http://dashboard.adrienticket.com",
//       "http://adrienticket.com",
//     ],
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization", "x-auth-token"],
//   }),
// );
// // ====================

// app.set("view engine", "ejs");
// app.set("views", path.join(__dirname, "views"));

// // morgan
// app.use(Morgan.successHandler);
// app.use(Morgan.errorHandler);

// //body parser
// // app.use(
// //   cors({
// //     origin: [
// //       "http://10.10.7.46:3001",
// //       "http://10.10.7.49:3000",
// //       "http://72.62.190.141:3000",
// //       "http://adrienticket.com",
// //       "http://72.62.190.141:4173",
// //       "http://dashboard.adrienticket.com",
// //       // "http://10.10.7.41:5003",
// //       // "http://10.10.7.49:1001",
// //       // "http://10.10.7.6:1001",
// //       // "https://admin-ticket-booking.netlify.app",

// //       // "https://ticket-booking-dashboard-ad.vercel.app",
// //       // "https://adrien-ticket-booking-website.vercel.app",
// //     ],
// //     credentials: true,
// //     allowedHeaders: ["Content-Type", "Authorization", "x-auth-token"], // Make sure necessary headers are allowed
// //     exposedHeaders: ["x-auth-token"],
// //   }),
// // );

// // app.use(express.json({ limit: "1mb" }));

// // // app.use(express.urlencoded({ extended: true }));

// // app.use(express.urlencoded({ extended: true, limit: "1mb" }));
// app.use(express.json({ limit: "50mb" }));
// app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// //file retrieve
// app.use(express.static("uploads"));
// // ✅ Serve thumbnails
// app.use("/thumbnail", express.static(path.join(__dirname, "../thumbnail")));

// // ✅ Serve seatingView images
// app.use("/seatingView", express.static(path.join(__dirname, "../seatingView")));

// //router
// app.use("/api/v1", router);

// app.get("/", (req: Request, res: Response) => {
//   res.send("Server is running...");
// });

// //global error handle
// app.use(globalErrorHandler);

// // handle not found route
// app.use((req: Request, res: Response) => {
//   res.status(StatusCodes.NOT_FOUND).json({
//     success: false,
//     message: "Not Found",
//     errorMessages: [
//       {
//         path: req.originalUrl,
//         message: "API DOESN'T EXIST",
//       },
//     ],
//   });
// });

// export default app;
