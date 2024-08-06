import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    //TODO: create playlist
    const playlist = await Playlist.create({
        name,
        description
    })
    if (!playlist) {
        throw new ApiError(400,"something went wrong with creating playlist")
    }
    const playlistData = await Playlist.findById(playlist._id)
    if (!playlistData) {
        throw new ApiError(400,"something went wrong with fetching the playlist")
    }
    return res
    .status(200)
    .json(new ApiResponse(200, playlistData ,"playlist created successfully"))
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists

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
    const playlist = await Playlist.findById(playlistId)
    if(!playlist) {
        throw new ApiError(400,"something went wrong with getting the playlist by id from the database")
    }
    return res
    .status(200)
    .json(new ApiResponse(200,playlist,"playlists fetched successfully"))

})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist
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