const express = require("express");
const router = express.Router();
const {
  getNotifications,
  createNotification,
  updateNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearNotifications,
} = require("../controllers/notificationController");
const { protect, authorize } = require("../middleware/auth");

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: User notifications
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get all notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications
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
 *                     $ref: '#/components/schemas/Notification'
 *   
 *   post:
 *     summary: Create notification
 *     description: Create a new notification (Admin and teachers can create for any user, regular users can only create for themselves)
 *     tags: [Notifications]
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
 *               - message
 *               - recipient
 *             properties:
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               recipient:
 *                 type: string
 *                 format: objectId
 *               type:
 *                 type: string
 *                 enum: [info, success, warning, error]
 *               relatedEntity:
 *                 type: string
 *                 format: objectId
 *               relatedEntityType:
 *                 type: string
 *     responses:
 *       201:
 *         description: Notification created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Notification'
 *       403:
 *         description: Not authorized
 *   
 *   delete:
 *     summary: Clear all notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications cleared
 */

/**
 * @swagger
 * /api/notifications/{id}:
 *   put:
 *     summary: Update notification
 *     description: Update a notification (Admin, teachers, or sender only)
 *     tags: [Notifications]
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
 *               message:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [info, success, warning, error]
 *               isRead:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Notification updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Notification'
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Not found
 *   
 *   delete:
 *     summary: Delete notification
 *     description: Delete a notification (Admin, teachers, recipient, or sender)
 *     tags: [Notifications]
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
 *         description: Notification deleted
 */

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   put:
 *     summary: Mark notification as read
 *     tags: [Notifications]
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
 *         description: Notification marked as read
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Notification'
 */

/**
 * @swagger
 * /api/notifications/read-all:
 *   put:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
router.use(protect);

router.route("/")
  .get(getNotifications)
  .post(createNotification)
  .delete(clearNotifications);

router.put("/read-all", markAllAsRead);

router.route("/:id")
  .put(updateNotification)
  .delete(deleteNotification);

router.put("/:id/read", markAsRead);

module.exports = router;