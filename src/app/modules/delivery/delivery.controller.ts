import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { JwtPayload } from "jsonwebtoken";
import * as DeliveryService from "./delivery.service";

export const DeliveryController = {
  create: catchAsync(async (req, res) => {
    const result = await DeliveryService.createDeliveryToDB(req.user as JwtPayload, req.body);
    sendResponse(res, { success: true, statusCode: StatusCodes.OK, message: "Delivery created", data: result });
  }),

  cancelDelivery: catchAsync(async (req, res) => {
  const result = await DeliveryService.cancelDeliveryToDB(
    req.user as JwtPayload,
    req.params.id,
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Delivery cancelled successfully",
    data: result,
  });
}),

changeDeliveryInfo: catchAsync(async (req, res) => {
  const result = await DeliveryService.changeDeliveryInfoToDB(
    req.user as JwtPayload,
    req.params.id,
    req.body,
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Delivery information updated successfully",
    data: result,
  });
}),

  matches: catchAsync(async (req, res) => {
    const result = await DeliveryService.getDriverMatchesToDB(req.user as JwtPayload, req.params.id, req.query);
    sendResponse(res, { success: true, statusCode: StatusCodes.OK, message: "Driver matches", data: result });
  }),

  // ✅ NEW: driver accept OPEN delivery
  driverAcceptOpen: catchAsync(async (req, res) => {
    const result = await DeliveryService.driverAcceptOpenDeliveryToDB(req.user as JwtPayload, req.params.id);
    sendResponse(res, { success: true, statusCode: StatusCodes.OK, message: "Accepted", data: result });
  }),

  // ✅ NEW: customer finding list
  findingCouriers: catchAsync(async (req, res) => {
    const result = await DeliveryService.getFindingCouriersToDB(req.user as JwtPayload, req.params.id);
    sendResponse(res, { success: true, statusCode: StatusCodes.OK, message: "Finding couriers data", data: result });
  }),

  // ✅ NEW: customer select driver
  selectDriver: catchAsync(async (req, res) => {
    const result = await DeliveryService.customerSelectDriverToDB(
      req.user as JwtPayload,
      req.params.id,
      req.body.driverId,
    );
    sendResponse(res, { success: true, statusCode: StatusCodes.OK, message: "Driver selected", data: result });
  }),

  // ✅ NEW: customer reply bid
  replyBid: catchAsync(async (req, res) => {
    const result = await DeliveryService.customerReplyBidToDB(
      req.user as JwtPayload,
      req.params.id,
      req.body.driverId,
      req.body.customerCounterFare,
    );
    sendResponse(res, { success: true, statusCode: StatusCodes.OK, message: "Counter offer sent", data: result });
  }),

  // existing
  driverBid: catchAsync(async (req, res) => {
    const result = await DeliveryService.driverBidToDB(req.user as JwtPayload, req.body);
    sendResponse(res, { success: true, statusCode: StatusCodes.OK, message: "Bid sent", data: result });
  }),

  offers: catchAsync(async (req, res) => {
    const result = await DeliveryService.listOffersToDB(req.user as JwtPayload, req.params.id);
    sendResponse(res, { success: true, statusCode: StatusCodes.OK, message: "Offers list", data: result });
  }),

  bookNow: catchAsync(async (req, res) => {
    const result = await DeliveryService.bookNowToDB(req.user as JwtPayload, req.body.deliveryId);
    sendResponse(res, { success: true, statusCode: StatusCodes.OK, message: "Payment initiated", data: result });
  }),

  startJourney: catchAsync(async (req, res) => {
    const result = await DeliveryService.driverStartJourneyToDB(req.user as JwtPayload, req.params.id);
    sendResponse(res, { success: true, statusCode: StatusCodes.OK, message: "Journey started", data: result });
  }),
    arrivedPickup: catchAsync(async (req, res) => {
    const result = await DeliveryService.driverArrivedPickupToDB(
      req.user as JwtPayload,
      req.params.id,
    );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: "Driver arrived at pickup point",
      data: result,
    });
  }),

  arrivedDropoff: catchAsync(async (req, res) => {
    const result = await DeliveryService.driverArrivedDropoffToDB(
      req.user as JwtPayload,
      req.params.id,
    );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: "Driver arrived at drop-off point",
      data: result,
    });
  }),


  driverDelivered: catchAsync(async (req, res) => {
    const result = await DeliveryService.driverMarkDeliveredToDB(req.user as JwtPayload, req.params.id);
    sendResponse(res, { success: true, statusCode: StatusCodes.OK, message: "Delivered by driver", data: result });
  }),

  customerConfirm: catchAsync(async (req, res) => {
    const result = await DeliveryService.customerConfirmDeliveredToDB(req.user as JwtPayload, req.params.id);
    sendResponse(res, { success: true, statusCode: StatusCodes.OK, message: "Delivery confirmed", data: result });
  }),

  rateDelivery: catchAsync(async (req, res) => {
    const result = await DeliveryService.rateDeliveryToDB(
      req.user as JwtPayload,
      req.params.id,
      req.body,
    );
    sendResponse(res, { success: true, statusCode: StatusCodes.OK, message: "Rated successfully", data: result });
  }),


  myDeliveries: catchAsync(async (req, res) => {
    const result = await DeliveryService.getMyDeliveriesToDB(req.user as JwtPayload, req.query);
    sendResponse(res, { success: true, statusCode: StatusCodes.OK, message: "My deliveries", data: result });
  }),

    driverMyDeliveries: catchAsync(async (req, res) => {
    const result = await DeliveryService.getDriverMyDeliveriesToDB(req.user as JwtPayload, req.query);
    sendResponse(res, { success: true, statusCode: StatusCodes.OK, message: "Driver deliveries", data: result });
  }),


  driverHome: catchAsync(async (req, res) => {
    const result = await DeliveryService.getDriverHomeToDB(req.user as JwtPayload, req.query);
    sendResponse(res, { success: true, statusCode: StatusCodes.OK, message: "Driver home data", data: result });
  }),

  driverCancelDelivery: catchAsync(async (req, res) => {
  const result = await DeliveryService.driverCancelDeliveryToDB(
    req.user as JwtPayload,
    req.params.id,
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Driver cancelled delivery",
    data: result,
  });
}),
};


// import { StatusCodes } from "http-status-codes";
// import catchAsync from "../../../shared/catchAsync";
// import sendResponse from "../../../shared/sendResponse";
// import { JwtPayload } from "jsonwebtoken";
// import * as DeliveryService from "./delivery.service";

// export const DeliveryController = {
//   create: catchAsync(async (req, res) => {
//     const result = await DeliveryService.createDeliveryToDB(req.user as JwtPayload, req.body);
//     sendResponse(res, { success: true, statusCode: StatusCodes.OK, message: "Delivery created", data: result });
//   }),

//   matches: catchAsync(async (req, res) => {
//     const result = await DeliveryService.getDriverMatchesToDB(
//       req.user as JwtPayload,
//       req.params.id,
//       req.query,
//     );
//     sendResponse(res, { success: true, statusCode: StatusCodes.OK, message: "Driver matches", data: result });
//   }),

//   // requestDriver: catchAsync(async (req, res) => {
//   //   const result = await DeliveryService.requestDriverToDB(
//   //     req.user as JwtPayload,
//   //     req.params.id,
//   //     req.body.driverId,
//   //   );
//   //   sendResponse(res, { success: true, statusCode: StatusCodes.OK, message: "Request sent to driver", data: result });
//   // }),

//   // driverAccept: catchAsync(async (req, res) => {
//   //   const result = await DeliveryService.driverAcceptDeliveryToDB(req.user as JwtPayload, req.body.deliveryId);
//   //   sendResponse(res, { success: true, statusCode: StatusCodes.OK, message: "Driver accepted", data: result });
//   // }),

//   driverBid: catchAsync(async (req, res) => {
//     const result = await DeliveryService.driverBidToDB(req.user as JwtPayload, req.body);
//     sendResponse(res, { success: true, statusCode: StatusCodes.OK, message: "Bid sent", data: result });
//   }),

//   offers: catchAsync(async (req, res) => {
//     const result = await DeliveryService.listOffersToDB(req.user as JwtPayload, req.params.id);
//     sendResponse(res, { success: true, statusCode: StatusCodes.OK, message: "Offers list", data: result });
//   }),

//   acceptOffer: catchAsync(async (req, res) => {
//     const result = await DeliveryService.customerAcceptOfferToDB(
//       req.user as JwtPayload,
//       req.params.id,
//       req.body.offerId,
//     );
//     sendResponse(res, { success: true, statusCode: StatusCodes.OK, message: "Offer accepted", data: result });
//   }),

//   bookNow: catchAsync(async (req, res) => {
//     const result = await DeliveryService.bookNowToDB(req.user as JwtPayload, req.body.deliveryId);
//     sendResponse(res, { success: true, statusCode: StatusCodes.OK, message: "Payment initiated", data: result });
//   }),

//   startJourney: catchAsync(async (req, res) => {
//     const result = await DeliveryService.driverStartJourneyToDB(req.user as JwtPayload, req.params.id);
//     sendResponse(res, { success: true, statusCode: StatusCodes.OK, message: "Journey started", data: result });
//   }),

//   driverDelivered: catchAsync(async (req, res) => {
//     const result = await DeliveryService.driverMarkDeliveredToDB(req.user as JwtPayload, req.params.id);
//     sendResponse(res, { success: true, statusCode: StatusCodes.OK, message: "Delivered by driver", data: result });
//   }),

//   customerConfirm: catchAsync(async (req, res) => {
//     const result = await DeliveryService.customerConfirmDeliveredToDB(req.user as JwtPayload, req.params.id);
//     sendResponse(res, { success: true, statusCode: StatusCodes.OK, message: "Delivery confirmed", data: result });
//   }),

//   myDeliveries: catchAsync(async (req, res) => {
//   const result = await DeliveryService.getMyDeliveriesToDB(req.user as JwtPayload, req.query);
//   sendResponse(res, {
//     success: true,
//     statusCode: StatusCodes.OK,
//     message: "My deliveries",
//     data: result,
//   });
// }),

// driverHome: catchAsync(async (req, res) => {
//   const result = await DeliveryService.getDriverHomeToDB(
//     req.user as JwtPayload,
//     req.query,
//   );

//   sendResponse(res, {
//     success: true,
//     statusCode: StatusCodes.OK,
//     message: "Driver home data",
//     data: result,
//   });
// }),
// };