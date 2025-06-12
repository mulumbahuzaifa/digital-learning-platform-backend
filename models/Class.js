const mongoose = require("mongoose");

/**
 * @swagger
 * components:
 *   schemas:
 *     Class:
 *       type: object
 *       required:
 *         - name
 *         - code
 *         - level
 *         - stream
 *       properties:
 *         name:
 *           type: string
 *           description: Class name
 *         code:
 *           type: string
 *           description: Unique class code (auto-generated)
 *         level:
 *           type: string
 *           description: Class level (e.g., "S1", "S2", "S3")
 *         stream:
 *           type: string
 *           description: Class stream (e.g., "A", "B", "C")
 *         description:
 *           type: string
 *           maxLength: 500
 *         subjects:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               subject:
 *                 type: string
 *                 format: objectId
 *               teachers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     teacher:
 *                       type: string
 *                       format: objectId
 *                     status:
 *                       type: string
 *                       enum: [pending, approved, rejected]
 *                     isLeadTeacher:
 *                       type: boolean
 *                     assignedBy:
 *                       type: string
 *                       format: objectId
 *               schedule:
 *                 type: object
 *                 properties:
 *                   day:
 *                     type: string
 *                     enum: [Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday]
 *                   startTime:
 *                     type: string
 *                   endTime:
 *                     type: string
 *                   venue:
 *                     type: string
 *         classTeacher:
 *           type: string
 *           format: objectId
 *         isActive:
 *           type: boolean
 *           default: true
 *         prefects:
 *          type: array
 *          items:
 *           type: object
 *           properties:
 *             position:
 *               type: string
 *               description: Prefect position title
 *             student:
 *               type: string
 *               format: objectId
 *               description: Student assigned as prefect
 *             assignedAt:
 *               type: string
 *               format: date-time
 *             assignedBy:
 *               type: string
 *               format: objectId
 */

const ClassSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  code: {
    type: String,
    unique: true,
    required: true,
    uppercase: true,
  },
  level: {
    type: String,
    required: true,
    trim: true,
  },
  stream: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    maxlength: 500,
  },
  // Subjects offered in this class
  subjects: [
    {
      subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
        required: true,
      },
      // Teachers for this subject in this class
      teachers: [
        {
          teacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
          },
          approvedAt: Date,
          isLeadTeacher: {
            type: Boolean,
            default: false,
          },
          assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        },
      ],
      schedule: {
        day: {
          type: String,
          enum: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ],
        },
        startTime: { type: String }, // "08:00"
        endTime: { type: String },
        venue: { type: String },
      },
    },
  ],
  // Class management
  classTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  prefects: [
    {
      position: { type: String },
      student: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      assignedAt: { type: Date, default: Date.now },
      assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
  ],
  // System
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Generate class code before saving
ClassSchema.pre("save", function (next) {
  if (!this.isModified("code") && this.code) return next();

  // Format: LEVEL-STREAM-RANDOM (e.g., S1-A-X5B9)
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
  this.code = `${this.level}-${this.stream}-${randomChars}`;

  next();
});

module.exports = mongoose.model("Class", ClassSchema);
