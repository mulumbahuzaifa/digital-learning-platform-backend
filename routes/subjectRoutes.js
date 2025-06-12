const express = require("express");
const router = express.Router();
const {
  getSubjects,
  getSubject,
  createSubject,
  updateSubject,
  deleteSubject,
  getSubjectClasses,
  getSubjectTeachers,
  getSubjectStudents,
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
 * components:
 *   schemas:
 *     Subject:
 *       type: object
 *       required:
 *         - name
 *         - code
 *         - category
 *         - subCategory
 *       properties:
 *         name:
 *           type: string
 *           description: Subject name
 *         code:
 *           type: string
 *           description: Unique subject code
 *         category:
 *           type: string
 *           enum: [compulsory, elective]
 *           description: Subject category
 *         subCategory:
 *           type: string
 *           enum: [languages, sciences, mathematics, humanities, vocational, arts, technology]
 *           description: Subject sub-category
 *         description:
 *           type: string
 *           description: Subject description
 *         syllabus:
 *           type: string
 *           description: URL to syllabus document
 *         isActive:
 *           type: boolean
 *           default: true
 *           description: Whether the subject is active
 */

/**
 * @swagger
 * /api/subjects:
 *   get:
 *     summary: Get all subjects
 *     description: Retrieve all subjects with filtering, sorting, and pagination
 *     tags: [Subjects]
 *     security:
 *       - bearerAuth: []
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
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name, code, and description
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Sort fields (prefix with - for descending)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
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
 *                 total:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 currentPage:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Subject'
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden
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
 *         description: Subject with this code already exists
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Admin access required
 */

/**
 * @swagger
 * /api/subjects/{id}:
 *   get:
 *     summary: Get subject by ID
 *     description: Retrieve a specific subject with access control
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
 *                 data:
 *                   $ref: '#/components/schemas/Subject'
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Not authorized to access this subject
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
 *         description: Another subject with this code already exists
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Admin access required
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
 *       400:
 *         description: Cannot delete subject that is assigned to classes
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Admin access required
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
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Class'
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Not authorized to access this subject
 *       404:
 *         description: Subject not found
 */

/**
 * @swagger
 * /api/subjects/{id}/teachers:
 *   get:
 *     summary: Get teachers for a subject
 *     description: Retrieve all teachers assigned to this subject
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
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *                       email:
 *                         type: string
 *                       avatar:
 *                         type: string
 *                       role:
 *                         type: string
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Not authorized to access this subject
 *       404:
 *         description: Subject not found
 */

/**
 * @swagger
 * /api/subjects/{id}/students:
 *   get:
 *     summary: Get students for a subject
 *     description: Retrieve all students enrolled in classes with this subject (Teacher only)
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
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *                       email:
 *                         type: string
 *                       avatar:
 *                         type: string
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Forbidden - Not authorized to access this subject
 *       404:
 *         description: Subject not found
 */

// Apply authentication middleware
router.use(protect);

// Routes
router.route("/").get(getSubjects).post(role("admin"), createSubject);

router
  .route("/:id")
  .get(getSubject)
  .put(role("admin"), updateSubject)
  .delete(role("admin"), deleteSubject);

router.get("/:id/classes", getSubjectClasses);
router.get("/:id/teachers", getSubjectTeachers);
router.get("/:id/students", getSubjectStudents);

module.exports = router;
