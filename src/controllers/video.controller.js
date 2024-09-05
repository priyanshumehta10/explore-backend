import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query = "", sortBy = "createdAt", sortType = "desc", userId } = req.query;

    const sort = {};
    sort[sortBy] = sortType === 'asc' ? 1 : -1;

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sort: sort
    };

    const match = {};
    if (query) {
        match.$or = [
            { title: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } }
        ];
    }
    if (userId) {
        match.owner = new mongoose.Types.ObjectId(userId);
    }

    // console.log("Match Object:", match);

    const aggregationPipeline = [
        { $match: match },
        { $sort: sort },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails"
            }
        },
        { $unwind: "$ownerDetails" },
        {
            $project: {
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                isPublished: 1,
                createdAt: 1,
                updatedAt: 1,
                owner_id: "$ownerDetails._id",
                username: "$ownerDetails.username",
                email: "$ownerDetails.email",
                avatar: "$ownerDetails.avatar"

            }
        }
    ];

    // console.log("Aggregation Pipeline:", JSON.stringify(aggregationPipeline, null, 2));

    try {
        const result = await Video.aggregatePaginate(
            Video.aggregate(aggregationPipeline),
            options
        );

        res.status(200).json(new ApiResponse(200, result, "get all videos successfully"));
    } catch (error) {
        console.error("Error during aggregation:", error);
        res.status(500).json({ message: 'Failed to fetch videos', error: error.message });
    }
});

const getUserVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query = "", sortBy = "createdAt", sortType = "desc" } = req.query;
    const userId = req.user._id;  // Assuming userId is provided as a URL parameter

    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
    }

    const sort = {};
    sort[sortBy] = sortType === 'asc' ? 1 : -1;

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sort: sort
    };

    const match = {
        owner: new mongoose.Types.ObjectId(userId)  // Filter by userId
    };

    if (query) {
        match.$or = [
            { title: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } }
        ];
    }

    const aggregationPipeline = [
        { $match: match },
        { $sort: sort },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails"
            }
        },
        { $unwind: "$ownerDetails" },
        {
            $project: {
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                isPublished: 1,
                createdAt: 1,
                updatedAt: 1,
                owner_id: "$ownerDetails._id",
                username: "$ownerDetails.username",
                email: "$ownerDetails.email",
                avatar: "$ownerDetails.avatar"
            }
        }
    ];

    try {
        const result = await Video.aggregatePaginate(
            Video.aggregate(aggregationPipeline),
            options
        );

        res.status(200).json(new ApiResponse(200, result, "Get user videos successfully"));
    } catch (error) {
        console.error("Error during aggregation:", error);
        res.status(500).json({ message: 'Failed to fetch user videos', error: error.message });
    }
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body
    const userId = req.user._id
    // TODO: get video, upload to cloudinary, create video
    if (!title || !description) {
        throw new ApiError(400, "please provide a title and description")
    }
    const videoFileLocalPath = await req.files?.videoFile[0]?.path
    const thumbnailLocalPath = await req.files?.thumbnail[0]?.path

    if (!videoFileLocalPath || !thumbnailLocalPath) {
        throw new ApiError(400, "please provide a video file or thumbnail")
    }
    const videoFile = await uploadOnCloudinary(videoFileLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    if (!videoFile) {
        throw new ApiError(400, "please provide a video file")
    }
    if (!thumbnail) {
        throw new ApiError(400, "please provide a thumbnail file")
    }
    const video = await Video.create({
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        title,
        description,
        views: 0,
        duration: videoFile.duration,
        isPublished: true,
        owner: userId
    })

    return res
        .status(201)
        .json(new ApiResponse(201, video, "Successfully created video"))
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    // First, increment the view count
    await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } }, { new: true });

    // Then, perform aggregation to fetch video details and user information
    const pipeline = [
        { $match: { _id: new mongoose.Types.ObjectId(videoId) } }, // Match video by ID
        {
            $lookup: {
                from: 'users', // Name of the users collection
                localField: 'owner', // Field from the video collection
                foreignField: '_id', // Field from the users collection
                as: 'userDetails' // Alias for the joined data
            }
        },
        { $unwind: '$userDetails' }, // Flatten the userDetails array
        {
            $addFields: {
                username: '$userDetails.username', // Add username field
                avatar: '$userDetails.avatar' // Add avatar field
            }
        },
        {
            $project: {
                userDetails: 0 // Exclude the userDetails field
            }
        }
    ];

    // Run aggregation pipeline
    const video = await Video.aggregate(pipeline).exec();
    console.log("Aggregation result:", video);

    if (!video.length) {
        console.error("No video found for ID:", videoId);
        throw new ApiError(404, "Video not found");
    }


    return res
        .status(200)
        .json(new ApiResponse(200, video[0], "Video retrieved successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { title, description } = req.body
    if (!title || !description) {
        throw new ApiError(400, "please provide a title and description")
    }
    //TODO: update video details like title, description, thumbnail
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "invalid video id")
    }

    const thumbnailLocalPath = req.file?.path
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "thumbnail file is missing")
    }
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    if (!thumbnail) {
        throw new ApiError(400, "thumbnail file is missing")
    }
    const video = await Video.findByIdAndUpdate(videoId, {
        $set: {
            title,
            description,
            thumbnail: thumbnail.url
        }
    }, {
        new: true
    })

    if (!video) {
        throw new ApiError(400, "video file is missing")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video, "file updated successfully"))


})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }
    const video = await Video.findByIdAndDelete(videoId)
    if (!video) {
        throw new ApiError(400, "video not deleted")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video, "video deleted successfully"))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "invalid video id")
    }
    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(400, "video not found")
    }
    video.isPublished = !video.isPublished
    await video.save()

    return res
        .status(200)
        .json(new ApiResponse(200, video, "video status toggled"))
})

const getTrendingVideos = asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;

    const options = {
        limit: parseInt(limit, 10),
        sort: { views: -1, createdAt: -1 } // Sort by views descending, then by recent upload time
    };

    try {
        const trendingVideos = await Video.aggregate([
            { $match: { isPublished: true } }, // Only consider published videos
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "ownerDetails"
                }
            },
            {
                $project: {
                    videoFile: 1,
                    thumbnail: 1,
                    title: 1,
                    description: 1,
                    views: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    avatar: "$ownerDetails.avatar",
                    email: "$ownerDetails.email",
                    username: "$ownerDetails.username",
                    score: {
                        $add: [
                            { $multiply: ["$views", 1] }, // Adjust weight of views
                            { $multiply: [{ $toLong: "$createdAt" }, 0.001] } // Convert createdAt to timestamp and adjust weight
                        ]
                    }
                }
            },
            { $sort: { score: -1 } }, // Sort by score descending
            { $limit: options.limit } // Limit the number of results
        ]);

        res.status(200).json(new ApiResponse(200, trendingVideos, "Trending videos fetched successfully"));
    } catch (error) {
        console.error("Error fetching trending videos:", error);
        res.status(500).json({
            statusCode: 500,
            data: null,
            success: false,
            errors: [error.message]
        });
    }
});



export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
    getTrendingVideos,
    getUserVideos,
}