const mongoose = require("mongoose");
const crypto = require("crypto");

const LiveSessionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please add a title"],
      trim: true,
      maxlength: [100, "Title cannot be more than 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot be more than 500 characters"],
    },
    teacher: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    class: {
      type: mongoose.Schema.ObjectId,
      ref: "Class",
      required: true,
    },
    subject: {
      type: mongoose.Schema.ObjectId,
      ref: "Subject",
      required: true,
    },
    startTime: {
      type: Date,
      required: [true, "Please add a start time"],
    },
    duration: {
      type: Number,
      required: [true, "Please add duration in minutes"],
      min: [1, "Duration must be at least 1 minute"],
      max: [480, "Duration cannot exceed 8 hours"],
    },
    status: {
      type: String,
      enum: ["scheduled", "live", "ended"],
      default: "scheduled",
    },
    meetingId: {
      type: String,
      unique: true,
    },
    meetingPassword: {
      type: String,
    },
    meetingUrl: {
      type: String,
    },
    participants: [
      {
        user: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    recordingUrl: {
      type: String,
    },
    chat: [
      {
        user: {
          type: mongoose.Schema.ObjectId,
          ref: "User",
        },
        message: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    settings: {
      enableChat: {
        type: Boolean,
        default: true,
      },
      enableRecording: {
        type: Boolean,
        default: true,
      },
      enableScreenSharing: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Generate meeting ID and password before saving
LiveSessionSchema.pre("save", function (next) {
  if (!this.meetingId) {
    this.meetingId = crypto.randomBytes(16).toString("hex");
  }
  if (!this.meetingPassword) {
    this.meetingPassword = crypto.randomBytes(4).toString("hex");
  }
  next();
});

// Virtual for end time
LiveSessionSchema.virtual("endTime").get(function () {
  return new Date(this.startTime.getTime() + this.duration * 60000);
});

// Virtual for checking if session is active
LiveSessionSchema.virtual("isActive").get(function () {
  const now = new Date();
  return (
    this.status === "live" ||
    (this.status === "scheduled" &&
      now >= this.startTime &&
      now <= this.endTime)
  );
});

// Method to add participant
LiveSessionSchema.methods.addParticipant = function (userId) {
  if (!this.participants.some((p) => p.user.toString() === userId.toString())) {
    this.participants.push({ user: userId });
  }
};

// Method to remove participant
LiveSessionSchema.methods.removeParticipant = function (userId) {
  this.participants = this.participants.filter(
    (p) => p.user.toString() !== userId.toString()
  );
};

// Method to add chat message
LiveSessionSchema.methods.addChatMessage = function (userId, message) {
  this.chat.push({
    user: userId,
    message,
  });
};

// Create index for efficient querying
LiveSessionSchema.index({ startTime: 1, status: 1 });
LiveSessionSchema.index({ teacher: 1, status: 1 });
LiveSessionSchema.index({ class: 1, subject: 1 });

module.exports = mongoose.model("LiveSession", LiveSessionSchema);
