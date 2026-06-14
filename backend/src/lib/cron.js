import { CronJob } from "cron";
import http from "node:http";
import https from "node:https";

const BACKEND_URL = process.env.BACKEND_URL || process.env.FRONTEND_URL;

const job = new CronJob("*/14 * * * *", function () {
  if (!BACKEND_URL) return;
  const url = new URL("/health", BACKEND_URL).href;
  const client = url.startsWith("https:") ? https : http;

  client
    .get(url, (res) => {
      if (res.statusCode === 200) console.log("GET request sent successfully");
      else console.log("GET request failed", res.statusCode);
    })
    .on("error", (e) => console.error("Error while sending request", e));
});

export default job;
