const express = require('express');
const router = express.Router();
const {
  getFeedback,
  getSingleFeedback,
  submitFeedback,
  respondToFeedback,
  updateFeedback,
  deleteFeedback
} = require('../controllers/feedbackController');
const { protect, authorize } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Feedback
 *   description: Feedback management system
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Feedback:
 *       type: object
 *       required:
 *         - content
 *         - feedbackType
 *         - fromUser
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
 *           description: User receiving feedback
 *         class:
 *           type: string
 *           format: objectId
 *           description: Related class
 *         subject:
 *           type: string
 *           format: objectId
 *           description: Related subject
 *         contentItem:
 *           type: string
 *           format: objectId
 *           description: Related content item
 *         feedbackType:
 *           type: string
 *           enum: [teacher, student, content, assignment, platform, system]
 *           description: Type of feedback
 *         isAnonymous:
 *           type: boolean
 *           default: false
 *           description: Whether feedback is anonymous
 *         status:
 *           type: string
 *           enum: [submitted, reviewed, actioned, resolved]
 *           default: submitted
 *         response:
 *           type: string
 *           description: Admin/recipient response
 *         respondedBy:
 *           type: string
 *           format: objectId
 *           description: User who responded
 *         respondedAt:
 *           type: string
 *           format: date-time
 *           description: When response was given
 */

/**
 * @swagger
 * /api/feedback:
 *   get:
 *     summary: Get all feedback
 *     description: Retrieve feedback based on filters and user role
 *     tags: [Feedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [teacher, student, content, assignment, platform, system]
 *         description: Filter by feedback type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [submitted, reviewed, actioned, resolved]
 *         description: Filter by feedback status
 *       - in: query
 *         name: toUser
 *         schema:
 *           type: string
 *         description: Filter by recipient user ID
 *       - in: query
 *         name: fromUser
 *         schema:
 *           type: string
 *         description: Filter by sender user ID
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
 *         name: contentItem
 *         schema:
 *           type: string
 *         description: Filter by content item ID
 *     responses:
 *       200:
 *         description: Success
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
 *                     $ref: '#/components/schemas/Feedback'
 *   
 *   post:
 *     summary: Submit feedback
 *     description: Create new feedback
 *     tags: [Feedback]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Feedback'
 *     responses:
 *       201:
 *         description: Feedback created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Feedback'
 *       400:
 *         description: Invalid input
 */

/**
 * @swagger
 * /api/feedback/{id}:
 *   get:
 *     summary: Get feedback by ID
 *     description: Get detailed feedback information
 *     tags: [Feedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Feedback'
 *       404:
 *         description: Feedback not found
 *   
 *   put:
 *     summary: Update feedback
 *     description: Update feedback details (owner or admin only)
 *     tags: [Feedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Feedback'
 *     responses:
 *       200:
 *         description: Feedback updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Feedback'
 *   
 *   delete:
 *     summary: Delete feedback
 *     description: Delete feedback (owner or admin only)
 *     tags: [Feedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Feedback deleted
 */

/**
 * @swagger
 * /api/feedback/{id}/respond:
 *   put:
 *     summary: Respond to feedback
 *     description: Add response to feedback (admin or recipient only)
 *     tags: [Feedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               response:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [submitted, reviewed, actioned, resolved]
 *     responses:
 *       200:
 *         description: Response added
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Feedback'
 */

router.use(protect);

router.route('/')
  .get(getFeedback)
  .post(submitFeedback);

router.route('/:id')
  .get(getSingleFeedback)
  .put(updateFeedback)
  .delete(deleteFeedback);

router.put('/:id/respond', respondToFeedback);

module.exports = router;