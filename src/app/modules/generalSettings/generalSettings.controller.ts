import { Request, Response } from "express";
import { GeneralSettingsServices } from "./generalSettings.service";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";

const createSettings = catchAsync(async (req: Request, res: Response) => {
    const result = await GeneralSettingsServices.createSettingsInDB(req.body);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Settings created successfully",
        data: result,
    });
});

const getSettings = catchAsync(async (req: Request, res: Response) => {
    const result = await GeneralSettingsServices.getSettingsFromDB();

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Settings fetched successfully",
        data: result,
    });
});

const updateSettings = catchAsync(async (req: Request, res: Response) => {
    const result = await GeneralSettingsServices.updateSettingsInDB(req.body);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Settings updated successfully",
        data: result,
    });
});

export const GeneralSettingsControllers = {
    createSettings,
    getSettings,
    updateSettings,
};