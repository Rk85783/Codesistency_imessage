import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import "dotenv/config";
import fs from "fs";
import path from "path";

import { clerkMiddleware } from "@clerk/express";
import { connectDB } from "./lib/db.js";
import job from "./lib/cron.js";

import clerkWebhook from "./webhooks/clerk.webhook.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { app, server } from "./lib/socket.js";

const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const publicDir = path.join(process.cwd(), "public");

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later" },
});

app.use("/api/webhooks/clerk", express.raw({ type: "application/json" }), clerkWebhook);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "1mb" }));
app.use(cors({ origin: FRONTEND_URL, credentials: true }));

function mongoSanitize(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(mongoSanitize);
  return Object.fromEntries(
    Object.entries(obj).flatMap(([key, value]) =>
      key.startsWith("$") ? [] : [[key, mongoSanitize(value)]]
    )
  );
}

app.use((req, _res, next) => {
  if (req.body) req.body = mongoSanitize(req.body);
  next();
});

app.use("/api", apiLimiter);
app.use(clerkMiddleware());

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));

  app.get("*", (req, res, next) => {
    res.sendFile(path.join(publicDir, "index.html"), (err) => next(err));
  });
}

app.use((err, req, res, _next) => {
  console.error("Unhandled error:", err);

  if (err.name === "MulterError") {
    res.status(400).json({ message: err.message });
    return;
  }

  if (err.type === "entity.too.large") {
    res.status(413).json({ message: "Request body too large" });
    return;
  }

  res.status(err.status || 500).json({ message: err.message || "Internal server error" });
});

async function start() {
  await connectDB();
  server.listen(PORT, () => {
    console.log("Server is up and running on PORT:", PORT);
    if (process.env.NODE_ENV === "production") job.start();
  });
}

start();
