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

    // Define aggregation pipeline with pagination
    const comments = await Comment.aggregate([
        { $match: { video:new mongoose.Types.ObjectId(videoId) } },
        {
            $lookup: {
                from: 'users',
                localField: 'owner', // Correct the field name
                foreignField: '_id',
                as: 'userDetails',
                pipeline:[
                    {
                        $project:{
                            _id:1,
                            username:1
                        }
                    }
                ]
            }
        },
        { $unwind: '$userDetails' }, // Unwind the userDetails array
        { $skip: (pageNumber - 1) * limitNumber }, // Skip the documents for pagination
        { $limit: limitNumber }, // Limit the number of documents returned
        {
            $project: {
                _id: 1,
                content: 1, // Ensure 'content' field is used as per schema
                createdAt: 1,
                video:1,
                userDetails: 1
            }
        }
    ]);

    // Perform the aggregation with pagination
    // const comments = await aggregate.exec();

    // Check if comments are found
    if (comments.length === 0) {
        throw new ApiError(404, "No comments found for this video");
    }

    // Send response with pagination details
    return res
        .status(200)
        .json(new ApiResponse(200, comments, "All comments fetched successfully", {
            page: pageNumber,
            limit: limitNumber
        }));
});

export default getVideoComments;

const addComment = asyncHandler(async (req, res) => {
    const { content } = req.body;
    const userId = req.user._id
    console.log(userId);
    
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
        owner: userId// Make sure req.user is populated by authentication middleware
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

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
};
