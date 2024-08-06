import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const healthcheck = asyncHandler(async (req, res) => {
    // Build a health check response
    let response = new ApiResponse(200, {}, "Health check successful");
    if (!response) {
        throw new ApiError(400, "Invalid response");
    }
    return res
        .status(200)
        .json(response);
});

export {
    healthcheck
};
