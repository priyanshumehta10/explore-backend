import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    const userId = req.user._id
    // TODO: toggle subscription
    if(!isValidObjectId(channelId)){
        throw new ApiError(400,"Invalid channelId")
    }
    if(!isValidObjectId(userId)){
        throw new ApiError(400,"Invalid userId")
    }
    const subscription = await Subscription.find({
        subscriber:userId,
        channel:channelId
    })
    if(!subscription){
        await Subscription.deleteOne({
            subscriber:userId,
            channel:channelId
        })
        return res.status(200).json(new ApiResponse(200, {}, "unsubscribed"));
    } else {
        const subscribe = await Subscription.create({
            subscriber:userId,
            channel:channelId
        })
        return res.status(200).json(new ApiResponse(200, subscribe, "subscribed"));
    }

})

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params;
    
    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel id");
    }
    
    const subscribers = await Subscription.aggregate([
        {
            $match: { channel: new mongoose.Types.ObjectId(channelId) }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberDetails"
            }
        },
        {
            $unwind: "$subscriberDetails"
        },
        {
            $project: {
                _id: 1, // exclude subscription _id
                "subscriberDetails._id": 1, // include subscriber's user _id
                "subscriberDetails.username": 1, // include subscriber's name
                "subscriberDetails.email": 1 ,
                "subscriberDetails.avatar":1// include subscriber's email
                // add more fields as needed
            }
        }
    ]);

    res.status(200).json(new ApiResponse(200, "Subscribers retrieved successfully", subscribers));
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(400,"Invalid subscriber id")
    }
    const channelsToSubscribe = await Subscription.aggregate([
        {
            $match: {subscriber: new mongoose.Types.ObjectId(subscriberId)}
        },
        {
            $lookup:{
                from:"users",
                localField:"channel",
                foreignField:"_id",
                as:"channelDetails",
                pipeline:(
                    [
                        {
                            $project:{
                                _id: 1,
                                username:1,
                                email:1,
                                avatar:1,

                            }
                        }
                    ]
                )
            }
        },
        {
            $unwind:"$channelDetails"
        }
        
    ])
    return res
    .status(200)
    .json(new ApiResponse(200,channelsToSubscribe,"channel retrieved successfully"))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}