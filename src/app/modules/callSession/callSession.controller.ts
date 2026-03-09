import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { callSessionServices } from "./callSession.service";
import sendResponse from "../../../shared/sendResponse";


const initialCall = catchAsync(async (req, res) => {
    const { id: callerId } = req.user;
    const { receiverId } = req.body;

    const result = await callSessionServices.createCallSession(callerId, receiverId);

    sendResponse(res,{
        success:true,
        statusCode:200,
        message:"Call session created successfully",
        data:result
    })
})

const acceptCall = catchAsync(async (req, res) => {
    const {id:userId} = req.user;
    const { sessionId } = req.body;

    const data = await callSessionServices.acceptCallSession(sessionId, userId);

    sendResponse(res,{
        success:true,
        statusCode:200,
        message:"Call session accepted successfully",
        data
    })
})

const rejectCall = catchAsync(async (req: Request, res: Response) => {
   const {id:userId} = req.user;
        
        const { sessionId } = req.body;

        await callSessionServices.rejectCallSession(sessionId, userId);

        sendResponse(res,{
            success:true,
            statusCode:200,
            message:"Call session rejected successfully",
        })
       
})

const endCall = catchAsync(async (req: Request, res: Response) => {
    const { sessionId } = req.body;

    const { id:endedBy } = req.user as any;

    await callSessionServices.endCallSession(sessionId, endedBy);

    sendResponse(res,{
        success:true,
        statusCode:200,
        message:"Call session ended successfully",
    })
})

const getActiveCall = catchAsync(async (req: Request, res: Response) => {
    const { id: userId } = req.user;

    const result = await callSessionServices.getActiveCallSession(userId);

    sendResponse(res,{
        success:true,
        statusCode:200,
        message:"Active call session fetched successfully",
        data: result
    })
})


export const callSessionControllers = {
    initialCall,
    acceptCall,
    rejectCall,
    endCall,
    getActiveCall
}