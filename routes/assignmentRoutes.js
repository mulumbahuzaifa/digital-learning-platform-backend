const express = require("express");
const router = express.Router();
const {
  getAssignments,
  getAssignment,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  publishAssignment,
  getStudentAssignments,
  getTeacherAssignments,
} = require("../controllers/assignmentController");
const { protect, role } = require("../middleware/auth");

/**
 * @swagger
 * tags:
 *   name: Assignments
 *   description: Assignment management and operations
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Assignment:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - dueDate
 *         - class
 *         - subject
 *       properties:
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         dueDate:
 *           type: string
 *           format: date-time
 *         totalMarks:
 *           type: number
 *         class:
 *           type: string
 *           format: objectId
 *         subject:
 *           type: string
 *           format: objectId
 *         attachments:
 *           type: array
 *           items:
 *             type: string
 */

/**
 * @swagger
 * /api/assignments:
 *   get:
 *     summary: Get all assignments
 *     description: Retrieve all assignments with optional filtering by class, subject, and status
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *           enum: [draft, published, closed]
 *         description: Filter by assignment status
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
 *                     $ref: '#/components/schemas/Assignment'
 *
 *   post:
 *     summary: Create new assignment
 *     description: Create a new assignment (Teachers and Admins only)
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Assignment'
 *     responses:
 *       201:
 *         description: Assignment created successfully
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Not authorized or not assigned to teach this subject
 */

/**
 * @swagger
 * /api/assignments/{id}:
 *   get:
 *     summary: Get single assignment
 *     description: Get detailed information about specific assignment
 *     tags: [Assignments]
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
 *                   $ref: '#/components/schemas/Assignment'
 *       403:
 *         description: Not authorized to access this assignment
 *       404:
 *         description: Assignment not found
 *
 *   put:
 *     summary: Update assignment
 *     description: Update assignment details (Owner or Admin only)
 *     tags: [Assignments]
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
 *             $ref: '#/components/schemas/Assignment'
 *     responses:
 *       200:
 *         description: Assignment updated successfully
 *       403:
 *         description: Not authorized to update this assignment
 *       404:
 *         description: Assignment not found
 *
 *   delete:
 *     summary: Delete assignment
 *     description: Delete an assignment (Owner or Admin only)
 *     tags: [Assignments]
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
 *         description: Assignment deleted successfully
 *       403:
 *         description: Not authorized to delete this assignment
 *       404:
 *         description: Assignment not found
 */

/**
 * @swagger
 * /api/assignments/publish/{id}:
 *   put:
 *     summary: Publish assignment
 *     description: Change assignment status to published (Owner only)
 *     tags: [Assignments]
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
 *         description: Assignment published successfully
 *       403:
 *         description: Not authorized to publish this assignment
 *       404:
 *         description: Assignment not found
 */

/**
 * @swagger
 * /api/assignments/student:
 *   get:
 *     summary: Get student's assignments
 *     description: Retrieve all assignments for the logged-in student, filtered by their current enrollments
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [published, closed]
 *         description: Filter by assignment status
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
 *                     $ref: '#/components/schemas/Assignment'
 *       403:
 *         description: Not authorized - only students can access this endpoint
 */

/**
 * @swagger
 * /api/assignments/teacher:
 *   get:
 *     summary: Get teacher's assignments
 *     description: Retrieve all assignments created by the logged-in teacher
 *     tags: [Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published, closed]
 *         description: Filter by assignment status
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
 *                     $ref: '#/components/schemas/Assignment'
 *       403:
 *         description: Not authorized - only teachers can access this endpoint
 */

// Protect all routes
router.use(protect);

// Base routes
router
  .route("/")
  .get(getAssignments) // All roles can view (filtered in controller)
  .post(role("teacher", "admin"), createAssignment); // Teachers and admins can create

router.get("/student", getStudentAssignments);
router.get("/teacher", getTeacherAssignments);

// Routes for specific assignments
router
  .route("/:id")
  .get(getAssignment) // All roles can view if they have access
  .put(role("teacher", "admin"), updateAssignment) // Teachers and admins
  .delete(role("teacher", "admin"), deleteAssignment); // Teachers and admins

// Special actions
// router.put("/publish/:id", role("teacher"), publishAssignment); // Only teachers

module.exports = router;
