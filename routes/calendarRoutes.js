const express = require("express");
const router = express.Router();
const {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  updateAttendance,
} = require("../controllers/calendarController");
const { protect } = require("../middleware/auth");

/**
 * @swagger
 * tags:
 *   name: Calendar
 *   description: Calendar events management and scheduling
 */

/**
 * @swagger
 * /api/calendar:
 *   get:
 *     summary: Get calendar events
 *     description: |
 *       Retrieve calendar events with filtering options. Returns events where:
 *       - User is the creator
 *       - User is an attendee
 *       - Events within specified date range
 *       - Events filtered by type and class
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for filtering events (inclusive)
 *       - in: query
 *         name: end
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for filtering events (inclusive)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [class, exam, assignment, holiday, meeting, school, personal]
 *         description: Filter by event type
 *       - in: query
 *         name: class
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Filter by class ID
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
 *                   example: true
 *                 count:
 *                   type: number
 *                   description: Number of events returned
 *                   example: 5
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CalendarEvent'
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 *   
 *   post:
 *     summary: Create calendar event
 *     description: |
 *       Create a new calendar event. Additional rules:
 *       - For class events, only class teachers or admin can create
 *       - createdBy is automatically set to the authenticated user
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CalendarEvent'
 *     responses:
 *       201:
 *         description: Event created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CalendarEvent'
 *       400:
 *         description: Invalid input data
 *       403:
 *         description: Not authorized to create event for this class
 *       404:
 *         description: Class not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/calendar/{id}:
 *   get:
 *     summary: Get single calendar event
 *     description: |
 *       Get detailed information about specific calendar event.
 *       User must be either:
 *       - Event creator
 *       - Event attendee
 *       - Admin
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Event ID
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CalendarEvent'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized to access this event
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 *   
 *   put:
 *     summary: Update calendar event
 *     description: |
 *       Update calendar event. Only:
 *       - Event creator
 *       - Admin
 *       can update the event
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CalendarEvent'
 *     responses:
 *       200:
 *         description: Event updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CalendarEvent'
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized to update this event
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 *   
 *   delete:
 *     summary: Delete calendar event
 *     description: |
 *       Delete calendar event. Only:
 *       - Event creator
 *       - Admin
 *       can delete the event
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   description: Empty object
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized to delete this event
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/calendar/{id}/attendance:
 *   put:
 *     summary: Update event attendance
 *     description: |
 *       Update attendance status for an event.
 *       Only event attendees can update their attendance status.
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, accepted, declined]
 *                 description: New attendance status
 *     responses:
 *       200:
 *         description: Attendance status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/CalendarEvent'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not an attendee of this event
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 */

router.use(protect);

router.route("/").get(getEvents).post(createEvent);

router.route("/:id").get(getEvent).put(updateEvent).delete(deleteEvent);

router.put("/:id/attendance", updateAttendance);

module.exports = router;
