const Notification = require('../models/Notification');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Get all notifications
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = asyncHandler(async (req, res, next) => {
  const notifications = await Notification.find({ recipient: req.user.id })
    .sort('-createdAt')
    .populate('sender', 'firstName lastName avatar')
    .populate('relatedEntity');

  res.status(200).json({
    success: true,
    count: notifications.length,
    data: notifications
  });
});

// @desc    Create notification
// @route   POST /api/notifications
// @access  Private/Admin/Teacher
exports.createNotification = asyncHandler(async (req, res, next) => {
  // Only admins and teachers can create notifications for other users
  if (req.user.role !== 'admin' && req.user.role !== 'teacher' && req.body.recipient && req.body.recipient !== req.user.id) {
    return next(
      new ErrorResponse('Not authorized to create notifications for other users', 403)
    );
  }

  // Set sender to current user if not specified
  if (!req.body.sender) {
    req.body.sender = req.user.id;
  }

  const notification = await Notification.create(req.body);

  res.status(201).json({
    success: true,
    data: notification
  });
});

// @desc    Update notification
// @route   PUT /api/notifications/:id
// @access  Private/Admin/Teacher
exports.updateNotification = asyncHandler(async (req, res, next) => {
  let notification = await Notification.findById(req.params.id);

  if (!notification) {
    return next(
      new ErrorResponse(`Notification not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if user is admin, teacher, or the sender
  if (req.user.role !== 'admin' && req.user.role !== 'teacher' && notification.sender.toString() !== req.user.id) {
    return next(
      new ErrorResponse('Not authorized to update this notification', 403)
    );
  }

  // Prevent changing recipient or sender
  const { recipient, sender, ...updateData } = req.body;

  notification = await Notification.findByIdAndUpdate(
    req.params.id,
    updateData,
    {
      new: true,
      runValidators: true
    }
  );

  res.status(200).json({
    success: true,
    data: notification
  });
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    return next(
      new ErrorResponse(`Notification not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if user is recipient
  if (notification.recipient.toString() !== req.user.id) {
    return next(
      new ErrorResponse('Not authorized to update this notification', 403)
    );
  }

  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();

  res.status(200).json({
    success: true,
    data: notification
  });
});

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = asyncHandler(async (req, res, next) => {
  await Notification.updateMany(
    { recipient: req.user.id, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );

  res.status(200).json({
    success: true,
    message: 'All notifications marked as read'
  });
});

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private/Admin/Teacher
exports.deleteNotification = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    return next(
      new ErrorResponse(`Notification not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if user is recipient, admin, teacher, or the sender
  if (
    notification.recipient.toString() !== req.user.id && 
    req.user.role !== 'admin' && 
    req.user.role !== 'teacher' && 
    (notification.sender && notification.sender.toString() !== req.user.id)
  ) {
    return next(
      new ErrorResponse('Not authorized to delete this notification', 403)
    );
  }

  await notification.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Clear all notifications
// @route   DELETE /api/notifications
// @access  Private
exports.clearNotifications = asyncHandler(async (req, res, next) => {
  await Notification.deleteMany({ recipient: req.user.id });

  res.status(200).json({
    success: true,
    message: 'All notifications cleared'
  });
});