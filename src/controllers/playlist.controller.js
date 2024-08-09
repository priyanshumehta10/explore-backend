import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body
    const userId = req.user._id
    //TODO: create playlist
    const playlist = await Playlist.create({
        name,
        description,
        owner: userId
    })
    if (!playlist) {
        throw new ApiError(500,"something went wrong with creating playlist")
    }
    
    return res
    .status(200)
    .json(new ApiResponse(200, playlist ,"playlist created successfully"))
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists
    if (!isValidObjectId(userId)) {
        throw new ApiError(400,"Invalid user id")
    }

    const playlist = await Playlist.find({
        owner: userId
    })
    if (!playlist) {
        throw new ApiError(400,"something went wrong with finding the playlist from the database")
    }
    return res
    .status(200)
    .json(new ApiResponse(200,playlist,"playlists fetched successfully"))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params

    //TODO: get playlist by id
    const playlist = await Playlist.aggregate([
        {
            $match: {_id : new mongoose.Types.ObjectId(playlistId)}
        },
        {
            $lookup:{
                from: "users",
                localField:"owner",
                foreignField:"_id",
                as:"ownerDetails",
                pipeline:([
                    {
                        $project:{
                            username:1,
                            avatar:1,
                            _id:1
                        }
                    }
                ])
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"videos",
                foreignField:"_id",
                as:"videosDetails",
                pipeline:(
                    [
                        {
                            $project:{
                                _id:1,
                                thumbnail:1,
                                title:1,
                                views:1,
                                isPublished:1,
                                owner:1,
                                duration:1,
                                createdAt:1,
                                
                            }
                        }
                    ]
                )
            }
        },
        {
            $unwind:"$ownerDetails"
        },
        {
            $project:{
                _id:1,
                name:1,
                description:1,
                createdAt:1,
                ownerDetails:1,
                videosDetails:1
            }
        }
    ])
    if(!playlist) {
        throw new ApiError(400,"something went wrong with getting the playlist by id from the database")
    }
    return res
    .status(200)
    .json(new ApiResponse(200,playlist,"playlists fetched successfully"))

})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    if(!isValidObjectId(playlistId)){
        throw new ApiError(400,"Invalid playlist id")
    }
    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid playlist id")
    }
    const playlist = await Playlist.findByIdAndUpdate(
        playlistId,
        { $addToSet: { videos: videoId } }, // Ensure video is added without duplication
        { new: true } // Return the updated document
    );
    return res
    .status(200)
    .json(new ApiResponse(200,playlist,"success add a video to playlist"))
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id");
    }
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const playlist = await Playlist.findByIdAndUpdate(
        playlistId,
        { $pull: { videos: videoId } }, // Remove the specific video from the array
        { new: true } // Return the updated document
    );

    if (!playlist) {
        throw new ApiError(400, "Playlist not found or failed to remove video");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "Video removed from playlist successfully"));
});

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id");
    }
    const playlist = await Playlist.findByIdAndDelete(playlistId)
    if (!playlist){
        throw new ApiError(500, "something went wrong")
    }
    return res
    .status(200)
    .json(new ApiResponse(200,playlist,"playlist successfully deleted")) 
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id");
    }
    const playlist = await Playlist.findByIdAndUpdate(playlistId,{
        name,
        description
    },{
        new: true
    })
    if (!playlist) {
        throw new ApiError(500, "something went wrong in update playlist");
    }
    res.status(200)
    .json(new ApiResponse(200,playlist,"playlist updated successfully")) 
})


export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}