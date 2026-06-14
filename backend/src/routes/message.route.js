import express from "express";
import {
  blockUser,
  deleteMessage,
  editMessage,
  getConversationsForSidebar,
  getMediaGallery,
  getMessages,
  getUsersForSidebar,
  markMessagesAsRead,
  searchMessages,
  searchUsers,
  sendMessage,
  toggleReaction,
  unblockUser,
} from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();

router.use(protectRoute);

router.get("/users/search", searchUsers);
router.get("/users", getUsersForSidebar);
router.get("/conversations", getConversationsForSidebar);
router.get("/search/:userId", searchMessages);
router.get("/media/:userId", getMediaGallery);
router.get("/:id", getMessages);
router.patch("/:id", editMessage);
router.patch("/read/:id", markMessagesAsRead);
router.delete("/:id", deleteMessage);
router.post("/send/:id", upload.single("media"), sendMessage);
router.post("/block/:id", blockUser);
router.post("/unblock/:id", unblockUser);
router.post("/react/:id", toggleReaction);

export default router;
