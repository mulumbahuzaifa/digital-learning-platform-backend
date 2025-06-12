const express = require("express");
const router = express.Router();
const {
  getEnrollments,
  getEnrollment,
  createEnrollment,
  updateEnrollment,
  deleteEnrollment,
  getStudentEnrollments,
  getClassEnrollments,
  transferEnrollment,
  completeEnrollment,
  getEnrollmentStats,
} = require("../controllers/enrollmentController");
const { protect, role } = require("../middleware/auth");

/**
 * @swagger
 * tags:
 *   name: Enrollments
 *   description: Academic enrollment management
 */

/**
 * @swagger
 * /api/enrollments:
 *   get:
 *     summary: Get all enrollments
 *     description: Retrieve all enrollments with optional filtering
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: student
 *         schema:
 *           type: string
 *       - in: query
 *         name: class
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, completed, transferred]
 *       - in: query
 *         name: academicYear
 *         schema:
 *           type: string
 *       - in: query
 *         name: term
 *         schema:
 *           type: string
 *           enum: [Term 1, Term 2, Term 3]
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
 *                     $ref: '#/components/schemas/AcademicEnrollment'
 *
 *   post:
 *     summary: Create new enrollment
 *     description: Create a new academic enrollment (Admin only)
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AcademicEnrollment'
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AcademicEnrollment'
 */

/**
 * @swagger
 * /api/enrollments/{id}:
 *   get:
 *     summary: Get enrollment by ID
 *     tags: [Enrollments]
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
 *               $ref: '#/components/schemas/AcademicEnrollment'
 *
 *   put:
 *     summary: Update enrollment
 *     tags: [Enrollments]
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
 *             $ref: '#/components/schemas/AcademicEnrollment'
 *     responses:
 *       200:
 *         description: Success
 *
 *   delete:
 *     summary: Delete enrollment
 *     tags: [Enrollments]
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
 */

/**
 * @swagger
 * /api/enrollments/student/{studentId}:
 *   get:
 *     summary: Get student's enrollments
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
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
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AcademicEnrollment'
 */

/**
 * @swagger
 * /api/enrollments/class/{classId}:
 *   get:
 *     summary: Get class enrollments
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
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
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AcademicEnrollment'
 */

/**
 * @swagger
 * /api/enrollments/{id}/transfer:
 *   post:
 *     summary: Transfer enrollment
 *     tags: [Enrollments]
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
 *               - toClass
 *               - reason
 *             properties:
 *               toClass:
 *                 type: string
 *                 format: objectId
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Success
 */

/**
 * @swagger
 * /api/enrollments/{id}/complete:
 *   post:
 *     summary: Complete enrollment
 *     tags: [Enrollments]
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
 */

/**
 * @swagger
 * /api/enrollments/stats:
 *   get:
 *     summary: Get enrollment statistics
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
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
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     active:
 *                       type: number
 *                     completed:
 *                       type: number
 *                     transferred:
 *                       type: number
 */

// Protect all routes
router.use(protect);

// Admin only routes
router
  .route("/")
  .get(role("admin", "teacher"), getEnrollments)
  .post(role("admin"), createEnrollment);

router.get("/stats", role("admin"), getEnrollmentStats);

router
  .route("/:id")
  .get(getEnrollment)
  .put(role("admin"), updateEnrollment)
  .delete(role("admin"), deleteEnrollment);

// Student and teacher routes
router.get("/student/:studentId", getStudentEnrollments);
router.get("/class/:classId", getClassEnrollments);

// Admin only management routes
router.post("/:id/transfer", role("admin"), transferEnrollment);
router.post("/:id/complete", role("admin"), completeEnrollment);

module.exports = router;
