import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const registerUser = asyncHandler(async (req,res)=>{
    const {username,email,fullName,password}=req.body
    if(
        [username,email,fullName,password].some((field)=>field?.trim() === "")
    ){
        throw new ApiError(400,"all fields are required")
    }
    const existedUser = await User.findOne({
        $or:[{username},{email}]
})
    if(existedUser){
        throw new ApiError(409,"user with this email or username already exists")
    }
    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0]?.path
    if (!avatarLocalPath){
        throw new ApiError(400,"avatar file is required")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    
    if (!avatar){
        throw new ApiError(400,"avatar file is required")
    }
    const user = await User.create({
        username:username.toLowerCase(),
        email,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        password,
        fullName
    })
    const createdUser = await User.findById(user._id).select("-password -refreshToken")
    if (!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user")
    }
    return res.status(201).json(new ApiResponse(200,createdUser,"user registered successfully"))
})

export {registerUser}