const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

const sessions = new Map();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/sessions", (req, res) => {
  const game = req.body?.game;

  if (!["clash-royale", "pokemon-go"].includes(game)) {
    return res.status(400).json({ error: "Unsupported game" });
  }

  const id = crypto.randomUUID();

  const session = {
    id,
    game,
    state: "starting",
    createdAt: Date.now()
  };

  sessions.set(id, session);

  setTimeout(() => {
    const current = sessions.get(id);
    if (current) {
      current.state = "ready";
      broadcast(id, {
        type: "session",
        state: "ready",
        game: current.game
      });
    }
  }, 1500);

  res.json({
    id,
    game,
    state: session.state
  });
});

app.delete("/api/sessions/:id", (req, res) => {
  sessions.delete(req.params.id);
  res.json({ ok: true });
});

app.get("/api/sessions/:id", (req, res) => {
  const session = sessions.get(req.params.id);

  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  res.json(session);
});

function broadcast(id, message) {
  wss.clients.forEach((client) => {
    if (
      client.readyState === WebSocket.OPEN &&
      client.sessionId === id
    ) {
      client.send(JSON.stringify(message));
    }
  });
}

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url, "http://localhost");
  const sessionId = url.searchParams.get("session");

  if (!sessionId || !sessions.has(sessionId)) {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    ws.sessionId = sessionId;

    ws.send(
      JSON.stringify({
        type: "session",
        state: sessions.get(sessionId).state
      })
    );

    wss.emit("connection", ws, request);
  });
});

wss.on("connection", (ws) => {
  ws.on("message", (data) => {
    // Reserved for future Android streaming/input messages.
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Cloud Game Phone running on port ${PORT}`);
});
