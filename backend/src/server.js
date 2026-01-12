// src/server.js
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import setupSockets from "./socket/index.js";

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});


const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
  },
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

setupSockets(io);

httpServer.listen(3000, () => {
  console.log("Backend running on port 3000");
});
