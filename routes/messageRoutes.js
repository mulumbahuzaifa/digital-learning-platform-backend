const express = require("express");
const router = express.Router();
const {
  getMessages,
  getMessage,
  sendMessage,
  updateMessage,
  deleteMessage,
  getUsersForMessaging,
} = require("../controllers/messageController");
const { protect, authorize } = require("../middleware/auth");

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: Communication messages between users, classes, and subjects
 */

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
 *           description: Related class ID
 *         subject:
 *           type: string
 *           format: objectId
 *           description: Related subject ID
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
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/messages:
 *   get:
 *     summary: Get all messages
 *     description: Retrieve messages based on filters (recipient, class, subject, status)
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: recipient
 *         schema:
 *           type: string
 *         description: Filter by recipient ID
 *       - in: query
 *         name: class
 *         schema:
 *           type: string
 *         description: Filter by class ID
 *       - in: query
 *         name: subject
 *         schema:
 *           type: string
 *         description: Filter by subject ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [read, unread]
 *         description: Filter by message status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in message content and attachments
 *     responses:
 *       200:
 *         description: List of messages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *       403:
 *         description: Not authorized to access messages
 *
 *   post:
 *     summary: Send a new message
 *     description: Create a new message to a recipient, class, or subject
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: Message content
 *               recipient:
 *                 type: string
 *                 description: Recipient user ID
 *               class:
 *                 type: string
 *                 description: Class ID for class-wide message
 *               subject:
 *                 type: string
 *                 description: Subject ID for subject-specific message
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                     type:
 *                       type: string
 *                     name:
 *                       type: string
 *     responses:
 *       201:
 *         description: Message created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Message'
 *       400:
 *         description: Invalid input or missing required fields
 *       403:
 *         description: Not authorized to send message
 *       404:
 *         description: Recipient, class, or subject not found
 */

/**
 * @swagger
 * /api/messages/{id}:
 *   get:
 *     summary: Get message by ID
 *     description: Retrieve a specific message by its ID
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Message'
 *       403:
 *         description: Not authorized to access message
 *       404:
 *         description: Message not found
 *
 *   put:
 *     summary: Update message
 *     description: Update message content (only within 24 hours of creation)
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: Updated message content
 *     responses:
 *       200:
 *         description: Message updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Message'
 *       400:
 *         description: Message cannot be edited after 24 hours
 *       403:
 *         description: Not authorized to update message
 *       404:
 *         description: Message not found
 *
 *   delete:
 *     summary: Delete message
 *     description: Delete a message (only by sender or recipient)
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       403:
 *         description: Not authorized to delete message
 *       404:
 *         description: Message not found
 */

/**
 * @swagger
 * /api/messages/users:
 *   get:
 *     summary: Get users available for messaging
 *     description: Retrieve a list of users that the current user can message based on their role and relationships
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [student, teacher, admin]
 *         description: Filter users by role (admin only)
 *       - in: query
 *         name: class
 *         schema:
 *           type: string
 *         description: Filter users by class (students get teachers, teachers get students)
 *       - in: query
 *         name: subject
 *         schema:
 *           type: string
 *         description: Filter teachers by subject (requires class parameter)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search users by name or email
 *     responses:
 *       200:
 *         description: List of available users for messaging
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         format: objectId
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *                       email:
 *                         type: string
 *                       role:
 *                         type: string
 *                         enum: [student, teacher, admin]
 *                       avatar:
 *                         type: string
 *                       isActive:
 *                         type: boolean
 *       400:
 *         description: Invalid input parameters
 *       403:
 *         description: Not authorized to access these users
 *       404:
 *         description: Class or subject not found
 */

// Apply authentication middleware
router.use(protect);

// Routes
router.route("/").get(getMessages).post(sendMessage);

router.route("/users").get(getUsersForMessaging);

router.route("/:id").get(getMessage).put(updateMessage).delete(deleteMessage);

module.exports = router;
