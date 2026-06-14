import express from "express";
import { checkAuth, updateProfile } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/check", protectRoute, checkAuth);
router.put("/profile", protectRoute, updateProfile);

export default router;