import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { response } from "express"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const {content} = req.body
    const userId = req.user._id
    if(!isValidObjectId(userId)){
        throw new ApiError(400,"user id is not valid")
    }
    if(!content){
        throw new ApiError(400,"content is required")
    }
    const tweet = await Tweet.create({
        content,
        owner:userId
    }) 

    if (!tweet) {
        throw new ApiError(500,"server error")
    }
    return res
    .status(201)
    .json(new ApiResponse(201,tweet,"tweet successfully created"))

})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const {userId} = req.params;
    const tweet = await Tweet.aggregate([
        {$match:{ owner :new mongoose.Types.ObjectId(userId) }
    },
    {
        $lookup:{
            from:"users",
            localField:"owner",
            foreignField:"_id",
            as:"ownerDetails",
            pipeline:[
                {
                    $project:{
                        _id:1,
                        username:1,
                        avatar:1
                    }
                }
            ]
        }
    },
    {
        $unwind:"$ownerDetails"    
    }
    ])

    return res
    .status(200)
    .json(new ApiResponse(200,tweet,"success to fetch tweets of a user"))
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {content} = req.body
    const {tweetId} = req.params;

    if(!content){
        throw new ApiError(400,"content is required")
    }

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400,"tweet id is not valid")
    }
    const tweet = await Tweet.findByIdAndUpdate(tweetId,{
        content
    },{new:true})
    if(!tweet){
        throw new ApiError(500,"tweet not found")
    }
    return res
    .status(200)
    .json(new ApiResponse(200, tweet , "success updated tweet"))
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    
    const {tweetId} = req.params;
    if(!isValidObjectId(tweetId)){
        throw new ApiError(400,"tweet id is not valid")
    }
    const tweet = await Tweet.findByIdAndDelete(tweetId)
    if(!tweet){
        throw new ApiError(500,"tweet not found")
    }
    return res
    .status(200)
    .json(new ApiResponse(200 , "success delete tweet"))

})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}