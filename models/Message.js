const mongoose = require("mongoose");

/**
 * @swagger
 * components:
 *   schemas:
 *     Message:
 *       type: object
 *       required:
 *         - content
 *         - sender
 *       properties:
 *         content:
 *           type: string
 *           description: Message content
 *         sender:
 *           type: string
 *           format: objectId
 *           description: Sender user ID
 *         recipient:
 *           type: string
 *           format: objectId
 *           description: Recipient user ID
 *         class:
 *           type: string
 *           format: objectId
 *           description: Related class (if any)
 *         subject:
 *           type: string
 *           format: objectId
 *           description: Related subject (if any)
 *         isGroupMessage:
 *           type: boolean
 *           default: false
 *         group:
 *           type: string
 *           format: objectId
 *           description: Group ID (if group message)
 *         attachments:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *               type:
 *                 type: string
 *               name:
 *                 type: string
 *         isRead:
 *           type: boolean
 *           default: false
 *         readAt:
 *           type: string
 *           format: date-time
 *         isEdited:
 *           type: boolean
 *           default: false
 */

const MessageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true,
  },

  // Relationships
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  recipient: {
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

  // Message details
  isGroupMessage: { type: Boolean, default: false },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group",
  },
  attachments: [
    {
      url: { type: String },
      type: { type: String },
      name: { type: String },
    },
  ],

  // Status
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
  isEdited: { type: Boolean, default: false },

  // System
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Message", MessageSchema);
