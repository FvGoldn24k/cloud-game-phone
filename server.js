const express = require("express");
const http = require("http");
const path = require("path");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);

const sessions = new Map();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "Cloud Game Phone"
  });
});

app.post("/api/sessions", (req, res) => {
  const game = req.body?.game;

  if (!["clash-royale", "pokemon-go"].includes(game)) {
    return res.status(400).json({
      error: "Unsupported game"
    });
  }

  const id = crypto.randomUUID();

  const session = {
    id,
    game,
    state: "waiting-for-android",
    createdAt: Date.now()
  };

  sessions.set(id, session);

  res.json(session);
});

app.get("/api/sessions/:id", (req, res) => {
  const session = sessions.get(req.params.id);

  if (!session) {
    return res.status(404).json({
      error: "Session not found"
    });
  }

  res.json(session);
});

app.delete("/api/sessions/:id", (req, res) => {
  sessions.delete(req.params.id);

  res.json({
    ok: true
  });
});

app.get("/api/gateway", (req, res) => {
  res.json({
    configured: Boolean(process.env.ANDROID_GATEWAY),
    gateway: process.env.ANDROID_GATEWAY || null
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Cloud Game Phone running on port ${PORT}`
  );
});
