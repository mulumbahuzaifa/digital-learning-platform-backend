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
 *         - year
 *         - academicTerm
 *       properties:
 *         name:
 *           type: string
 *           description: Class name
 *         code:
 *           type: string
 *           description: Unique class code (auto-generated)
 *         year:
 *           type: string
 *           description: Academic year
 *         academicTerm:
 *           type: string
 *           enum: [Term 1, Term 2, Term 3]
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
 *         students:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               student:
 *                 type: string
 *                 format: objectId
 *               status:
 *                 type: string
 *                 enum: [pending, approved, rejected]
 *               enrollmentType:
 *                 type: string
 *                 enum: [new, transfer]
 *               enrolledBy:
 *                 type: string
 *                 format: objectId
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
  year: {
    type: String,
    required: true,
  },
  academicTerm: {
    type: String,
    enum: ["Term 1", "Term 2", "Term 3"],
    required: true,
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
            "Sunday"
          ],
        },
        startTime: { type: String }, // "08:00"
        endTime: { type: String },
        venue: { type: String },
      },
    },
  ],
  // Students in this class
  // Students in this class (regardless of subjects)
  students: [
    {
      student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
      },
      approvedAt: Date,
      enrollmentDate: {
        type: Date,
        default: Date.now,
      },
      enrollmentType: {
        type: String,
        enum: ["new", "transfer"],
        default: "new",
      },
      enrolledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
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

  // Format: YEAR-TERM-RANDOM (e.g., S1-T1-X5B9)
  const termCode = this.academicTerm.replace("Term ", "T");
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
  this.code = `${this.year}-${termCode}-${randomChars}`;

  next();
});

module.exports = mongoose.model("Class", ClassSchema);
