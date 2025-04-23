const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       required:
 *         - title
 *         - message
 *         - recipient
 *         - notificationType
 *       properties:
 *         title:
 *           type: string
 *           description: Notification title
 *         message:
 *           type: string
 *           description: Notification content
 *         recipient:
 *           type: string
 *           format: objectId
 *           description: Recipient user ID
 *         sender:
 *           type: string
 *           format: objectId
 *           description: Sender user ID (optional)
 *         relatedEntity:
 *           type: string
 *           format: objectId
 *           description: Related entity ID
 *         relatedEntityModel:
 *           type: string
 *           enum: [Assignment, Content, Class, Subject, Submission]
 *           description: Related entity type
 *         notificationType:
 *           type: string
 *           enum: [assignment, submission, grade, message, system, enrollment, content]
 *         isRead:
 *           type: boolean
 *           default: false
 *         readAt:
 *           type: string
 *           format: date-time
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *           default: medium
 */
const NotificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  
  // Relationships
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  relatedEntity: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'relatedEntityModel'
  },
  relatedEntityModel: {
    type: String,
    enum: ['Assignment', 'Content', 'Class', 'Subject', 'Submission']
  },
  
  // Notification details
  notificationType: {
    type: String,
    enum: [
      'assignment', 
      'submission', 
      'grade', 
      'message', 
      'system', 
      'enrollment', 
      'content'
    ],
    required: true
  },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // System
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', NotificationSchema);