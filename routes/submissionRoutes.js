const express = require("express");
const router = express.Router();
const {
  getSubmissions,
  getSubmission,
  createSubmission,
  updateSubmission,
  gradeSubmission,
  downloadSubmissionFile,
} = require("../controllers/submissionController");
const { protect } = require("../middleware/auth");
const fileUpload = require("../utils/fileUpload");

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
 *     summary: Get submissions
 *     description: |
 *       Retrieve submissions with filtering options. Access rules:
 *       - Students can only see their own submissions
 *       - Teachers can see submissions for their assignments
 *       - Admins can see all submissions
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: assignment
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Filter by assignment ID
 *       - in: query
 *         name: student
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Filter by student ID
 *       - in: query
 *         name: class
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Filter by class ID
 *       - in: query
 *         name: subject
 *         schema:
 *           type: string
 *           format: objectId
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
 *                   example: true
 *                 count:
 *                   type: number
 *                   description: Number of submissions returned
 *                   example: 5
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Submission'
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 *   
 *   post:
 *     summary: Create submission
 *     description: |
 *       Create a new submission. Rules:
 *       - Only students can submit
 *       - Assignment must exist and be published
 *       - Student must be enrolled in the class
 *       - Submission must be before due date (unless late submissions allowed)
 *       - File uploads are handled through multipart/form-data
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - assignment
 *             properties:
 *               assignment:
 *                 type: string
 *                 format: objectId
 *                 description: Assignment ID
 *               textSubmission:
 *                 type: string
 *                 description: Text content (if applicable)
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Files to upload
 *     responses:
 *       201:
 *         description: Submission created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Submission'
 *       400:
 *         description: Invalid input or submission not allowed
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized to submit
 *       404:
 *         description: Assignment not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/submissions/{id}:
 *   get:
 *     summary: Get single submission
 *     description: |
 *       Get detailed information about specific submission.
 *       Access rules:
 *       - Student can access their own submission
 *       - Teacher can access if they created the assignment
 *       - Admin can access any submission
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Submission ID
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
 *                   $ref: '#/components/schemas/Submission'
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized to access this submission
 *       404:
 *         description: Submission not found
 *       500:
 *         description: Server error
 *   
 *   put:
 *     summary: Update submission
 *     description: |
 *       Update submission. Rules:
 *       - Only student can update their own submission
 *       - Cannot update if already graded
 *       - Must be before due date (unless late submissions allowed)
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Submission ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Submission'
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Submission'
 *       400:
 *         description: Invalid input or update not allowed
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized to update this submission
 *       404:
 *         description: Submission not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/submissions/{id}/grade:
 *   put:
 *     summary: Grade submission
 *     description: |
 *       Grade a submission. Rules:
 *       - Only teacher who created the assignment can grade
 *       - Marks cannot exceed total marks
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Submission ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - marksAwarded
 *             properties:
 *               marksAwarded:
 *                 type: number
 *                 description: Marks awarded
 *               feedback:
 *                 type: string
 *                 description: Feedback comments
 *               rubrics:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     criteria:
 *                       type: string
 *                     marks:
 *                       type: number
 *                     comment:
 *                       type: string
 *                 description: Detailed grading rubrics
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
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Submission'
 *       400:
 *         description: Invalid marks or input
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized to grade this submission
 *       404:
 *         description: Submission not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/submissions/{id}/download/{fileId}:
 *   get:
 *     summary: Download submission file
 *     description: |
 *       Download a file from a submission.
 *       Access rules same as viewing submission.
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *         description: Submission ID
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
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
 *         description: Not authenticated
 *       403:
 *         description: Not authorized to access this file
 *       404:
 *         description: File not found
 *       500:
 *         description: Server error
 */

router.use(protect);

router
  .route("/")
  .get(getSubmissions)
  .post(fileUpload.upload.array("files"), createSubmission);

router.route("/:id").get(getSubmission).put(updateSubmission);

router.put("/:id/grade", gradeSubmission);
router.get("/:id/download/:fileId", downloadSubmissionFile);


module.exports = router;
