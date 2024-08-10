import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Get Channel Statistics
const getChannelStats = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // Fetch total video views, total videos, and total likes
    const videos = await Video.find({ owner: userId });
    if (!videos) {
        throw new ApiError("No videos found for this channel", 404);
    }

    const totalViews = videos.reduce((acc, video) => acc + video.views, 0);
    const totalLikes = await Like.countDocuments({ video: { $in: videos.map(video => video._id) } });
    const totalVideos = videos.length;

    // Fetch total subscribers
    const totalSubscribers = await Subscription.countDocuments({ channel: userId });

    const stats = {
        totalViews,
        totalSubscribers,
        totalVideos,
        totalLikes,
    };

    res.status(200).json(new ApiResponse(stats));
});

// Get All Channel Videos
const getChannelVideos = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    // Fetch all videos uploaded by the user
    const videos = await Video.find({ owner: userId });

    if (!videos) {
        throw new ApiError("No videos found for this channel", 404);
    }

    res.status(200).json(new ApiResponse(videos));
});

export {
    getChannelStats,
    getChannelVideos,
};
