import { Router } from 'express';
import {
    getLikedVideos,
    toggleCommentLike,
    toggleVideoLike,
    toggleTweetLike,
    getMostLikedTweets,
    isVideoLiked,
    isCommentLiked,
    isTweetLiked,
    getLikeCount,
} from "../controllers/like.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/toggle/v/:videoId").post(toggleVideoLike);
router.route("/toggle/c/:commentId").post(toggleCommentLike);
router.route("/toggle/t/:tweetId").post(toggleTweetLike);
router.route("/videos").get(getLikedVideos);
router.route('/topLiked').get(getMostLikedTweets);

// New routes to check if an item is liked by the current user
router.route("/isLiked/v/:videoId").get(isVideoLiked);
router.route("/isLiked/c/:commentId").get(isCommentLiked);
router.route("/isLiked/t/:tweetId").get(isTweetLiked);
router.route("/count/:type/:id").get(getLikeCount);

export default router;
