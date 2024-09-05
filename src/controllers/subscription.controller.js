import mongoose, { isValidObjectId } from "mongoose"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    const userId = req.user._id

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channelId")
    }
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid userId")
    }
    const subscription = await Subscription.findOne({
        subscriber: userId,
        channel: channelId
    })
    if (subscription) {
        await Subscription.deleteOne({
            subscriber: userId,
            channel: channelId
        })
        return res.status(200).json(new ApiResponse(200, {}, "unsubscribed"));
    } else {
        const subscribe = await Subscription.create({
            subscriber: userId,
            channel: channelId
        })
        return res.status(200).json(new ApiResponse(200, subscribe, "subscribed"));
    }

})

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

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
                _id: 1, 
                subscriberId: "$subscriberDetails._id",
                username: "$subscriberDetails.username",
                email: "$subscriberDetails.email",
                avatar: "$subscriberDetails.avatar"
            }
        }
    ]);

    res.status(200).json(new ApiResponse(200, subscribers, "Subscribers retrieved successfully"));
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Invalid subscriber id")
    }
    const channelsToSubscribe = await Subscription.aggregate([
        {
            $match: { subscriber: new mongoose.Types.ObjectId(subscriberId) }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channelDetails",
                pipeline: (
                    [
                        {
                            $project: {
                                _id: 1,
                                username: 1,
                                email: 1,
                                avatar: 1,

                            }
                        }
                    ]
                )
            }
        },
        {
            $unwind: "$channelDetails"
        }

    ])
    return res
        .status(200)
        .json(new ApiResponse(200, channelsToSubscribe, "channel retrieved successfully"))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}