const express = require("express");
const router = express.Router();
const {
  getClasses,
  getClass,
  createClass,
  updateClass,
  deleteClass,
  addSubjectToClass,
  removeSubjectFromClass,
  assignTeacherToSubject,
  removeTeacherFromSubject,
  assignPrefect,
  removePrefect,
  getMyClasses,
} = require("../controllers/classController");
const { protect, role } = require("../middleware/auth");

/**
 * @swagger
 * tags:
 *   name: Classes
 *   description: Class management and operations
 */

/**
 * @swagger
 * /api/classes:
 *   get:
 *     summary: Get all classes
 *     description: Retrieve all classes with optional filtering
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: string
 *       - in: query
 *         name: term
 *         schema:
 *           type: string
 *       - in: query
 *         name: subject
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
 *                 count:
 *                   type: number
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Class'
 *
 *   post:
 *     summary: Create new class
 *     description: Create a new class (Admin only)
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Class'
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Class'
 */

/**
 * @swagger
 * /api/classes/{id}:
 *   get:
 *     summary: Get class by ID
 *     tags: [Classes]
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
 *               $ref: '#/components/schemas/Class'
 *
 *   put:
 *     summary: Update class
 *     tags: [Classes]
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
 *             $ref: '#/components/schemas/Class'
 *     responses:
 *       200:
 *         description: Success
 *
 *   delete:
 *     summary: Delete class
 *     tags: [Classes]
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
 * /api/classes/{id}/subjects:
 *   post:
 *     summary: Add subject to class
 *     tags: [Classes]
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
 *               - subject
 *             properties:
 *               subject:
 *                 type: string
 *                 format: objectId
 *     responses:
 *       200:
 *         description: Success
 */

/**
 * @swagger
 * /api/classes/{id}/subjects/{subjectId}:
 *   delete:
 *     summary: Remove subject from class
 *     description: Remove a subject from a class (Admin only)
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Class ID
 *       - in: path
 *         name: subjectId
 *         required: true
 *         schema:
 *           type: string
 *         description: Subject ID to remove from class
 *     responses:
 *       200:
 *         description: Subject removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Class'
 *       404:
 *         description: Class or subject not found
 *       400:
 *         description: Invalid request
 */

/**
 * @swagger
 * /api/classes/{id}/subjects/{subjectId}/teachers:
 *   post:
 *     summary: Assign teacher to subject in class
 *     description: Assign a teacher to teach a subject in a class (Admin only)
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Class ID
 *       - in: path
 *         name: subjectId
 *         required: true
 *         schema:
 *           type: string
 *         description: Subject ID within the class
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - teacher
 *             properties:
 *               teacher:
 *                 type: string
 *                 description: Teacher ID to assign
 *               isLeadTeacher:
 *                 type: boolean
 *                 default: false
 *                 description: Whether this teacher is the lead for the subject
 *     responses:
 *       200:
 *         description: Teacher assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Class'
 *       404:
 *         description: Class, subject or teacher not found
 *       400:
 *         description: Teacher already assigned or invalid request
 */

/**
 * @swagger
 * /api/classes/{id}/subjects/{subjectId}/teachers/{teacherId}:
 *   delete:
 *     summary: Remove teacher from subject in class
 *     description: Remove a teacher from teaching a subject in a class (Admin only)
 *     tags: [Classes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Class ID
 *       - in: path
 *         name: subjectId
 *         required: true
 *         schema:
 *           type: string
 *         description: Subject ID within the class
 *       - in: path
 *         name: teacherId
 *         required: true
 *         schema:
 *           type: string
 *         description: Teacher ID to remove
 *     responses:
 *       200:
 *         description: Teacher removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Class'
 *       404:
 *         description: Class, subject or teacher not found
 */

/**
 * @swagger
 * /api/classes/my-classes:
 *   get:
 *     summary: Get my classes
 *     description: Get classes for logged-in teacher or student
 *     tags: [Classes]
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
 *                 count:
 *                   type: number
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Class'
 */

// Protect all routes
router.use(protect);

router.get("/my-classes", getMyClasses);

router.route("/").get(getClasses).post(role("admin"), createClass);

router
  .route("/:id")
  .get(getClass)
  .put(role("admin", "teacher"), updateClass)
  .delete(role("admin"), deleteClass);

router.route("/:id/subjects").post(role("admin"), addSubjectToClass);

router
  .route("/:id/subjects/:subjectId")
  .delete(role("admin"), removeSubjectFromClass);

router
  .route("/:id/subjects/:subjectId/teachers")
  .post(role("admin"), assignTeacherToSubject);

router
  .route("/:id/subjects/:subjectId/teachers/:teacherId")
  .delete(role("admin"), removeTeacherFromSubject);

router.route("/:id/prefects").post(role("admin", "teacher"), assignPrefect);

router
  .route("/:id/prefects/:prefectId")
  .delete(role("admin", "teacher"), removePrefect);

module.exports = router;
