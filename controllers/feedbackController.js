const Feedback = require('../models/Feedback');
const User = require('../models/User');
const Class = require('../models/Class');
const Content = require('../models/Content');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Get all feedback
// @route   GET /api/feedback
// @access  Private
exports.getFeedback = asyncHandler(async (req, res, next) => {
  const { type, status, toUser, fromUser, class: classId, subject, contentItem } = req.query;
  
  let query = {};

  // Apply filters
  if (type) query.feedbackType = type;
  if (status) query.status = status;
  if (toUser) query.toUser = toUser;
  if (fromUser) query.fromUser = fromUser;
  if (classId) query.class = classId;
  if (subject) query.subject = subject;
  if (contentItem) query.contentItem = contentItem;

  // Role-based filtering
  switch (req.user.role) {
    case 'teacher':
      query.$or = [
        { toUser: req.user.id },
        { class: { $in: await getTeacherClasses(req.user.id) } }
      ];
      break;
    case 'student':
      query.fromUser = req.user.id;
      break;
    case 'admin':
      // Admins see all feedback
      break;
    default:
      query.fromUser = req.user.id;
  }

  const feedback = await Feedback.find(query)
    .populate({
      path: 'fromUser',
      select: 'firstName lastName avatar',
      match: { isAnonymous: { $ne: true } }
    })
    .populate({
      path: 'toUser',
      select: 'firstName lastName'
    })
    .populate('class', 'name code')
    .populate('subject', 'name code')
    .populate('contentItem', 'title')
    .populate('respondedBy', 'firstName lastName')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: feedback.length,
    data: feedback
  });
});

// @desc    Get single feedback
// @route   GET /api/feedback/:id
// @access  Private
exports.getSingleFeedback = asyncHandler(async (req, res, next) => {
  const feedback = await Feedback.findById(req.params.id)
    .populate({
      path: 'fromUser',
      select: 'firstName lastName avatar',
      match: { isAnonymous: { $ne: true } }
    })
    .populate('toUser', 'firstName lastName')
    .populate('class', 'name code')
    .populate('subject', 'name code')
    .populate('contentItem', 'title')
    .populate('respondedBy', 'firstName lastName');

  if (!feedback) {
    return next(new ErrorResponse(`Feedback not found with id of ${req.params.id}`, 404));
  }

  if (!hasFeedbackAccess(req.user, feedback)) {
    return next(new ErrorResponse('Not authorized to access this feedback', 403));
  }

  res.status(200).json({
    success: true,
    data: feedback
  });
});

// @desc    Submit feedback
// @route   POST /api/feedback
// @access  Private
exports.submitFeedback = asyncHandler(async (req, res, next) => {
  const { content, feedbackType, toUser, class: classId, subject, contentItem } = req.body;

  // Validate required fields
  if (!content || !feedbackType) {
    return next(new ErrorResponse('Content and feedback type are required', 400));
  }

  // Validate recipient if provided
  if (toUser) {
    const recipient = await User.findById(toUser);
    if (!recipient) {
      return next(new ErrorResponse(`Recipient not found with id of ${toUser}`, 404));
    }
  }

  // Validate class if provided
  if (classId) {
    const classObj = await Class.findById(classId);
    if (!classObj) {
      return next(new ErrorResponse(`Class not found with id of ${classId}`, 404));
    }

    // Verify user is associated with the class
    if (!await isUserInClass(req.user, classObj)) {
      return next(new ErrorResponse('Not authorized to submit feedback for this class', 403));
    }
  }

  // Validate content item if provided
  if (contentItem) {
    const content = await Content.findById(contentItem);
    if (!content) {
      return next(new ErrorResponse(`Content not found with id of ${contentItem}`, 404));
    }
  }

  // Create feedback
  const feedback = await Feedback.create({
    ...req.body,
    fromUser: req.user.id,
    status: 'submitted'
  });

  res.status(201).json({
    success: true,
    data: feedback
  });
});

// @desc    Respond to feedback
// @route   PUT /api/feedback/:id/respond
// @access  Private/Admin or Recipient
exports.respondToFeedback = asyncHandler(async (req, res, next) => {
  let feedback = await Feedback.findById(req.params.id);

  if (!feedback) {
    return next(new ErrorResponse(`Feedback not found with id of ${req.params.id}`, 404));
  }

  // Check authorization
  if (!canRespondToFeedback(req.user, feedback)) {
    return next(new ErrorResponse('Not authorized to respond to this feedback', 403));
  }

  // Update feedback
  feedback.response = req.body.response;
  feedback.status = req.body.status || feedback.status;
  feedback.respondedBy = req.user.id;
  feedback.respondedAt = Date.now();
  feedback = await feedback.save();

  res.status(200).json({
    success: true,
    data: feedback
  });
});

// @desc    Update feedback
// @route   PUT /api/feedback/:id
// @access  Private/Owner or Admin
exports.updateFeedback = asyncHandler(async (req, res, next) => {
  let feedback = await Feedback.findById(req.params.id);

  if (!feedback) {
    return next(new ErrorResponse(`Feedback not found with id of ${req.params.id}`, 404));
  }

  // Check authorization
  if (!canUpdateFeedback(req.user, feedback)) {
    return next(new ErrorResponse('Not authorized to update this feedback', 403));
  }

  // Prevent certain fields from being updated
  const { response, respondedBy, respondedAt, status, ...updateData } = req.body;

  feedback = await Feedback.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: feedback
  });
});

// @desc    Delete feedback
// @route   DELETE /api/feedback/:id
// @access  Private/Owner or Admin
exports.deleteFeedback = asyncHandler(async (req, res, next) => {
  const feedback = await Feedback.findById(req.params.id);

  if (!feedback) {
    return next(new ErrorResponse(`Feedback not found with id of ${req.params.id}`, 404));
  }

  if (!canDeleteFeedback(req.user, feedback)) {
    return next(new ErrorResponse('Not authorized to delete this feedback', 403));
  }

  await feedback.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// Helper Functions

async function getTeacherClasses(teacherId) {
  const classes = await Class.find({
    'subjects.teachers.teacher': teacherId,
    'subjects.teachers.status': 'approved'
  });
  return classes.map(c => c._id);
}

async function isUserInClass(user, classObj) {
  if (user.role === 'teacher') {
    return classObj.subjects.some(s =>
      s.teachers.some(t => t.teacher.toString() === user.id && t.status === 'approved')
    );
  }
  return classObj.students.some(s =>
    s.student.toString() === user.id && s.status === 'approved'
  );
}

function hasFeedbackAccess(user, feedback) {
  if (user.role === 'admin') return true;
  if (feedback.fromUser.toString() === user.id) return true;
  if (feedback.toUser && feedback.toUser.toString() === user.id) return true;
  return false;
}

function canRespondToFeedback(user, feedback) {
  if (user.role === 'admin') return true;
  if (feedback.toUser && feedback.toUser.toString() === user.id) return true;
  return false;
}

function canUpdateFeedback(user, feedback) {
  if (user.role === 'admin') return true;
  if (feedback.fromUser.toString() === user.id) return true;
  return false;
}

function canDeleteFeedback(user, feedback) {
  if (user.role === 'admin') return true;
  if (feedback.fromUser.toString() === user.id) return true;
  return false;
}