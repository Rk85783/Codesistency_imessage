import mongoose from "mongoose";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import { hasImageKitConfig, uploadChatMedia } from "../lib/imagekit.js";
import { getUserSocketIds, io } from "../lib/socket.js";

const MESSAGES_PER_PAGE = 50;

export async function getUsersForSidebar(req, res) {
  try {
    const loggedInUserId = req.user._id;

    const currentUser = await User.findById(loggedInUserId).select("blockedUsers");
    const blockedByMe = currentUser.blockedUsers || [];

    const blockedMeRecords = await User.find({ blockedUsers: loggedInUserId }).select("_id");
    const blockedMe = blockedMeRecords.map((u) => u._id);

    const excludeIds = [loggedInUserId, ...blockedByMe, ...blockedMe];

    const filteredUsers = await User.find({ _id: { $nin: excludeIds } }).select("-clerkId");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getConversationsForSidebar(req, res) {
  try {
    const loggedInUserId = req.user._id;

    const currentUser = await User.findById(loggedInUserId).select("blockedUsers");
    const blockedByMe = currentUser.blockedUsers || [];

    const blockedMeRecords = await User.find({ blockedUsers: loggedInUserId }).select("_id");
    const blockedMe = blockedMeRecords.map((u) => u._id);

    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $match: {
          senderId: { $nin: [...blockedByMe, ...blockedMe] },
          receiverId: { $nin: [...blockedByMe, ...blockedMe] },
        },
      },
      {
        $group: {
          _id: { $cond: [{ $eq: ["$senderId", loggedInUserId] }, "$receiverId", "$senderId"] },
          lastMessageAt: { $first: "$createdAt" },
          lastMessage: {
            $first: {
              $cond: [
                { $ne: ["$text", null] },
                "$text",
                {
                  $cond: [
                    { $ne: ["$image", null] },
                    "📷 Photo",
                    { $cond: [{ $ne: ["$video", null] }, "🎥 Video", null] },
                  ],
                },
              ],
            },
          },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$receiverId", loggedInUserId] }, { $eq: ["$read", false] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { lastMessageAt: -1 } },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: false } },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: [
              "$user",
              { lastMessageAt: "$lastMessageAt" },
              { lastMessage: "$lastMessage" },
              { unreadCount: "$unreadCount" },
            ],
          },
        },
      },
      { $project: { clerkId: 0 } },
    ]);

    res.status(200).json(conversations);
  } catch (error) {
    console.error("Error in getConversationsForSidebar:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getMessages(req, res) {
  try {
    const { id: userToChatId } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || MESSAGES_PER_PAGE));

    if (!mongoose.Types.ObjectId.isValid(userToChatId)) {
      res.status(400).json({ message: "Invalid user ID" });
      return;
    }

    const myId = req.user._id;

    const [currentUserDoc, otherUserDoc] = await Promise.all([
      User.findById(myId).select("blockedUsers"),
      User.findById(userToChatId).select("blockedUsers"),
    ]);

    const iBlockedThem = currentUserDoc.blockedUsers?.some((id) => id.equals(userToChatId));
    const theyBlockedMe = otherUserDoc?.blockedUsers?.some((id) => id.equals(myId));

    if (iBlockedThem || theyBlockedMe) {
      res.status(200).json({ messages: [], hasMore: false, page, total: 0 });
      return;
    }

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      Message.find({
        $or: [
          { senderId: myId, receiverId: userToChatId },
          { senderId: userToChatId, receiverId: myId },
        ],
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("replyTo"),

      Message.countDocuments({
        $or: [
          { senderId: myId, receiverId: userToChatId },
          { senderId: userToChatId, receiverId: myId },
        ],
      }),
    ]);

    messages.reverse();

    res.status(200).json({
      messages,
      hasMore: skip + limit < total,
      page,
      total,
    });
  } catch (error) {
    console.error("Error in getMessages:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function searchMessages(req, res) {
  try {
    const { userId } = req.params;
    const { q } = req.query;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ message: "Invalid user ID" });
      return;
    }

    if (!q || !q.trim()) {
      res.status(400).json({ message: "Search query is required" });
      return;
    }

    const myId = req.user._id;
    const escapedQuery = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userId },
        { senderId: userId, receiverId: myId },
      ],
      text: { $regex: escapedQuery, $options: "i" },
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("replyTo");

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in searchMessages:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function markMessagesAsRead(req, res) {
  try {
    const { id: otherUserId } = req.params;
    const myId = req.user._id;

    await Message.updateMany(
      { senderId: otherUserId, receiverId: myId, read: false },
      { read: true },
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error in markMessagesAsRead:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function sendMessage(req, res) {
  try {
    const { text, replyTo } = req.body;
    const { id: receiverId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      res.status(400).json({ message: "Invalid receiver ID" });
      return;
    }

    const senderId = req.user._id;

    const receiver = await User.findById(receiverId).select("blockedUsers");
    if (receiver && receiver.blockedUsers && receiver.blockedUsers.some((id) => id.equals(senderId))) {
      res.status(403).json({ message: "You have been blocked by this user" });
      return;
    }

    let imageUrl;
    let videoUrl;

    if (req.file) {
      if (!hasImageKitConfig()) {
        res.status(500).json({ message: "Media upload is not configured" });
        return;
      }

      const url = await uploadChatMedia(req.file);
      if (req.file.mimetype.startsWith("video/")) videoUrl = url;
      else imageUrl = url;
    }

    if (!text && !imageUrl && !videoUrl) {
      res.status(400).json({ message: "Message must have text or media" });
      return;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      video: videoUrl,
      replyTo: replyTo || null,
    });

    await newMessage.save();

    const populated = await Message.populate(newMessage, { path: "replyTo" });

    const receiverSocketIds = getUserSocketIds(receiverId);
    for (const socketId of receiverSocketIds) {
      io.to(socketId).emit("newMessage", populated.toJSON());
    }

    const senderSocketIds = getUserSocketIds(senderId);
    for (const socketId of senderSocketIds) {
      io.to(socketId).emit("newMessage", populated.toJSON());
    }

    res.status(201).json(populated);
  } catch (error) {
    console.error("Error in sendMessage:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function editMessage(req, res) {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid message ID" });
      return;
    }

    const message = await Message.findById(id);
    if (!message) {
      res.status(404).json({ message: "Message not found" });
      return;
    }

    if (message.senderId.toString() !== userId.toString()) {
      res.status(403).json({ message: "Not authorized to edit this message" });
      return;
    }

    if (message.isDeleted) {
      res.status(400).json({ message: "Cannot edit a deleted message" });
      return;
    }

    message.text = text;
    message.editedAt = new Date();
    await message.save();

    const populated = await Message.populate(message, { path: "replyTo" });

    const receiverSocketIds = getUserSocketIds(message.receiverId);
    for (const socketId of receiverSocketIds) {
      io.to(socketId).emit("messageEdited", populated.toJSON());
    }

    const senderSocketIds = getUserSocketIds(userId);
    for (const socketId of senderSocketIds) {
      io.to(socketId).emit("messageEdited", populated.toJSON());
    }

    res.status(200).json(populated);
  } catch (error) {
    console.error("Error in editMessage:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteMessage(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid message ID" });
      return;
    }

    const message = await Message.findById(id);
    if (!message) {
      res.status(404).json({ message: "Message not found" });
      return;
    }

    if (message.senderId.toString() !== userId.toString()) {
      res.status(403).json({ message: "Not authorized to delete this message" });
      return;
    }

    message.isDeleted = true;
    message.text = null;
    message.image = null;
    message.video = null;
    await message.save();

    const receiverSocketIds = getUserSocketIds(message.receiverId);
    for (const socketId of receiverSocketIds) {
      io.to(socketId).emit("messageDeleted", { messageId: id });
    }

    const senderSocketIds = getUserSocketIds(userId);
    for (const socketId of senderSocketIds) {
      io.to(socketId).emit("messageDeleted", { messageId: id });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error in deleteMessage:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function searchUsers(req, res) {
  try {
    const { q } = req.query;

    if (!q || !q.trim()) {
      res.status(200).json([]);
      return;
    }

    const escapedQuery = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { fullName: { $regex: escapedQuery, $options: "i" } },
        { email: { $regex: escapedQuery, $options: "i" } },
      ],
    })
      .select("-clerkId")
      .limit(20);

    res.status(200).json(users);
  } catch (error) {
    console.error("Error in searchUsers:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function blockUser(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid user ID" });
      return;
    }

    await User.findByIdAndUpdate(req.user._id, { $addToSet: { blockedUsers: id } });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error in blockUser:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function unblockUser(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid user ID" });
      return;
    }

    await User.findByIdAndUpdate(req.user._id, { $pull: { blockedUsers: id } });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error in unblockUser:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function toggleReaction(req, res) {
  try {
    const { id } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid message ID" });
      return;
    }

    if (!emoji || !emoji.trim()) {
      res.status(400).json({ message: "Emoji is required" });
      return;
    }

    const message = await Message.findById(id);
    if (!message) {
      res.status(404).json({ message: "Message not found" });
      return;
    }

    const existingIndex = message.reactions.findIndex(
      (r) => r.emoji === emoji && r.userId.toString() === userId.toString(),
    );

    if (existingIndex > -1) {
      message.reactions.splice(existingIndex, 1);
    } else {
      message.reactions.push({ emoji, userId });
    }

    await message.save();

    const populated = await Message.populate(message, { path: "reactions.userId replyTo" });

    const receiverSocketIds = getUserSocketIds(
      message.senderId.toString() === userId.toString() ? message.receiverId : message.senderId,
    );
    for (const socketId of receiverSocketIds) {
      io.to(socketId).emit("messageReacted", populated.toJSON());
    }

    const senderSocketIds = getUserSocketIds(userId);
    for (const socketId of senderSocketIds) {
      io.to(socketId).emit("messageReacted", populated.toJSON());
    }

    res.status(200).json(populated);
  } catch (error) {
    console.error("Error in toggleReaction:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getMediaGallery(req, res) {
  try {
    const { userId } = req.params;
    const myId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      res.status(400).json({ message: "Invalid user ID" });
      return;
    }

    const messages = await Message.find({
      $and: [
        {
          $or: [
            { senderId: myId, receiverId: userId },
            { senderId: userId, receiverId: myId },
          ],
        },
        { $or: [{ image: { $ne: null } }, { video: { $ne: null } }] },
        { isDeleted: { $ne: true } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .select("_id image video createdAt");

    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getMediaGallery:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
