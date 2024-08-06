import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


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
        { $unwind: '$ownerDetails' },
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
                owner: {
                    _id: "$ownerDetails._id",
                    username: "$ownerDetails.username",
                    email: "$ownerDetails.email"
                }
            }
        }
    ];

    // console.log("Aggregation Pipeline:", JSON.stringify(aggregationPipeline, null, 2));

    try {
        const result = await Video.aggregatePaginate(
            Video.aggregate(aggregationPipeline),
            options
        );

        res.status(200).json(result);
    } catch (error) {
        console.error("Error during aggregation:", error);
        res.status(500).json({ message: 'Failed to fetch videos', error: error.message });
    }
});


const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    const userId = req.user._id
    // TODO: get video, upload to cloudinary, create video
    if(!title || !description){
        throw new ApiError(400,"please provide a title and description")
    }
    const videoFileLocalPath = await req.files?.videoFile[0]?.path
    const thumbnailLocalPath = await req.files?.thumbnail[0]?.path

    if(!videoFileLocalPath || !thumbnailLocalPath){
        throw new ApiError(400,"please provide a video file or thumbnail")
    }
    const videoFile = await uploadOnCloudinary(videoFileLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    if(!videoFile){
        throw new ApiError(400,"please provide a video file")
    }
    if(!thumbnail){
        throw new ApiError(400,"please provide a thumbnail file")
    }
    const video = await Video.create({
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        title,
        description,
        views:0,
        duration: videoFile.duration,
        isPublished: true,
        owner:userId
    })

    return res
    .status(201)
    .json(new ApiResponse(201,video,"Successfully created video"))
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"invalid video id")
    }

    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(400,"video not found with the help of id")
    }
    return res
    .status(200)
    .json(new ApiResponse(200,video,"get video by id successfully"))
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const {title, description} = req.body
    if(!title || !description) {
        throw new ApiError(400,"please provide a title and description")
    }
    //TODO: update video details like title, description, thumbnail
    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"invalid video id")
    }

    const thumbnailLocalPath =  req.file?.path
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "thumbnail file is missing")
    }
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    if (!thumbnail) {
        throw new ApiError(400, "thumbnail file is missing")
    }
    const video = await Video.findByIdAndUpdate(videoId,{
        $set:{
            title,
            description,
            thumbnail: thumbnail.url
        }
    },{
        new: true
    })

    if(!video){
        throw new ApiError(400,"video file is missing")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,video,"file updated successfully"))


})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid video id")
    }
    const video = await Video.findByIdAndDelete(videoId)
    if(!video){
        throw new ApiError(400,"video not deleted")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,video,"video deleted successfully"))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"invalid video id")
    }
    const video  = await Video.findById(videoId)
    if(!video){
        throw new ApiError(400,"video not found")
    }
    video.isPublished = !video.isPublished
    await video.save()

    return res
    .status(200)
    .json(new ApiResponse(200,video,"video status toggled"))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}