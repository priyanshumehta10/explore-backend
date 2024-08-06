import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user._id;

    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Valid video ID required");
    }

    const like = await Like.findOne({ videoId, userId });

    if (like) {
        await Like.deleteOne({ videoId, userId });
        return res.status(200).json(new ApiResponse(200, {}, "Video unliked successfully"));
    } else {
        await Like.create({ videoId, userId });
        return res.status(200).json(new ApiResponse(200, {}, "Video liked successfully"));
    }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user._id;

    if (!commentId || !isValidObjectId(commentId)) {
        throw new ApiError(400, "Valid comment ID required");
    }

    const like = await Like.findOne({ commentId, userId });

    if (like) {
        await Like.deleteOne({ commentId, userId });
        return res.status(200).json(new ApiResponse(200, {}, "Comment unliked successfully"));
    } else {
        await Like.create({ commentId, userId });
        return res.status(200).json(new ApiResponse(200, {}, "Comment liked successfully"));
    }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const userId = req.user._id;

    if (!tweetId || !isValidObjectId(tweetId)) {
        throw new ApiError(400, "Valid tweet ID required");
    }

    const like = await Like.findOne({ tweetId, userId });

    if (like) {
        await Like.deleteOne({ tweetId, userId });
        return res.status(200).json(new ApiResponse(200, {}, "Tweet unliked successfully"));
    } else {
        await Like.create({ tweetId, userId });
        return res.status(200).json(new ApiResponse(200, {}, "Tweet liked successfully"));
    }
});

const getLikedVideos = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const likes = await Like.find({ userId, videoId: { $exists: true } });

    if (!likes || likes.length === 0) {
        throw new ApiError(400, "No liked videos found");
    }

    return res.status(200).json(new ApiResponse(200, likes, "All liked videos found by a specific user"));
});

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
};
