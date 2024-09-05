import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

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
    const { content } = req.body;
    const { tweetId } = req.params;

    if (!content) {
        throw new ApiError(400, "Content is required");
    }

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Tweet ID is not valid");
    }

    // Update the tweet
    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        { content },
        { new: true }
    );

    if (!updatedTweet) {
        throw new ApiError(404, "Tweet not found");
    }

    // Use aggregation to fetch the updated tweet with user details
    const tweetWithUserDetails = await Tweet.aggregate([
        { $match: { _id: updatedTweet._id } },
        {
            $lookup: {
                from: "users", // The name of the users collection
                localField: "owner", // The field in tweets that references the user
                foreignField: "_id", // The field in users that matches localField
                as: "userDetails" // The name of the field to add with user data
            }
        },
        {
            $unwind: "$userDetails" // Flatten the array of userDetails
        },
        {
            $project: {
                content: 1, // Include the content field
                avatar:"$userDetails.avatar",
                username:"$userDetails.username",
                owner: "$userDetails._id",
                createdAt:1
            }
        }
    ]);

    if (!tweetWithUserDetails || tweetWithUserDetails.length === 0) {
        throw new ApiError(500, "Failed to fetch tweet with user details");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, tweetWithUserDetails[0], "Successfully updated tweet"));
});

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

const getAllTweets = asyncHandler(async (req, res) => {
    // TODO: get all tweets
    const tweets = await Tweet.aggregate([
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
            }
        },
        {
            $unwind: "$ownerDetails"
        },
        {
            $project:{
                content:1,
                createdAt:1,
                owner:1,
                _id:1,
                owner_id: "$ownerDetails._id",
                username: "$ownerDetails.username",
                email: "$ownerDetails.email",
                avatar:"$ownerDetails.avatar"
            }
        },
        {
            $sort: { createdAt: -1 } // Optionally, sort tweets by creation date in descending order
        }
    ]);

    if (!tweets || tweets.length === 0) {
        throw new ApiError(404, "No tweets found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, tweets, "Successfully fetched all tweets"));
});
export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet,
    getAllTweets
}