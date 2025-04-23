const mongoose = require("mongoose");

/**
 * @swagger
 * components:
 *   schemas:
 *     Feedback:
 *       type: object
 *       required:
 *         - content
 *         - fromUser
 *         - feedbackType
 *       properties:
 *         content:
 *           type: string
 *           description: Feedback content
 *         rating:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *         fromUser:
 *           type: string
 *           format: objectId
 *           description: User providing feedback
 *         toUser:
 *           type: string
 *           format: objectId
 *           description: User receiving feedback (optional)
 *         class:
 *           type: string
 *           format: objectId
 *         subject:
 *           type: string
 *           format: objectId
 *         contentItem:
 *           type: string
 *           format: objectId
 *         feedbackType:
 *           type: string
 *           enum: [teacher, student, content, assignment, platform, system]
 *         isAnonymous:
 *           type: boolean
 *           default: false
 *         status:
 *           type: string
 *           enum: [submitted, reviewed, actioned, resolved]
 *           default: submitted
 *         response:
 *           type: string
 *         respondedBy:
 *           type: string
 *           format: objectId
 *         respondedAt:
 *           type: string
 *           format: date-time
 */

const FeedbackSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
  },

  // Relationships
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Class",
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
  },
  contentItem: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "contentType",
  },
  contentType: {
    type: String,
    enum: ["Content", "Assignment"],
  },

  // Feedback details
  feedbackType: {
    type: String,
    enum: ["teacher", "student", "content", "assignment", "platform", "system"],
    required: true,
  },
  isAnonymous: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ["submitted", "reviewed", "actioned", "resolved"],
    default: "submitted",
  },
  response: { type: String },
  respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  respondedAt: { type: Date },

  // System
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Feedback", FeedbackSchema);
