import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import { response } from "express";

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave:false})
        return {accessToken,refreshToken}
    } catch (error) {
        throw new ApiError(500,"something went wrong while generating access and refresh tokens")
    }
}

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
    // const coverImageLocalPath = req.files?.coverImage[0]?.path
    
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    
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
const loginUser = asyncHandler(async (req,res)=>{
    const {username,email,password} = req.body
    console.log(email);
    console.log(password);
    console.log(req.body);

    if (!username && !email) {
        throw new ApiError(400,"username or email is required")
    }

    const user = await User.findOne({
        $or: [{email},{username}]
    })
    if(!user){
        throw new ApiError(404,"user not found")
    }
    const isUserValid = await user.isPasswordCorrect(password)
    if (!isUserValid) {
        throw new ApiError(401,"user credentials not valid")
    }
    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)
    const loggedInUser = await User
    .findById(user._id)
    .select("-password -refreshToken")
    const options = {
        httpOnly: true,
        secure:true
    }
    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(new ApiResponse(200,
        {
            user: loggedInUser,accessToken,refreshToken
        },
        "user logged in successfully"
    ))
})
const logoutUser =asyncHandler(async (req, res) => {
    User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{refreshToken:undefined}
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure:true
    }
    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"user logged out succefully"));
})
const refreshAccessToken =asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.header.refreshToken
    if (!incomingRefreshToken) {
        throw new ApiError(401,"unautherized request")
    }
    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        const user = await User.findById(decodedToken?._id)
        if (!user) {
            throw new ApiError(401,"invalid refresh token")
        }
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401,"refresh token is expired")
        }
        const {accessToken,newRefreshToken}=await generateAccessAndRefreshToken(user._id)
        const options = {
            httpOnly: true,
            secure: true
        }
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("RefreshToken",newRefreshToken,options)
        .json(new ApiResponse(
            200,
            {
                accessToken,refreshToken:newRefreshToken
            },"access token refreshed"
        ))
    } catch (error) {
        throw new ApiError(401,error?.message||"invalid refresh token")
    }
})
export {registerUser,loginUser,logoutUser,refreshAccessToken}