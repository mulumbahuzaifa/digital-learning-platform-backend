const mongoose = require("mongoose");

/**
 * @swagger
 * components:
 *   schemas:
 *     CalendarEvent:
 *       type: object
 *       required:
 *         - title
 *         - start
 *         - end
 *         - eventType
 *         - createdBy
 *       properties:
 *         title:
 *           type: string
 *           description: Title of the calendar event
 *           trim: true
 *         description:
 *           type: string
 *           description: Detailed description of the event
 *         start:
 *           type: string
 *           format: date-time
 *           description: Start date and time of the event
 *         end:
 *           type: string
 *           format: date-time
 *           description: End date and time of the event
 *         allDay:
 *           type: boolean
 *           default: false
 *           description: Whether the event is an all-day event
 *         class:
 *           type: string
 *           format: objectId
 *           description: Reference to the associated class
 *         subject:
 *           type: string
 *           format: objectId
 *           description: Reference to the associated subject
 *         createdBy:
 *           type: string
 *           format: objectId
 *           description: Reference to the user who created the event
 *         eventType:
 *           type: string
 *           enum: [class, exam, assignment, holiday, meeting, school, personal]
 *           description: Type of calendar event
 *         location:
 *           type: string
 *           description: Physical or virtual location of the event
 *         recurring:
 *           type: object
 *           properties:
 *             isRecurring:
 *               type: boolean
 *               default: false
 *             frequency:
 *               type: string
 *               enum: [daily, weekly, monthly, yearly]
 *             endRecurring:
 *               type: string
 *               format: date-time
 *           description: Recurring event settings
 *         attendees:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               user:
 *                 type: string
 *                 format: objectId
 *               status:
 *                 type: string
 *                 enum: [pending, accepted, declined]
 *                 default: pending
 *           description: List of event attendees with their response status
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date when the event was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Date when the event was last updated
 */

const CalendarEventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
  },
  start: {
    type: Date,
    required: true,
  },
  end: {
    type: Date,
    required: true,
  },
  allDay: {
    type: Boolean,
    default: false,
  },

  // Relationships
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Class",
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // Event details
  eventType: {
    type: String,
    enum: [
      "class",
      "exam",
      "assignment",
      "holiday",
      "meeting",
      "school",
      "personal",
    ],
    required: true,
  },
  location: { type: String },
  recurring: {
    isRecurring: { type: Boolean, default: false },
    frequency: { type: String, enum: ["daily", "weekly", "monthly", "yearly"] },
    endRecurring: { type: Date },
  },
  attendees: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      status: {
        type: String,
        enum: ["pending", "accepted", "declined"],
        default: "pending",
      },
    },
  ],

  // System
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("CalendarEvent", CalendarEventSchema);
