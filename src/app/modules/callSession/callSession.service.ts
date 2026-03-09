import { RtcTokenBuilder, RtcRole } from "agora-token";
import { Types } from "mongoose";
import { CallSession } from "./callSession.model";
import { emitToUser } from "../../../helpers/socketHelper";
import { CALL_STATUS } from "./callSession.constant";
import config from "../../../config";
import { User } from "../user/user.model";
import ApiError from "../../../errors/ApiErrors";


const APP_ID = config.agora.appId || "";
const APP_CERT = config.agora.primaryCertificate || "";

if (!APP_ID || !APP_CERT) throw new Error("Agora credentials missing in .env");

const MAX_RINGING_TIME = 45 * 1000; // 45 sec max ringing before auto reject

function generateToken(channel: string, uid: number): string {
    const now = Math.floor(Date.now() / 1000);
    return RtcTokenBuilder.buildTokenWithUid(
        APP_ID,
        APP_CERT,
        channel,
        uid,
        RtcRole.PUBLISHER,
        now + 3600,
        now + 3600
    );
}

function stringToNumericUid(id: string): number {
    return parseInt(id.slice(-8), 16);
}

async function getUserInfo(userId: string) {
    const user = await User.findById(userId).select("firstName lastName profileImage phone");
    return {
        firstName: user?.firstName || "",
        lastName: user?.lastName || "",
        profileImage: user?.profileImage || "",
        phone: user?.phone || "",
    };
}

// --------------------------------------------------
// CREATE CALL
// --------------------------------------------------
const createCallSession = async (callerId: string, receiverId: string) => {
    const active = await CallSession.findOne({
        status: { $in: [CALL_STATUS.RINGING, CALL_STATUS.ONGOING] },
        $or: [
            { caller: callerId },
            { receiver: callerId },
            { caller: receiverId },
            { receiver: receiverId },
        ],
    });

    if (active) throw new Error("Caller or receiver is already in another active call");

    const sessionId = new Types.ObjectId();
    const channelName = `call_${sessionId}`;

    const session = await CallSession.create({
        _id: sessionId,
        caller: new Types.ObjectId(callerId),
        receiver: new Types.ObjectId(receiverId),
        status: CALL_STATUS.RINGING,
        channelName,
        createdAt: new Date(),
    });

    const callerInfo = await getUserInfo(callerId);

    emitToUser(receiverId, "incoming_call", {
        sessionId: session._id.toString(),
        channelName,
        callerId,
        caller: callerInfo,
    });

    // Auto reject after MAX_RINGING_TIME
    setTimeout(async () => {
        const latest = await CallSession.findById(session._id);
        if (latest && latest.status === CALL_STATUS.RINGING) {
            latest.status = CALL_STATUS.REJECTED;
            latest.endedAt = new Date();
            await latest.save();
            const rejectedByUser = await getUserInfo(callerId);
            emitToUser(callerId, "call_rejected", { sessionId: latest._id.toString(), reason: "No answer", rejectedBy: rejectedByUser });
            emitToUser(receiverId, "call_missed", { sessionId: latest._id.toString(), missedBy: rejectedByUser });
        }
    }, MAX_RINGING_TIME);

    return { sessionId: session._id.toString(), channelName };
}

// --------------------------------------------------
// ACCEPT CALL
// --------------------------------------------------
const acceptCallSession = async (sessionId: string, userId: string) => {
    const session = await CallSession.findById(sessionId);
    if (!session) throw new Error("Call session not found");
    if (session.status !== CALL_STATUS.RINGING) throw new Error("Call no longer ringing");
    if (session.receiver.toString() !== userId) throw new Error("Not your call");

    session.status = CALL_STATUS.ONGOING;
    session.startedAt = new Date();
    await session.save();

    const callerUid = stringToNumericUid(session.caller.toString());
    const receiverUid = stringToNumericUid(session.receiver.toString());

    const callerInfo = await getUserInfo(session.caller.toString());
    const receiverInfo = await getUserInfo(session.receiver.toString());

    const data = {
        channelName: session.channelName,
        callerToken: generateToken(session.channelName, callerUid),
        receiverToken: generateToken(session.channelName, receiverUid),
        callerUid,
        receiverUid,
        caller: callerInfo,
        receiver: receiverInfo,
    };

    emitToUser(session.caller.toString(), "call_accepted", { sessionId, ...data });
    emitToUser(session.receiver.toString(), "call_accepted", { sessionId, ...data });

    return data;
}

// --------------------------------------------------
// REJECT CALL
// --------------------------------------------------
const rejectCallSession = async (sessionId: string, userId: string) => {
    const session = await CallSession.findById(sessionId);
    if (!session || session.status !== CALL_STATUS.RINGING) return;

    session.status = CALL_STATUS.REJECTED;
    session.endedAt = new Date();
    await session.save();

    const user= await getUserInfo(userId);

    emitToUser(session.caller.toString(), "call_rejected", { sessionId, user });
    emitToUser(session.receiver.toString(), "call_rejected", { sessionId, user });
}

// --------------------------------------------------
// END CALL
// --------------------------------------------------
const endCallSession = async (sessionId: string, endedBy?: string) => {
    const session = await CallSession.findById(sessionId);
    if (!session || session.status !== CALL_STATUS.ONGOING) return;

    session.status = CALL_STATUS.ENDED;
    session.endedAt = new Date();
    await session.save();

    const endedByUser = await getUserInfo(endedBy || "");

    emitToUser(session.caller.toString(), "call_ended", { sessionId, endedBy: endedByUser });
    emitToUser(session.receiver.toString(), "call_ended", { sessionId, endedBy: endedByUser });
}

// --------------------------------------------------
// GET ACTIVE CALL
// --------------------------------------------------
const getActiveCallSession = async (userId: string) => {
    const session = await CallSession.findOne({
        $or: [{ caller: userId }, { receiver: userId }],
        status: { $in: [CALL_STATUS.RINGING, CALL_STATUS.ONGOING] },
    }).populate("caller receiver", "firstName lastName phone profileImage");

    if(!session){
        throw new ApiError(400, "No active call found");
    }

    return session;

}

export const callSessionServices = {
    createCallSession,
    acceptCallSession,
    rejectCallSession,
    endCallSession,
    getActiveCallSession,
}