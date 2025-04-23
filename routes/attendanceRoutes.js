const express = require("express");
const router = express.Router();
const {
  getAttendance,
  getAttendanceRecord,
  createAttendance,
  updateAttendance,
  submitAttendance,
  verifyAttendance,
  deleteAttendance,
} = require("../controllers/attendanceController");
const { protect, role } = require("../middleware/auth");

/**
 * @swagger
 * tags:
 *   name: Attendance
 *   description: Attendance management and tracking
 */

/**
 * @swagger
 * /api/attendance:
 *   get:
 *     summary: Get all attendance records
 *     description: Retrieve attendance records with filtering options. Access varies by role
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: class
 *         schema:
 *           type: string
 *         description: Filter by class ID
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by specific date
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for date range filter
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for date range filter
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
 *                   type: number
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Attendance'
 *   
 *   post:
 *     summary: Create attendance record
 *     description: Create a new attendance record (Teachers only)
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Attendance'
 *     responses:
 *       201:
 *         description: Attendance record created
 *       400:
 *         description: Invalid input or duplicate record
 *       403:
 *         description: Not authorized or not assigned to class
 */

/**
 * @swagger
 * /api/attendance/{id}:
 *   get:
 *     summary: Get single attendance record
 *     description: Get detailed information about specific attendance record
 *     tags: [Attendance]
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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Attendance'
 *       403:
 *         description: Not authorized to access this record
 *       404:
 *         description: Record not found
 *   
 *   put:
 *     summary: Update attendance record
 *     description: Update attendance record (Owner or Admin only)
 *     tags: [Attendance]
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
 *             $ref: '#/components/schemas/Attendance'
 *     responses:
 *       200:
 *         description: Record updated successfully
 *       403:
 *         description: Not authorized to update this record
 *       404:
 *         description: Record not found
 *   
 *   delete:
 *     summary: Delete attendance record
 *     description: Delete attendance record (Owner or Admin only)
 *     tags: [Attendance]
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
 *         description: Record deleted successfully
 *       403:
 *         description: Not authorized to delete this record
 *       404:
 *         description: Record not found
 */

/**
 * @swagger
 * /api/attendance/{id}/submit:
 *   put:
 *     summary: Submit attendance record
 *     description: Mark attendance record as submitted (Owner only)
 *     tags: [Attendance]
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
 *         description: Record submitted successfully
 *       403:
 *         description: Not authorized to submit this record
 *       404:
 *         description: Record not found
 */

/**
 * @swagger
 * /api/attendance/{id}/verify:
 *   put:
 *     summary: Verify attendance record
 *     description: Mark attendance record as verified (Admin only)
 *     tags: [Attendance]
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
 *         description: Record verified successfully
 *       403:
 *         description: Not authorized - Admin only
 *       404:
 *         description: Record not found
 */

router.use(protect);

router.route("/").get(getAttendance).post(createAttendance);

router
  .route("/:id")
  .get(getAttendanceRecord)
  .put(updateAttendance)
  .delete(deleteAttendance);

router.put("/:id/submit", submitAttendance);
router.put("/:id/verify", role("admin"), verifyAttendance);

module.exports = router;

/**
 * @swagger
 * components:
 *   schemas:
 *     Attendance:
 *       type: object
 *       required:
 *         - student
 *         - class
 *         - date
 *         - status
 *       properties:
 *         student:
 *           type: string
 *           format: objectId
 *         class:
 *           type: string
 *           format: objectId
 *         date:
 *           type: string
 *           format: date
 *         status:
 *           type: string
 *           enum: [present, absent, late]
 *         reason:
 *           type: string
 */
