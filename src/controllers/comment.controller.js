import {mongoose,isValidObjectId} from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video ID");
    }

    const { page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    if (isNaN(pageNumber) || isNaN(limitNumber) || pageNumber < 1 || limitNumber < 1) {
        throw new ApiError(400, "Invalid page or limit number");
    }

    const comments = await Comment.aggregate([
        { $match: { video: new mongoose.Types.ObjectId(videoId) } },
        {
            $lookup: {
                from: 'users',
                localField: 'owner',
                foreignField: '_id',
                as: 'userDetails',
            }
        },
        { $unwind: '$userDetails' },
        { $skip: (pageNumber - 1) * limitNumber },
        { $limit: limitNumber },
        {
            $project: {
                _id: 1,
                content: 1,
                createdAt: 1,
                video: 1,
                username: "$userDetails.username",
                avatar: "$userDetails.avatar",
            }
        }
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, comments, "All comments fetched successfully", {
            page: pageNumber,
            limit: limitNumber
        }));
});

const addComment = asyncHandler(async (req, res) => {
    const { content } = req.body;
    const userId = req.user._id;
    
    if (!content || content.trim() === "") {
        throw new ApiError(400, "Please write something in the comment section");
    }

    const { videoId } = req.params;
    if (!videoId) {
        throw new ApiError(400, "Video ID is not specified");
    }

    // Create the new comment document
    const newComment = new Comment({
        video: videoId,
        content,
        owner: userId // Ensure req.user is populated by authentication middleware
    });

    // Save the comment to the database
    await newComment.save();

    // Use aggregation to fetch the comment along with the owner's details
    const commentsWithOwnerDetails = await Comment.aggregate([
        { $match: { _id: newComment._id } },
        {
            $lookup: {
                from: 'users',
                localField: 'owner',
                foreignField: '_id',
                as: 'userDetails',
            }
        },
        { $unwind: '$userDetails' },
        {
            $project: {
                _id: 1,
                content: 1,
                createdAt: 1,
                video: 1,
                username:'$userDetails.username',
                avatar:'$userDetails.avatar',
                email:'$userDetails.email',
                owner: 1
            }
        }
    ]);

    if (commentsWithOwnerDetails.length === 0) {
        throw new ApiError(404, "No comment details found");
    }

    // Return the response with the owner's details included
    return res.status(201).json(
        new ApiResponse(
            201,
            commentsWithOwnerDetails[0], // Return the enriched comment with owner's details
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
    if(!isValidObjectId(commentId)) {
        throw new ApiError(400, "Comment ID is not valid");
    }

    const comment = await Comment.findByIdAndDelete(commentId);

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
                    null,
                    "Comment deleted successfully"
                )
        );
});

const getCommentCount = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video ID");
    }

    const count = await Comment.countDocuments({ video: videoId });

    return res.status(200).json(
        new ApiResponse(
            200,
            { count },
            "Comment count fetched successfully"
        )
    );
});



export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment,
    getCommentCount
};
