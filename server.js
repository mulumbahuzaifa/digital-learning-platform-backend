const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const http = require("http"); // Added for Socket.IO
const { ErrorResponse, errorHandler } = require("./middleware/error");
const config = require("./config/config");
const setupWebSocket = require("./config/websocket");

// Load env vars
dotenv.config();

// Create Express app
const app = express();

// Connect to DB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

// Initialize HTTP server
const server = http.createServer(app);

// Socket.IO setup
const io = require("socket.io")(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// Socket.IO connection handler
io.on("connection", (socket) => {
  console.log(`New client connected: ${socket.id}`);

  // Join room based on user role/ID
  socket.on("joinRoom", (room) => {
    socket.join(room);
    console.log(`User joined room: ${room}`);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });

  // Add more event handlers as needed
});

// Make io accessible to routes
app.set("io", io);

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Set static folder
app.use(express.static(path.join(__dirname, "public")));

// Swagger
const setupSwagger = require("./config/swagger");
setupSwagger(app);

// Mount routers
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/classes", require("./routes/classRoutes"));
app.use("/api/subjects", require("./routes/subjectRoutes"));
app.use("/api/content", require("./routes/contentRoutes"));
app.use("/api/assignments", require("./routes/assignmentRoutes"));
app.use("/api/submissions", require("./routes/submissionRoutes"));
app.use("/api/messages", require("./routes/messageRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/calendar", require("./routes/calendarRoutes"));
app.use("/api/feedback", require("./routes/feedbackRoutes"));
app.use("/api/gradebook", require("./routes/gradebookRoutes"));
app.use("/api/attendance", require("./routes/attendanceRoutes"));
app.use("/api/live-sessions", require("./routes/liveSessionRoutes"));
app.use("/api/enrollments", require("./routes/enrollmentRoutes"));
// Error handling middleware
app.use(errorHandler);

// Setup WebSocket
const ws = setupWebSocket(server);

// Make WebSocket instance available globally
app.set("ws", ws);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  // Changed from app.listen to server.listen
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  process.exit(1);
});
