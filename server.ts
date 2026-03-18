import express from "express";
import { createServer as createViteServer } from "vite";
import { Server } from "socket.io";
import { createServer } from "http";
import path from "path";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = createServer(app);

  let allowedOrigins: string[] | string = "*";
  try {
    const configPath = path.join(process.cwd(), "config.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (config.allowedOrigins && Array.isArray(config.allowedOrigins)) {
        allowedOrigins = config.allowedOrigins;
        console.log("Loaded allowed origins from config:", allowedOrigins);
      }
    }
  } catch (e) {
    console.error("Failed to load config.json", e);
  }

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"]
    }
  });

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Socket.io Signaling
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("create-room", (roomId) => {
      socket.join(roomId);
      console.log(`Room created: ${roomId}`);
    });

    socket.on("join-room", (roomId) => {
      const room = io.sockets.adapter.rooms.get(roomId);
      if (room && room.size > 0) {
        socket.join(roomId);
        console.log(`User joined room: ${roomId}`);
        socket.to(roomId).emit("user-joined", socket.id);
      } else {
        socket.emit("room-not-found");
      }
    });

    socket.on("offer", (payload) => {
      io.to(payload.target).emit("offer", { ...payload, sender: socket.id });
    });

    socket.on("answer", (payload) => {
      io.to(payload.target).emit("answer", { ...payload, sender: socket.id });
    });

    socket.on("ice-candidate", (payload) => {
      io.to(payload.target).emit("ice-candidate", { ...payload, sender: socket.id });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
