import { Types } from "mongoose";
import { CALL_STATUS } from "./callSession.constant";


export interface ICallSession {
  channelName: string;
  caller: Types.ObjectId;
  receiver: Types.ObjectId;
  status: CALL_STATUS;
  startedAt?: Date;
  endedAt?: Date;
}