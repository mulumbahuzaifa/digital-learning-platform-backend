const WebSocket = require("ws");
const jwt = require("jsonwebtoken");
const config = require("./config");

function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server });

  // Store connected clients
  const clients = new Map();

  // Authentication middleware
  wss.on("connection", async (ws, req) => {
    try {
      // Get token from query string
      const token = req.url.split("token=")[1];
      if (!token) {
        ws.close(1008, "Authentication required");
        return;
      }

      // Verify token
      const decoded = jwt.verify(token, config.jwt.secret);
      const userId = decoded.id;

      // Store client connection
      clients.set(userId, ws);

      // Send initial connection success
      ws.send(
        JSON.stringify({
          type: "connection",
          status: "connected",
          userId,
        })
      );

      // Handle messages
      ws.on("message", (message) => {
        try {
          const data = JSON.parse(message);
          handleMessage(userId, data);
        } catch (error) {
          console.error("WebSocket message error:", error);
        }
      });

      // Handle disconnection
      ws.on("close", () => {
        clients.delete(userId);
      });
    } catch (error) {
      console.error("WebSocket connection error:", error);
      ws.close(1008, "Authentication failed");
    }
  });

  // Message handler
  function handleMessage(userId, data) {
    switch (data.type) {
      case "join_session":
        // Handle joining a live session
        break;
      case "leave_session":
        // Handle leaving a live session
        break;
      case "chat_message":
        // Handle chat messages
        break;
      default:
        console.warn("Unknown message type:", data.type);
    }
  }

  // Broadcast to specific users
  function broadcastToUsers(userIds, message) {
    userIds.forEach((userId) => {
      const client = clients.get(userId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  // Broadcast to all clients
  function broadcastToAll(message) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  return {
    broadcastToUsers,
    broadcastToAll,
  };
}

module.exports = setupWebSocket;
