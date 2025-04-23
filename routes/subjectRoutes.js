const express = require("express");
const router = express.Router();
const {
  getSubjects,
  getSubject,
  createSubject,
  updateSubject,
  deleteSubject,
  getSubjectClasses,
} = require("../controllers/subjectController");
const { protect, role } = require("../middleware/auth");

/**
 * @swagger
 * tags:
 *   name: Subjects
 *   description: Subject management and operations
 */


/**
 * @swagger
 * /api/subjects:
 *   get:
 *     summary: Get all subjects
 *     description: Retrieve all subjects with optional filtering by category and subCategory
 *     tags: [Subjects]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [compulsory, elective]
 *         description: Filter subjects by category
 *       - in: query
 *         name: subCategory
 *         schema:
 *           type: string
 *           enum: [languages, sciences, mathematics, humanities, vocational, arts, technology]
 *         description: Filter subjects by sub-category
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
 *                     $ref: '#/components/schemas/Subject'
 *   
 *   post:
 *     summary: Create new subject
 *     description: Create a new subject (Admin only)
 *     tags: [Subjects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Subject'
 *     responses:
 *       201:
 *         description: Subject created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Subject'
 *       400:
 *         description: Subject with this name or code already exists
 */

/**
 * @swagger
 * /api/subjects/{id}:
 *   get:
 *     summary: Get subject by ID
 *     tags: [Subjects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Subject ID
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
 *                   $ref: '#/components/schemas/Subject'
 *       404:
 *         description: Subject not found
 *   
 *   put:
 *     summary: Update subject
 *     description: Update subject details (Admin only)
 *     tags: [Subjects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Subject ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Subject'
 *     responses:
 *       200:
 *         description: Subject updated successfully
 *       400:
 *         description: Another subject with this name or code already exists
 *       404:
 *         description: Subject not found
 *   
 *   delete:
 *     summary: Delete subject
 *     description: Delete a subject (Admin only)
 *     tags: [Subjects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Subject ID
 *     responses:
 *       200:
 *         description: Subject deleted successfully
 *       404:
 *         description: Subject not found
 */

/**
 * @swagger
 * /api/subjects/{id}/classes:
 *   get:
 *     summary: Get classes for a subject
 *     description: Retrieve all classes that offer this subject
 *     tags: [Subjects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Subject ID
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
 *                     $ref: '#/components/schemas/Class'
 */

router.route("/").get(getSubjects).post(protect, role("admin"), createSubject);

router
  .route("/:id")
  .get(getSubject)
  .put(protect, role("admin"), updateSubject)
  .delete(protect, role("admin"), deleteSubject);

router.get("/:id/classes", protect, getSubjectClasses);

module.exports = router;
