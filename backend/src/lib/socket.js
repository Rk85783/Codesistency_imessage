import express from "express";
import http from "http";
import { Server } from "socket.io";
import { verifyToken } from "@clerk/backend";
import User from "../models/user.model.js";

const app = express();
const server = http.createServer(app);

const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";

const io = new Server(server, { cors: { origin: [allowedOrigin] } });

const userSocketMap = new Map();

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error("Authentication required"));
  }
  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    const clerkUserId = payload.sub;
    const user = await User.findOne({ clerkId: clerkUserId }).select("_id");
    if (!user) {
      return next(new Error("User not found"));
    }
    socket.mongoUserId = String(user._id);
    next();
  } catch (err) {
    console.error("Socket auth error:", err);
    next(new Error("Invalid token"));
  }
});

function getReceiverSocketId(userId) {
  const sockets = userSocketMap.get(userId);
  if (!sockets || sockets.size === 0) return null;
  return [...sockets][0];
}

function getUserSocketIds(userId) {
  const sockets = userSocketMap.get(userId);
  return sockets ? [...sockets] : [];
}

function getOnlineUserIds() {
  const ids = [];
  for (const [id, sockets] of userSocketMap) {
    if (sockets.size > 0) ids.push(id);
  }
  return ids;
}

io.on("connection", (socket) => {
  const userId = socket.mongoUserId;

  if (userId) {
    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, new Set());
    }
    userSocketMap.get(userId).add(socket.id);
  }

  io.emit("getOnlineUsers", getOnlineUserIds());

  socket.on("typing:start", ({ receiverId }) => {
    if (!receiverId) return;
    const receiverSocketIds = getUserSocketIds(receiverId);
    for (const socketId of receiverSocketIds) {
      io.to(socketId).emit("typing", { senderId: userId });
    }
  });

  socket.on("typing:stop", ({ receiverId }) => {
    if (!receiverId) return;
    const receiverSocketIds = getUserSocketIds(receiverId);
    for (const socketId of receiverSocketIds) {
      io.to(socketId).emit("stopTyping", { senderId: userId });
    }
  });

  socket.on("markAsRead", ({ conversationId }) => {
    if (!conversationId) return;
    const partnerSocketIds = getUserSocketIds(conversationId);
    for (const socketId of partnerSocketIds) {
      io.to(socketId).emit("markAsRead", { senderId: userId });
    }
  });

  socket.on("disconnect", () => {
    if (userId) {
      const sockets = userSocketMap.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSocketMap.delete(userId);
        }
      }
    }
    io.emit("getOnlineUsers", getOnlineUserIds());
  });
});

export { app, server, io, getReceiverSocketId, getUserSocketIds };
