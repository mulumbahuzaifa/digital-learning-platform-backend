const express = require("express");
const router = express.Router();
const {
  getSubmissions,
  getSubmission,
  createSubmission,
  updateSubmission,
  gradeSubmission,
  downloadSubmissionFile,
  getSubmissionsByAssignment,
  requestResubmission,
  addParentFeedback,
  // checkPlagiarism,
  getSubmissionStats,
  getStudentSubmissions,
  getTeacherSubmissions,
} = require("../controllers/submissionController");
const { protect, authorize, role } = require("../middleware/auth");
const { upload } = require("../utils/fileUpload");

/**
 * @swagger
 * components:
 *   schemas:
 *     Submission:
 *       type: object
 *       required:
 *         - assignment
 *         - student
 *         - status
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated MongoDB ID
 *         assignment:
 *           type: string
 *           description: Reference to Assignment model
 *         student:
 *           type: string
 *           description: Reference to User model (student)
 *         content:
 *           type: string
 *           description: Text content of the submission
 *         files:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               filename:
 *                 type: string
 *               originalname:
 *                 type: string
 *               mimetype:
 *                 type: string
 *               size:
 *                 type: number
 *               path:
 *                 type: string
 *         status:
 *           type: string
 *           enum: [submitted, late, graded, resubmission_requested]
 *         grade:
 *           type: string
 *           description: Grade awarded (A-F)
 *         feedback:
 *           type: string
 *         gradedBy:
 *           type: string
 *           description: Reference to User model (teacher)
 *         gradedAt:
 *           type: string
 *           format: date-time
 *         parentFeedback:
 *           type: object
 *           properties:
 *             feedback:
 *               type: string
 *             parent:
 *               type: string
 *             date:
 *               type: string
 *               format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * tags:
 *   name: Submissions
 *   description: Assignment submission and grading operations
 */

/**
 * @swagger
 * /api/submissions:
 *   get:
 *     summary: Get all submissions with filtering
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: assignment
 *         schema:
 *           type: string
 *         description: Filter by assignment ID
 *       - in: query
 *         name: student
 *         schema:
 *           type: string
 *         description: Filter by student ID
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
 *         description: Filter by submission status
 *       - in: query
 *         name: term
 *         schema:
 *           type: string
 *         description: Filter by term
 *       - in: query
 *         name: academicYear
 *         schema:
 *           type: string
 *         description: Filter by academic year
 *     responses:
 *       200:
 *         description: List of submissions
 *       401:
 *         description: Not authorized
 */

/**
 * @swagger
 * /api/submissions/student:
 *   get:
 *     summary: Get student's submissions
 *     description: Retrieve all submissions made by the logged-in student
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [submitted, graded, returned]
 *         description: Filter by submission status
 *       - in: query
 *         name: assignment
 *         schema:
 *           type: string
 *         description: Filter by assignment ID
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
 *                     $ref: '#/components/schemas/Submission'
 *       403:
 *         description: Not authorized - only students can access this endpoint
 */

/**
 * @swagger
 * /api/submissions/teacher:
 *   get:
 *     summary: Get teacher's submissions
 *     description: Retrieve all submissions for assignments created by the logged-in teacher
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [submitted, graded, returned]
 *         description: Filter by submission status
 *       - in: query
 *         name: assignment
 *         schema:
 *           type: string
 *         description: Filter by assignment ID
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
 *                     $ref: '#/components/schemas/Submission'
 *       403:
 *         description: Not authorized - only teachers can access this endpoint
 */

// Protect all routes
router.use(protect);

// Base routes
router
  .route("/")
  .get(role("admin", "teacher"), getSubmissions)
  .post(role("student"), upload.array("files", 5), createSubmission);

router.get("/student", role("student"), getStudentSubmissions);
router.get("/teacher", role("teacher"), getTeacherSubmissions);

/**
 * @swagger
 * /api/submissions/stats:
 *   get:
 *     summary: Get submission statistics
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Submission statistics
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
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       count:
 *                         type: integer
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get("/stats", authorize("teacher", "admin"), getSubmissionStats);

/**
 * @swagger
 * /api/submissions/assignment/{assignmentId}:
 *   get:
 *     summary: Get all submissions for a specific assignment
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Assignment ID
 *     responses:
 *       200:
 *         description: List of submissions for the assignment
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
 *                     $ref: '#/components/schemas/Submission'
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 */
router.get(
  "/assignment/:assignmentId",
  authorize("teacher", "admin"),
  getSubmissionsByAssignment
);

/**
 * @swagger
 * /api/submissions/{id}:
 *   get:
 *     summary: Get a single submission
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Submission ID
 *     responses:
 *       200:
 *         description: Submission details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Submission'
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Submission not found
 *   put:
 *     summary: Update a submission
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Submission ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Submission updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Submission'
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Submission not found
 */
router
  .route("/:id")
  .get(getSubmission)
  .put(role("student"), upload.array("files", 5), updateSubmission);

/**
 * @swagger
 * /api/submissions/{id}/grade:
 *   put:
 *     summary: Grade a submission
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Submission ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - grade
 *             properties:
 *               grade:
 *                 type: string
 *               feedback:
 *                 type: string
 *     responses:
 *       200:
 *         description: Submission graded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Submission'
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Submission not found
 */
router.route("/:id/grade").put(authorize("teacher", "admin"), gradeSubmission);

/**
 * @swagger
 * /api/submissions/{id}/request-resubmission:
 *   put:
 *     summary: Request resubmission
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Submission ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *               - deadline
 *             properties:
 *               reason:
 *                 type: string
 *               deadline:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Resubmission requested successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Submission'
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Submission not found
 */
router
  .route("/:id/request-resubmission")
  .put(authorize("teacher", "admin"), requestResubmission);

/**
 * @swagger
 * /api/submissions/{id}/parent-feedback:
 *   put:
 *     summary: Add parent feedback
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Submission ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - feedback
 *             properties:
 *               feedback:
 *                 type: string
 *     responses:
 *       200:
 *         description: Parent feedback added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Submission'
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Submission not found
 */
router
  .route("/:id/parent-feedback")
  .put(authorize("parent"), addParentFeedback);

/**
 * @swagger
 * /api/submissions/{id}/download/{fileId}:
 *   get:
 *     summary: Download a submission file
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Submission ID
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *         description: File ID
 *     responses:
 *       200:
 *         description: File download
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: File not found
 */
router.get("/:id/download/:fileId", downloadSubmissionFile);

module.exports = router;
