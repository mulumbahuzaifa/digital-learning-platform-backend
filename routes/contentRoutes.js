const express = require('express');
const router = express.Router();
const {
  getContent,
  getSingleContent,
  createContent,
  updateContent,
  deleteContent,
  downloadContent
} = require('../controllers/contentController');
const { protect, authorize } = require('../middleware/auth');
const fileUpload = require('../utils/fileUpload');

/**
 * @swagger
 * tags:
 *   name: Content
 *   description: Learning content management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Content:
 *       type: object
 *       required:
 *         - title
 *         - type
 *         - class
 *         - subject
 *       properties:
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         type:
 *           type: string
 *           enum: [note, assignment, slide, video, audio, document, link, quiz]
 *         fileUrl:
 *           type: string
 *         thumbnail:
 *           type: string
 *         fileSize:
 *           type: number
 *         fileType:
 *           type: string
 *         class:
 *           type: string
 *           format: objectId
 *         subject:
 *           type: string
 *           format: objectId
 *         uploadedBy:
 *           type: string
 *           format: objectId
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         isPublic:
 *           type: boolean
 *         accessLevel:
 *           type: string
 *           enum: [class, school, public]
 *         downloads:
 *           type: number
 *         views:
 *           type: number
 *         createdAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/content:
 *   get:
 *     summary: Get all content
 *     description: Retrieve content with optional filtering
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: class
 *         schema:
 *           type: string
 *       - in: query
 *         name: subject
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [note, assignment, slide, video, audio, document, link, quiz]
 *       - in: query
 *         name: isPublic
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: accessLevel
 *         schema:
 *           type: string
 *           enum: [class, school, public]
 *       - in: query
 *         name: search
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
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Content'
 *   
 *   post:
 *     summary: Create content
 *     description: Upload new content (Teachers/Admins only)
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - type
 *               - class
 *               - subject
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [note, assignment, slide, video, audio, document, link, quiz]
 *               class:
 *                 type: string
 *               subject:
 *                 type: string
 *               file:
 *                 type: string
 *                 format: binary
 *               tags:
 *                 type: string
 *                 description: Comma-separated tags
 *               isPublic:
 *                 type: boolean
 *               accessLevel:
 *                 type: string
 *                 enum: [class, school, public]
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Content'
 *       400:
 *         description: Missing required fields or invalid file
 *       403:
 *         description: Not authorized to create content for this subject
 */

/**
 * @swagger
 * /api/content/{id}:
 *   get:
 *     summary: Get content by ID
 *     tags: [Content]
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
 *               $ref: '#/components/schemas/Content'
 *       403:
 *         description: Not authorized to access this content
 *       404:
 *         description: Content not found
 *   
 *   put:
 *     summary: Update content
 *     tags: [Content]
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
 *             $ref: '#/components/schemas/Content'
 *     responses:
 *       200:
 *         description: Updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Content'
 *       403:
 *         description: Not authorized to update this content
 *   
 *   delete:
 *     summary: Delete content
 *     tags: [Content]
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
 *       403:
 *         description: Not authorized to delete this content
 */

/**
 * @swagger
 * /api/content/{id}/download:
 *   get:
 *     summary: Download content
 *     tags: [Content]
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
 *         description: File download
 *       302:
 *         description: Redirect to file URL
 *       403:
 *         description: Not authorized to download this content
 */

// Protect all routes
router.use(protect);

router.route('/')
  .get(getContent)
  .post(authorize('teacher', 'admin'), fileUpload.upload.single('file'), createContent);

router.route('/:id')
  .get(getSingleContent)
  .put(authorize('teacher', 'admin'), updateContent)
  .delete(authorize('teacher', 'admin'), deleteContent);

router.get('/:id/download', downloadContent);

module.exports = router;