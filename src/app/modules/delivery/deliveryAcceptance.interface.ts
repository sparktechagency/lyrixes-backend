import { Types } from "mongoose";

export enum ACCEPTANCE_STATUS {
  ACCEPTED = "ACCEPTED",
  WITHDRAWN = "WITHDRAWN",
}

export type IDeliveryAcceptance = {
  deliveryId: Types.ObjectId;
  driverId: Types.ObjectId;
  status: ACCEPTANCE_STATUS;
};