const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Content:
 *       type: object
 *       required:
 *         - title
 *         - type
 *         - class
 *         - subject
 *         - uploadedBy
 *       properties:
 *         title:
 *           type: string
 *           description: Title of the content
 *           trim: true
 *         description:
 *           type: string
 *           maxLength: 1000
 *           description: Detailed description of the content
 *         type:
 *           type: string
 *           enum: [note, assignment, slide, video, audio, document, link, quiz]
 *           description: Type of content
 *         fileUrl:
 *           type: string
 *           description: URL to the uploaded file
 *         thumbnail:
 *           type: string
 *           description: URL to content thumbnail (for videos)
 *         fileSize:
 *           type: number
 *           description: Size of file in bytes
 *         fileType:
 *           type: string
 *           description: MIME type of the file
 *         class:
 *           type: string
 *           format: objectId
 *           description: Reference to the class this content belongs to
 *         subject:
 *           type: string
 *           format: objectId
 *           description: Reference to the subject this content belongs to
 *         uploadedBy:
 *           type: string
 *           format: objectId
 *           description: Reference to the user who uploaded the content
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of tags for content categorization
 *         isPublic:
 *           type: boolean
 *           default: false
 *           description: Whether the content is publicly accessible
 *         accessLevel:
 *           type: string
 *           enum: [class, school, public]
 *           default: class
 *           description: Level of access control for the content
 *         downloads:
 *           type: number
 *           default: 0
 *           description: Number of times the content has been downloaded
 *         views:
 *           type: number
 *           default: 0
 *           description: Number of times the content has been viewed
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date when the content was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Date when the content was last updated
 */

const ContentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    maxlength: 1000
  },
  type: {
    type: String,
    enum: ['note', 'assignment', 'slide', 'video', 'audio', 'document', 'link', 'quiz'],
    required: true
  },
  fileUrl: {
    type: String,
    // required: true
  },
  thumbnail: { type: String }, // For videos
  fileSize: { type: Number }, // In bytes
  fileType: { type: String }, // MIME type
  
  // Relationships
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Metadata
  tags: [{ type: String }],
  isPublic: { type: Boolean, default: false },
  accessLevel: {
    type: String,
    enum: ['class', 'school', 'public'],
    default: 'class'
  },
  
  // System
  downloads: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Content', ContentSchema);