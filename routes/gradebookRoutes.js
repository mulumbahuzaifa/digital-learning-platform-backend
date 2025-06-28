const express = require('express');
const router = express.Router();
const {
  getGradebooks,
  getGradebook,
  createGradebook,
  updateGradebook,
  publishGradebook,
  deleteGradebook
} = require('../controllers/gradebookController');
const { protect, authorize } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Gradebook
 *   description: Student grade management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Gradebook:
 *       type: object
 *       required:
 *         - student
 *         - class
 *         - subject
 *         - teacher
 *         - academicYear
 *         - term
 *       properties:
 *         student:
 *           type: string
 *           format: objectId
 *           description: Reference to Student
 *         class:
 *           type: string
 *           format: objectId
 *           description: Reference to Class
 *         subject:
 *           type: string
 *           format: objectId
 *           description: Reference to Subject
 *         teacher:
 *           type: string
 *           format: objectId
 *           description: Reference to Teacher
 *         assignments:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               assignment:
 *                 type: string
 *                 format: objectId
 *               marks:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               grade:
 *                 type: string
 *               weight:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               feedback:
 *                 type: string
 *         tests:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               marks:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               date:
 *                 type: string
 *                 format: date
 *               weight:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *         exams:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               marks:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               date:
 *                 type: string
 *                 format: date
 *               weight:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *         totalMarks:
 *           type: number
 *           description: Auto-calculated total marks
 *         finalGrade:
 *           type: string
 *           enum: [A, B, C, D, F]
 *           description: Auto-calculated final grade
 *         positionInClass:
 *           type: number
 *           description: Student's position in class for this subject
 *         remarks:
 *           type: string
 *         academicYear:
 *           type: string
 *         term:
 *           type: string
 *           enum: [Term 1, Term 2, Term 3]
 *         isPublished:
 *           type: boolean
 *           default: false
 *         publishedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/gradebook:
 *   get:
 *     summary: Get all gradebook entries
 *     description: Retrieve gradebook entries with optional filtering
 *     tags: [Gradebook]
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
 *         name: student
 *         schema:
 *           type: string
 *         description: Filter by student ID
 *       - in: query
 *         name: academicYear
 *         schema:
 *           type: string
 *         description: Filter by academic year
 *       - in: query
 *         name: term
 *         schema:
 *           type: string
 *           enum: [Term 1, Term 2, Term 3]
 *         description: Filter by term
 *       - in: query
 *         name: isPublished
 *         schema:
 *           type: boolean
 *         description: Filter by published status
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
 *                     $ref: '#/components/schemas/Gradebook'
 *   
 *   post:
 *     summary: Create gradebook entry
 *     description: Create a new gradebook entry (Teachers and Admins only)
 *     tags: [Gradebook]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Gradebook'
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Gradebook'
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Not authorized
 */

/**
 * @swagger
 * /api/gradebook/{id}:
 *   get:
 *     summary: Get gradebook entry by ID
 *     tags: [Gradebook]
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
 *               $ref: '#/components/schemas/Gradebook'
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Not found
 *   
 *   put:
 *     summary: Update gradebook entry
 *     tags: [Gradebook]
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
 *             $ref: '#/components/schemas/Gradebook'
 *     responses:
 *       200:
 *         description: Updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Gradebook'
 *   
 *   delete:
 *     summary: Delete gradebook entry
 *     tags: [Gradebook]
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
 *         description: Deleted
 */

/**
 * @swagger
 * /api/gradebook/{id}/publish:
 *   put:
 *     summary: Publish gradebook entry
 *     description: Publish gradebook to make it visible to students/parents
 *     tags: [Gradebook]
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
 *         description: Published
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Gradebook'
 */

router.use(protect);

router.route('/')
  .get(getGradebooks)
  .post(authorize('teacher', 'admin'), createGradebook);

router.route('/:id')
  .get(getGradebook)
  .put(authorize('teacher', 'admin'), updateGradebook)
  .delete(authorize('teacher', 'admin'), deleteGradebook);

router.put('/:id/publish', authorize('teacher', 'admin'), publishGradebook);

module.exports = router;