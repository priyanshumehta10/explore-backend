import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!videoId) {
        throw new ApiError(400, "Video ID is not specified");
    }

    const { page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    if (isNaN(pageNumber) || isNaN(limitNumber) || pageNumber < 1 || limitNumber < 1) {
        throw new ApiError(400, "Invalid page or limit number");
    }

    const comments = await Comment.find({ video: videoId })
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber);

    if (!comments || comments.length === 0) {
        throw new ApiError(404, "No comments found for this video");
    }

    return res
        .status(200)
        .json
        (
            new ApiResponse
                (
                    200,
                    comments,
                    "All comments fetched successfully"
                )
        );
});

const addComment = asyncHandler(async (req, res) => {
    const { content } = req.body;
    if (!content || content.trim() === "") {
        throw new ApiError(400, "Please write something in the comment section");
    }

    const { videoId } = req.params;
    if (!videoId) {
        throw new ApiError(400, "Video ID is not specified");
    }

    const newComment = new Comment({
        video: videoId,
        content,
        user: req.user._id // Make sure req.user is populated by authentication middleware
    });

    await newComment.save();

    return res
        .status(201)
        .json
        (
            new ApiResponse
                (
                    201,
                    newComment,
                    "Comment added successfully"
                )
        );
});

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    if (!commentId) {
        throw new ApiError(400, "Comment ID is required");
    }

    if (!content || content.trim() === "") {
        throw new ApiError(400, "Please write something in the comment section");
    }

    const comment = await Comment.findByIdAndUpdate(commentId, { content }, { new: true });

    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    return res
        .status(200)
        .json
        (
            new ApiResponse
                (
                    200,
                    comment,
                    "Comment updated successfully"
                )
        );
});

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!commentId) {
        throw new ApiError(400, "Comment ID is required");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    await comment.remove();

    return res
        .status(200)
        .json
        (
            new ApiResponse
                (
                    200,
                    null,
                    "Comment deleted successfully"
                )
        );
});

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
};
