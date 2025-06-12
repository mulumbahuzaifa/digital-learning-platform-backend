const express = require("express");
const {
  createLiveSession,
  getLiveSessions,
  getLiveSession,
  updateLiveSession,
  deleteLiveSession,
  joinLiveSession,
  leaveLiveSession,
  startLiveSession,
  endLiveSession,
  addChatMessage,
} = require("../controllers/liveSessionController");

const router = express.Router();

const { protect, authorize } = require("../middleware/auth");

/**
 * @swagger
 * components:
 *   schemas:
 *     LiveSession:
 *       type: object
 *       required:
 *         - title
 *         - class
 *         - subject
 *         - startTime
 *         - duration
 *       properties:
 *         title:
 *           type: string
 *           description: The title of the live session
 *         description:
 *           type: string
 *           description: Description of the session
 *         teacher:
 *           type: string
 *           description: ID of the teacher conducting the session
 *         class:
 *           type: string
 *           description: ID of the class
 *         subject:
 *           type: string
 *           description: ID of the subject
 *         startTime:
 *           type: string
 *           format: date-time
 *           description: When the session starts
 *         duration:
 *           type: number
 *           description: Duration in minutes
 *         status:
 *           type: string
 *           enum: [scheduled, live, ended]
 *           description: Current status of the session
 *         meetingId:
 *           type: string
 *           description: Unique meeting identifier
 *         meetingPassword:
 *           type: string
 *           description: Meeting password
 *         meetingUrl:
 *           type: string
 *           description: URL to join the meeting
 *         participants:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               user:
 *                 type: string
 *               joinedAt:
 *                 type: string
 *                 format: date-time
 *         recordingUrl:
 *           type: string
 *           description: URL to the session recording
 *         chat:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               user:
 *                 type: string
 *               message:
 *                 type: string
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *         settings:
 *           type: object
 *           properties:
 *             enableChat:
 *               type: boolean
 *             enableRecording:
 *               type: boolean
 *             enableScreenSharing:
 *               type: boolean
 */

/**
 * @swagger
 * /api/live-sessions:
 *   post:
 *     summary: Create a new live session
 *     tags: [Live Sessions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - class
 *               - subject
 *               - startTime
 *               - duration
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               class:
 *                 type: string
 *               subject:
 *                 type: string
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               duration:
 *                 type: number
 *               settings:
 *                 type: object
 *     responses:
 *       201:
 *         description: Live session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LiveSession'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Only teachers can create sessions
 */
router.post("/", protect, authorize("teacher"), createLiveSession);

/**
 * @swagger
 * /api/live-sessions:
 *   get:
 *     summary: Get all live sessions
 *     tags: [Live Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, live, ended]
 *       - in: query
 *         name: class
 *         schema:
 *           type: string
 *       - in: query
 *         name: subject
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of live sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 pagination:
 *                   type: object
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/LiveSession'
 *       401:
 *         description: Not authorized
 */
router.get("/", protect, getLiveSessions);

/**
 * @swagger
 * /api/live-sessions/{id}:
 *   get:
 *     summary: Get a live session by ID
 *     tags: [Live Sessions]
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
 *         description: Live session details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LiveSession'
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Session not found
 */
router.get("/:id", protect, getLiveSession);

/**
 * @swagger
 * /api/live-sessions/{id}:
 *   put:
 *     summary: Update a live session
 *     tags: [Live Sessions]
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
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               duration:
 *                 type: number
 *               settings:
 *                 type: object
 *     responses:
 *       200:
 *         description: Live session updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LiveSession'
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Only session owner can update
 *       404:
 *         description: Session not found
 */
router.put("/:id", protect, authorize("teacher"), updateLiveSession);

/**
 * @swagger
 * /api/live-sessions/{id}:
 *   delete:
 *     summary: Delete a live session
 *     tags: [Live Sessions]
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
 *         description: Live session deleted successfully
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Only session owner can delete
 *       404:
 *         description: Session not found
 */
router.delete("/:id", protect, authorize("teacher"), deleteLiveSession);

/**
 * @swagger
 * /api/live-sessions/{id}/join:
 *   post:
 *     summary: Join a live session
 *     tags: [Live Sessions]
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
 *         description: Successfully joined the session
 *       400:
 *         description: Session is not active
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Session not found
 */
router.post("/:id/join", protect, joinLiveSession);

/**
 * @swagger
 * /api/live-sessions/{id}/leave:
 *   post:
 *     summary: Leave a live session
 *     tags: [Live Sessions]
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
 *         description: Successfully left the session
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Session not found
 */
router.post("/:id/leave", protect, leaveLiveSession);

/**
 * @swagger
 * /api/live-sessions/{id}/start:
 *   post:
 *     summary: Start a live session
 *     tags: [Live Sessions]
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
 *         description: Session started successfully
 *       400:
 *         description: Session cannot be started
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Only session owner can start
 *       404:
 *         description: Session not found
 */
router.post("/:id/start", protect, authorize("teacher"), startLiveSession);

/**
 * @swagger
 * /api/live-sessions/{id}/end:
 *   post:
 *     summary: End a live session
 *     tags: [Live Sessions]
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
 *         description: Session ended successfully
 *       400:
 *         description: Session cannot be ended
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Only session owner can end
 *       404:
 *         description: Session not found
 */
router.post("/:id/end", protect, authorize("teacher"), endLiveSession);

/**
 * @swagger
 * /api/live-sessions/{id}/chat:
 *   post:
 *     summary: Add a chat message to the session
 *     tags: [Live Sessions]
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
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message added successfully
 *       400:
 *         description: Session is not active or chat is disabled
 *       401:
 *         description: Not authorized
 *       404:
 *         description: Session not found
 */
router.post("/:id/chat", protect, addChatMessage);

module.exports = router;
