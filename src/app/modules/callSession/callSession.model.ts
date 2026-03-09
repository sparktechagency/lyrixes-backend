import { Schema, model } from "mongoose";
import { ICallSession } from "./callSession.interface";
import { CALL_STATUS } from "./callSession.constant";


const callSessionSchema = new Schema<ICallSession>(
    {
        channelName: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        caller: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        receiver: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        status: {
            type: String,
            enum: CALL_STATUS,
        },
        startedAt: {
            type: Date,
        },
        endedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

export const CallSession = model<ICallSession>("CallSession", callSessionSchema);