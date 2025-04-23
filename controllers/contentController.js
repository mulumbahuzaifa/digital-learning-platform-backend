const Content = require('../models/Content');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const fileUpload = require('../utils/fileUpload');
const fs = require('fs');
const path = require('path');

// @desc    Get all content
// @route   GET /api/content
// @access  Private
exports.getContent = asyncHandler(async (req, res, next) => {
  // Build query based on request parameters
  const { class: classId, subject, type, isPublic, accessLevel, search } = req.query;
  
  let query = {};
  
  // Filter by class if provided
  if (classId) {
    query.class = classId;
  }
  
  // Filter by subject if provided
  if (subject) {
    query.subject = subject;
  }
  
  // Filter by content type if provided
  if (type) {
    query.type = type;
  }
  
  // Filter by public/private status if provided
  if (isPublic) {
    query.isPublic = isPublic === 'true';
  }
  
  // Filter by access level if provided
  if (accessLevel) {
    query.accessLevel = accessLevel;
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $regex: search, $options: 'i' } }
    ];
  }
  
  // Add access control for non-admins
  if (req.user.role !== 'admin') {
    query.$or = [
      { accessLevel: 'public' },
      { accessLevel: 'school' },
      { 
        accessLevel: 'class',
        class: { $in: await getUsersClasses(req.user.id) }
      },
      { uploadedBy: req.user.id }
    ];
  }

  const content = await Content.find(query)
    .populate('class', 'name code')
    .populate('subject', 'name code')
    .populate('uploadedBy', 'firstName lastName')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: content.length,
    data: content
  });
});

// Helper function to get user's classes
async function getUsersClasses(userId) {
  const classes = await Class.find({
    $or: [
      { 'students.student': userId },
      { 'subjects.teachers.teacher': userId }
    ]
  });
  return classes.map(c => c._id);
}

// @desc    Get single content
// @route   GET /api/content/:id
// @access  Private
exports.getSingleContent = asyncHandler(async (req, res, next) => {
  const content = await Content.findById(req.params.id)
    .populate('class', 'name code')
    .populate('subject', 'name code')
    .populate('uploadedBy', 'firstName lastName email');
    
  if (!content) {
    return next(
      new ErrorResponse(`Content not found with id of ${req.params.id}`, 404)
    );
  }
  // Check access permissions
  if (!hasAccess(content, req.user)) {
    return next(new ErrorResponse('Not authorized to access this content', 403));
  }
  
  // Increment view count
  content.views += 1;
  await content.save();
  
  res.status(200).json({
    success: true,
    data: content
  });
});

// Helper function to check access
function hasAccess(content, user) {
  if (user.role === 'admin') return true;
  if (content.uploadedBy.equals(user._id)) return true;
  
  if (content.accessLevel === 'public') return true;
  if (content.accessLevel === 'school' && user.role !== 'student') return true;
  
  if (content.accessLevel === 'class') {
    // Check if user is in the same class
    // This would require additional queries or pre-populated data
    return true; // Simplified for example
  }
  
  return false;
}

// @desc    Create content
// @route   POST /api/content
// @access  Private/Teacher,Admin
exports.createContent = asyncHandler(async (req, res, next) => {
  // Verify required fields
  const { title, type, class: classId, subject: subjectId } = req.body;
  if (!title || !type || !classId || !subjectId) {
    return next(new ErrorResponse('Missing required fields', 400));
  }

  // Verify class exists
  const classObj = await Class.findById(classId);
  if (!classObj) {
    return next(new ErrorResponse(`Class not found with id of ${classId}`, 404));
  }

  // Verify subject exists
  const subject = await Subject.findById(subjectId);
  if (!subject) {
    return next(new ErrorResponse(`Subject not found with id of ${subjectId}`, 404));
  }

  // Check if teacher is assigned to this subject in this class
  if (req.user.role === 'teacher') {
    const isAssigned = classObj.subjects.some(
      sub => sub.subject.toString() === subjectId && 
             sub.teachers.some(t => t.teacher.toString() === req.user.id)
    );
    
    if (!isAssigned) {
      return next(new ErrorResponse('Not authorized to add content for this subject', 403));
    }
  }

  // Handle file upload
  let fileData = {};
  if (req.file) {
    try {
      fileData = await fileUpload.uploadFile(req.file);
    } catch (err) {
      return next(new ErrorResponse('File upload failed', 500));
    }
  } else if (type !== 'link') {
    return next(new ErrorResponse('File is required for this content type', 400));
  }

  // Create content
  const content = await Content.create({
    ...req.body,
    fileUrl: fileData.url,
    fileSize: fileData.size,
    fileType: fileData.mimetype,
    uploadedBy: req.user.id
  });

  res.status(201).json({
    success: true,
    data: content
  });
});

// @desc    Update content
// @route   PUT /api/content/:id
// @access  Private/Teacher,Admin
exports.updateContent = asyncHandler(async (req, res, next) => {
  let content = await Content.findById(req.params.id);
  
  if (!content) {
    return next(
      new ErrorResponse(`Content not found with id of ${req.params.id}`, 404)
    );
  }
  
  // Check ownership
  if (content.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse('Not authorized to update this content', 403));
  }
  
  // Handle file update
  let fileData = {};
  if (req.file) {
    try {
      // Delete old file if exists
      if (content.fileUrl) {
        await fileUpload.deleteFile(content.fileUrl);
      }
      
      fileData = await fileUpload.uploadFile(req.file);
      req.body.fileUrl = fileData.url;
      req.body.fileSize = fileData.size;
      req.body.fileType = fileData.mimetype;
    } catch (err) {
      return next(new ErrorResponse('File upload failed', 500));
    }
  }

  // Update content
  content = await Content.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: content
  });
});

// @desc    Delete content
// @route   DELETE /api/content/:id
// @access  Private/Teacher,Admin
exports.deleteContent = asyncHandler(async (req, res, next) => {
  const content = await Content.findById(req.params.id);

  if (!content) {
    return next(new ErrorResponse(`Content not found with id of ${req.params.id}`, 404));
  }

  // Check ownership
  if (content.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
    return next(new ErrorResponse('Not authorized to delete this content', 403));
  }

  // Delete associated file
  if (content.fileUrl) {
    try {
      await fileUpload.deleteFile(content.fileUrl);
    } catch (err) {
      console.error('Error deleting file:', err);
      // Continue with content deletion even if file deletion fails
    }
  }

  await content.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Download content
// @route   GET /api/content/:id/download
// @access  Private
exports.downloadContent = asyncHandler(async (req, res, next) => {
  const content = await Content.findById(req.params.id);

  if (!content) {
    return next(new ErrorResponse(`Content not found with id of ${req.params.id}`, 404));
  }

  // Check access permissions
  if (!hasAccess(content, req.user)) {
    return next(new ErrorResponse('Not authorized to download this content', 403));
  }

  // Increment download count
  content.downloads += 1;
  await content.save();

  // For local files
  if (content.fileUrl.startsWith('/uploads/')) {
    const filePath = path.join(__dirname, '../public', content.fileUrl);
    if (fs.existsSync(filePath)) {
      return res.download(filePath, content.title + path.extname(content.fileUrl));
    }
    return next(new ErrorResponse('File not found', 404));
  }

  // For external URLs
  res.redirect(content.fileUrl);
});

// Helper function to check content access
const checkContentAccess = async (user, content) => {
  // Admins have access to everything
  if (user.role === 'admin') return true;
  
  // Content owner has access
  if (content.uploadedBy.toString() === user.id) return true;
  
  // Public content is accessible to all
  if (content.accessLevel === 'public') return true;
  
  // School-level content is accessible to all school members
  if (content.accessLevel === 'school') {
    // Implement school membership check if needed
    return true;
  }
  
  // Class-level content
  if (content.accessLevel === 'class') {
    // For teachers - check if they teach this subject in this class
    if (user.role === 'teacher') {
      const classObj = await Class.findById(content.class);
      if (!classObj) return false;
      
      return classObj.subjects.some(s => 
        s.subject.toString() === content.subject.toString() &&
        s.teachers.some(t => 
          t.teacher.toString() === user.id && 
          t.status === 'approved'
        )
      );
    }
    
    // For students - check if they're in this class
    if (user.role === 'student') {
      const classObj = await Class.findById(content.class);
      if (!classObj) return false;
      
      return classObj.students.some(s => 
        s.student.toString() === user.id && 
        s.status === 'approved'
      );
    }
  }
  
  return false;
};