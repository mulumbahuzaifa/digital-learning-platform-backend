const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Subject:
 *       type: object
 *       required:
 *         - name
 *         - code
 *         - category
 *         - subCategory
 *       properties:
 *         name:
 *           type: string
 *           description: Subject name
 *         code:
 *           type: string
 *           description: Unique subject code
 *           unique: true
 *         category:
 *           type: string
 *           enum: [compulsory, elective]
 *           description: Whether the subject is compulsory or elective
 *         subCategory:
 *           type: string
 *           enum: [languages, sciences, mathematics, humanities, vocational, arts, technology]
 *           description: The subject area category
 *         description:
 *           type: string
 *           maxLength: 1000
 *           description: Detailed description of the subject
 *         syllabus:
 *           type: string
 *           description: URL to the syllabus document
 *         isActive:
 *           type: boolean
 *           default: true
 *           description: Whether the subject is currently active
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date when the subject was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Date when the subject was last updated
 */

const SubjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    // unique: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  category: {
    type: String,
    enum: ['compulsory', 'elective'],
    required: true
  },
  subCategory: {
    type: String,
    enum: [
      'languages',
      'sciences',
      'mathematics',
      'humanities',
      'vocational',
      'arts',
      'technology'
    ],
    required: true
  },
  description: {
    type: String,
    maxlength: 1000
  },
  syllabus: {
    type: String // URL to syllabus document
  },
  // Add more fields as needed
  classes:  [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class'
    }
  ],
  teachers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Subject', SubjectSchema);