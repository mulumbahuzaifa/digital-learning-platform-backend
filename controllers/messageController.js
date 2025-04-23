const Message = require("../models/Message");
const User = require("../models/User");
const Class = require("../models/Class");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get all messages
// @route   GET /api/messages
// @access  Private
exports.getMessages = async (req, res, next) => {
  try {
    let query = {};

    // For individual messages
    if (req.query.recipient) {
      query.$or = [
        { sender: req.user.id, recipient: req.query.recipient },
        { sender: req.query.recipient, recipient: req.user.id },
      ];
    }

    // For group messages
    else if (req.query.group) {
      query.group = req.query.group;
    }

    // For class messages
    else if (req.query.class) {
      query.class = req.query.class;
    }

    // Default to all messages involving the user
    else {
      query.$or = [
        { sender: req.user.id },
        { recipient: req.user.id },
        { group: { $in: req.user.groups } },
        { class: { $in: req.user.classes } },
      ];
    }

    const messages = await Message.find(query)
      .populate("sender", "firstName lastName avatar")
      .populate("recipient", "firstName lastName avatar")
      .populate("class", "name code")
      .sort("-createdAt");

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single message
// @route   GET /api/messages/:id
// @access  Private
exports.getMessage = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id)
      .populate("sender", "firstName lastName avatar")
      .populate("recipient", "firstName lastName avatar")
      .populate("class", "name code");

    if (!message) {
      return next(
        new ErrorResponse(`Message not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if user has access to this message
    const hasAccess = await checkMessageAccess(req.user, message);
    if (!hasAccess) {
      return next(
        new ErrorResponse("Not authorized to access this message", 403)
      );
    }

    // Mark as read if recipient
    if (
      message.recipient &&
      message.recipient._id.toString() === req.user.id &&
      !message.isRead
    ) {
      message.isRead = true;
      message.readAt = new Date();
      await message.save();
    }

    res.status(200).json({
      success: true,
      data: message,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Send message
// @route   POST /api/messages
// @access  Private
exports.sendMessage = async (req, res, next) => {
  try {
    // Validate recipient or group/class
    if (!req.body.recipient && !req.body.group && !req.body.class) {
      return next(
        new ErrorResponse("Please specify a recipient, group, or class", 400)
      );
    }

    // Validate recipient exists and is not self
    if (req.body.recipient) {
      const recipient = await User.findById(req.body.recipient);
      if (!recipient) {
        return next(
          new ErrorResponse(
            `Recipient not found with id of ${req.body.recipient}`,
            404
          )
        );
      }
      if (recipient._id.toString() === req.user.id) {
        return next(new ErrorResponse("Cannot send message to yourself", 400));
      }
    }

    // Validate class exists and user is member
    if (req.body.class) {
      const classObj = await Class.findById(req.body.class);
      if (!classObj) {
        return next(
          new ErrorResponse(`Class not found with id of ${req.body.class}`, 404)
        );
      }

      // Check if user is teacher or student in this class
      const isTeacher = classObj.subjects.some((s) =>
        s.teachers.some(
          (t) => t.teacher.toString() === req.user.id && t.status === "approved"
        )
      );

      const isStudent = classObj.students.some(
        (s) => s.student.toString() === req.user.id && s.status === "approved"
      );

      if (!isTeacher && !isStudent) {
        return next(
          new ErrorResponse(
            "Not authorized to send messages to this class",
            403
          )
        );
      }
    }

    const message = await Message.create({
      ...req.body,
      sender: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update message
// @route   PUT /api/messages/:id
// @access  Private
exports.updateMessage = async (req, res, next) => {
  try {
    let message = await Message.findById(req.params.id);

    if (!message) {
      return next(
        new ErrorResponse(`Message not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if user is sender
    if (message.sender.toString() !== req.user.id) {
      return next(
        new ErrorResponse("Not authorized to update this message", 403)
      );
    }

    // Only allow content updates
    message.content = req.body.content || message.content;
    message.isEdited = true;

    await message.save();

    res.status(200).json({
      success: true,
      data: message,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete message
// @route   DELETE /api/messages/:id
// @access  Private
exports.deleteMessage = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return next(
        new ErrorResponse(`Message not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if user is sender or recipient
    if (
      message.sender.toString() !== req.user.id &&
      message.recipient &&
      message.recipient.toString() !== req.user.id
    ) {
      return next(
        new ErrorResponse("Not authorized to delete this message", 403)
      );
    }

    await message.remove();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// Helper function to check message access
const checkMessageAccess = async (user, message) => {
  // Admins have access to everything
  if (user.role === "admin") return true;

  // Sender or recipient has access
  if (
    message.sender.toString() === user.id ||
    (message.recipient && message.recipient.toString() === user.id)
  ) {
    return true;
  }

  // For class messages, check if user is in the class
  if (message.class) {
    const classObj = await Class.findById(message.class);
    if (!classObj) return false;

    // Check if teacher
    const isTeacher = classObj.subjects.some((s) =>
      s.teachers.some(
        (t) => t.teacher.toString() === user.id && t.status === "approved"
      )
    );

    // Check if student
    const isStudent = classObj.students.some(
      (s) => s.student.toString() === user.id && s.status === "approved"
    );

    return isTeacher || isStudent;
  }

  // For group messages, check if user is in the group
  if (message.group) {
    // Implement group membership check if needed
    return false;
  }

  return false;
};
