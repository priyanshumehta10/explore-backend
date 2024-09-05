import mongoose, { isValidObjectId, Mongoose } from "mongoose";
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

    const like = await Like.findOne({ video: videoId, likedBy: userId });

    if (like) {
        await Like.deleteOne({ video: videoId, likedBy: userId });
        return res.status(200).json(new ApiResponse(200, {}, "Video unliked successfully"));
    } else {
        await Like.create({ video: videoId, likedBy: userId });
        return res.status(200).json(new ApiResponse(200, {}, "Video liked successfully"));
    }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user._id;

    if (!commentId || !isValidObjectId(commentId)) {
        throw new ApiError(400, "Valid comment ID required");
    }

    const like = await Like.findOne({ comment: commentId, likedBy: userId });

    if (like) {
        await Like.deleteOne({ comment: commentId, likedBy: userId });
        return res.status(200).json(new ApiResponse(200, {}, "Comment unliked successfully"));
    } else {
        await Like.create({ comment: commentId, likedBy: userId });
        return res.status(200).json(new ApiResponse(200, {}, "Comment liked successfully"));
    }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const userId = req.user._id;

    if (!tweetId || !isValidObjectId(tweetId)) {
        throw new ApiError(400, "Valid tweet ID required");
    }

    const like = await Like.findOne({ tweet: tweetId, likedBy: userId });

    if (like) {
        await Like.deleteOne({ tweet: tweetId, likedBy: userId });
        return res.status(200).json(new ApiResponse(200, {}, "Tweet unliked successfully"));
    } else {
        await Like.create({ tweet: tweetId, likedBy: userId });
        return res.status(200).json(new ApiResponse(200, {}, "Tweet liked successfully"));
    }
});

const getLikedVideos = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const likes = await Like.aggregate([
        {
            $match: { likedBy: new mongoose.Types.ObjectId(userId) }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "videoDetails",
                pipeline: ([
                    {
                        $project: {
                            _id: 1,
                            thumbnail: 1,
                            title: 1,
                            duration: 1,
                            views: 1,
                            isPublished: 1,
                            createdAt: 1
                        }
                    }
                ])
            }
        },
        {
            $unwind: "$videoDetails"
        }
    ])

    if (!likes || likes.length === 0) {
        throw new ApiError(400, "No liked videos found");
    }

    return res.status(200).json(new ApiResponse(200, likes[0], "All liked videos found by a specific user"));
});

const getLikeCount = asyncHandler(async (req, res) => {
    const { type, id } = req.params; // Correctly destructuring type and id from params

    // Validate the id
    if (!id || !isValidObjectId(id)) {
        console.error('Invalid ID'); // Debugging log
        throw new ApiError(400, "Valid ID required");
    }

    // Determine the field based on the type
    let field;
    if (type === 'video') {
        field = 'video';
    } else if (type === 'comment') {
        field = 'comment';
    } else if (type === 'tweet') {
        field = 'tweet';
    } else {
        console.error('Invalid type'); // Debugging log
        throw new ApiError(400, "Invalid type. Must be 'video', 'comment', or 'tweet'.");
    }

    // Count likes based on the specified field
    console.log(`Counting likes for field: ${field}, id: ${id}`); // Debugging log
    const likeCount = await Like.countDocuments({ [field]: id });

    console.log(`Like count for ${type} with ID ${id}: ${likeCount}`); // Debugging log
    return res.status(200).json(new ApiResponse(200, { likeCount }, `Like count retrieved successfully for ${type}`));
});


const getMostLikedTweets = asyncHandler(async (req, res) => {
    console.log('getMostLikedTweets route accessed');
    let topTweets = await Like.aggregate([
        {
            $match: { tweet: { $exists: true } } // Ensure that the like is associated with a tweet
        },
        {
            $group: {
                _id: "$tweet", // Group by tweet ID
                likeCount: { $sum: 1 } // Count the number of likes for each tweet
            }
        },
        {
            $sort: { likeCount: -1 } // Sort by like count in descending order
        },
        {
            $limit: 3 // Limit the results to the top three tweets
        },
        {
            $lookup: {
                from: "tweets", // Join with the Tweet collection
                localField: "_id", // Use the tweet ID from the grouped results
                foreignField: "_id", // Match with the _id field in the Tweet collection
                as: "tweetDetails"
            }
        },
        {
            $unwind: "$tweetDetails" // Unwind the joined tweet details array
        },
        {
            $lookup: {
                from: "users", // Join with the User collection to get the tweet owner's details
                localField: "tweetDetails.owner",
                foreignField: "_id",
                as: "ownerDetails",

            }
        },
        {
            $unwind: "$ownerDetails" // Unwind the owner's details array
        },
        {
            $project: {
                _id: 0, // Exclude the _id field from the final output
                tweetId: "$_id",
                likeCount: 1,
                avatar: "$ownerDetails.avatar",
                username: "$ownerDetails.username",
                user_id: "$ownerDetails._id",
                content: "$tweetDetails.content",
                createdAt: "$tweetDetails.createdAt",
                tweet_id: "$tweetDetails._id",
            }
        }
    ]);

    // Ensure we always return exactly three results
    if (topTweets.length < 3) {
        const dummyTweet = {
            tweetId: null,
            likeCount: 0,
            avatar: null,
            username: null,
            user_id: null,
            content: "No tweet available",
            createdAt: null,
            tweet_id: null
        };

        while (topTweets.length < 3) {
            topTweets.push(dummyTweet);
        }
    }

    return res.status(200).json(new ApiResponse(200, topTweets, "Top 3 liked tweets found"));
});

const isVideoLiked = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user._id;

    if (!videoId || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Valid video ID required");
    }

    const like = await Like.findOne({ video: videoId, likedBy: userId });

    return res.status(200).json(new ApiResponse(200, { isLiked: !!like }, "Video like status retrieved successfully"));
});

const isCommentLiked = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user._id;

    if (!commentId || !isValidObjectId(commentId)) {
        throw new ApiError(400, "Valid comment ID required");
    }

    const like = await Like.findOne({ comment: commentId, likedBy: userId });

    return res.status(200).json(new ApiResponse(200, { isLiked: !!like }, "Comment like status retrieved successfully"));
});

const isTweetLiked = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const userId = req.user._id;

    if (!tweetId || !isValidObjectId(tweetId)) {
        throw new ApiError(400, "Valid tweet ID required");
    }

    const like = await Like.findOne({ tweet: tweetId, likedBy: userId });

    return res.status(200).json(new ApiResponse(200, { isLiked: !!like }, "Tweet like status retrieved successfully"));
});
export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos,
    getMostLikedTweets,
    isVideoLiked,
    isTweetLiked,
    isCommentLiked,
    getLikeCount,
};
