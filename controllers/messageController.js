const Message = require("../models/Message");
const User = require("../models/User");
const Class = require("../models/Class");
const AcademicEnrollment = require("../models/AcademicEnrollment");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");
const { sendNotification } = require("../utils/notifications");

// @desc    Get all messages
// @route   GET /api/messages
// @access  Private
exports.getMessages = asyncHandler(async (req, res, next) => {
  let query = {};
  const { recipient, class: classId, subject, status, search } = req.query;

  // For individual messages
  if (recipient) {
    query.$or = [
      { sender: req.user._id, recipient: recipient },
      { sender: recipient, recipient: req.user._id },
    ];
  }

  // For class messages
  else if (classId) {
    query.class = classId;
  }

  // For subject messages
  else if (subject) {
    query.subject = subject;
  }

  // Default to all messages involving the user
  else {
    // Get user's classes based on role
    let classIds = [];
    if (req.user.role === "student") {
      const enrollments = await AcademicEnrollment.find({
        student: req.user._id,
        status: "active",
      });
      classIds = enrollments.map((e) => e.class);
    } else if (req.user.role === "teacher") {
      const teacherClasses = await Class.find({
        "subjects.teachers": {
          $elemMatch: {
            teacher: req.user._id,
            status: "approved",
          },
        },
      });
      classIds = teacherClasses.map((c) => c._id);
    }

    query.$or = [
      { sender: req.user._id },
      { recipient: req.user._id },
      { class: { $in: classIds } },
    ];
  }

  // Add search functionality
  if (search) {
    query.$or = [
      { content: { $regex: search, $options: "i" } },
      { "attachments.name": { $regex: search, $options: "i" } },
    ];
  }

  // Add status filter
  if (status === "unread") {
    query.isRead = false;
  } else if (status === "read") {
    query.isRead = true;
  }

  const messages = await Message.find(query)
    .populate("sender", "firstName lastName avatar role")
    .populate("recipient", "firstName lastName avatar role")
    .populate("class", "name code level stream")
    .populate("subject", "name code")
    .sort("-createdAt");

  res.status(200).json({
    success: true,
    count: messages.length,
    data: messages,
  });
});

// @desc    Get single message
// @route   GET /api/messages/:id
// @access  Private
exports.getMessage = asyncHandler(async (req, res, next) => {
  const message = await Message.findById(req.params.id)
    .populate("sender", "firstName lastName avatar role")
    .populate("recipient", "firstName lastName avatar role")
    .populate("class", "name code level stream")
    .populate("subject", "name code");

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
    message.recipient._id.toString() === req.user._id.toString() &&
    !message.isRead
  ) {
    message.isRead = true;
    message.readAt = new Date();
    await message.save();

    // Send notification to sender
    // await sendNotification({
    //   recipient: message.sender,
    //   type: "message_read",
    //   title: "Message Read",
    //   message: `${req.user.firstName} has read your message`,
    //   data: {
    //     messageId: message._id,
    //   },
    // });
  }

  res.status(200).json({
    success: true,
    data: message,
  });
});

// @desc    Send message
// @route   POST /api/messages
// @access  Private
exports.sendMessage = asyncHandler(async (req, res, next) => {
  // Validate recipient or class/subject
  if (!req.body.recipient && !req.body.class && !req.body.subject) {
    return next(
      new ErrorResponse("Please specify a recipient, class, or subject", 400)
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
    if (recipient._id.toString() === req.user._id.toString()) {
      return next(new ErrorResponse("Cannot send message to yourself", 400));
    }
  }

  // Validate class exists and user has access
  if (req.body.class) {
    const classObj = await Class.findById(req.body.class);
    if (!classObj) {
      return next(
        new ErrorResponse(`Class not found with id of ${req.body.class}`, 404)
      );
    }

    // Check if user has access to this class
    const hasAccess = await checkClassAccess(req.user, classObj);
    if (!hasAccess) {
      return next(
        new ErrorResponse("Not authorized to send messages to this class", 403)
      );
    }
  }

  // Validate subject if provided
  if (req.body.subject) {
    const classObj = await Class.findById(req.body.class);
    if (!classObj) {
      return next(
        new ErrorResponse(
          "Class must be specified when sending subject messages",
          400
        )
      );
    }

    const subjectExists = classObj.subjects.some(
      (s) => s.subject.toString() === req.body.subject
    );
    if (!subjectExists) {
      return next(
        new ErrorResponse("Subject is not assigned to this class", 400)
      );
    }
  }

  const message = await Message.create({
    ...req.body,
    sender: req.user._id,
  });

  // Send notification to recipient
  // if (message.recipient) {
  //   await sendNotification({
  //     recipient: message.recipient,
  //     type: "new_message",
  //     title: "New Message",
  //     message: `You have a new message from ${req.user.firstName}`,
  //     data: {
  //       messageId: message._id,
  //     },
  //   });
  // }

  res.status(201).json({
    success: true,
    data: message,
  });
});

// @desc    Update message
// @route   PUT /api/messages/:id
// @access  Private
exports.updateMessage = asyncHandler(async (req, res, next) => {
  let message = await Message.findById(req.params.id);

  if (!message) {
    return next(
      new ErrorResponse(`Message not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if user is sender
  if (message.sender.toString() !== req.user._id.toString()) {
    return next(
      new ErrorResponse("Not authorized to update this message", 403)
    );
  }

  // Only allow content updates within 24 hours
  const messageAge = Date.now() - message.createdAt;
  if (messageAge > 24 * 60 * 60 * 1000) {
    return next(
      new ErrorResponse("Messages can only be edited within 24 hours", 400)
    );
  }

  // Only allow content updates
  message.content = req.body.content || message.content;
  message.isEdited = true;
  message.updatedAt = Date.now();

  await message.save();

  res.status(200).json({
    success: true,
    data: message,
  });
});

// @desc    Delete message
// @route   DELETE /api/messages/:id
// @access  Private
exports.deleteMessage = asyncHandler(async (req, res, next) => {
  const message = await Message.findById(req.params.id);

  if (!message) {
    return next(
      new ErrorResponse(`Message not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if user is sender or recipient
  if (
    message.sender.toString() !== req.user._id.toString() &&
    message.recipient &&
    message.recipient.toString() !== req.user._id.toString()
  ) {
    return next(
      new ErrorResponse("Not authorized to delete this message", 403)
    );
  }

  await message.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
  });
});

// Helper function to check message access
const checkMessageAccess = async (user, message) => {
  // Admins have access to everything
  if (user.role === "admin") return true;

  // Sender or recipient has access
  if (
    message.sender.toString() === user._id.toString() ||
    (message.recipient && message.recipient.toString() === user._id.toString())
  ) {
    return true;
  }

  // For class messages, check if user has access to the class
  if (message.class) {
    const classObj = await Class.findById(message.class);
    if (!classObj) return false;

    return await checkClassAccess(user, classObj);
  }

  return false;
};

// Helper function to check class access
const checkClassAccess = async (user, classObj) => {
  if (user.role === "teacher") {
    return classObj.subjects.some((subject) =>
      subject.teachers.some(
        (teacher) =>
          teacher.teacher.toString() === user._id.toString() &&
          teacher.status === "approved"
      )
    );
  }

  if (user.role === "student") {
    const enrollment = await AcademicEnrollment.findOne({
      student: user._id,
      class: classObj._id,
      status: "active",
    });
    return !!enrollment;
  }

  return false;
};

// @desc    Get users for messaging
// @route   GET /api/messages/users
// @access  Private
exports.getUsersForMessaging = asyncHandler(async (req, res, next) => {
  const { role, class: classId, subject, search } = req.query;
  let query = { isActive: true };
  let users = [];

  // Base query based on user role
  if (req.user.role === "student") {
    // Students can message their teachers and admins
    query.role = { $in: ["teacher", "admin"] };

    // If class is specified, get teachers of that class
    if (classId) {
      const classObj = await Class.findById(classId);
      if (!classObj) {
        return next(new ErrorResponse("Class not found", 404));
      }

      // Verify student is enrolled in this class
      const enrollment = await AcademicEnrollment.findOne({
        student: req.user._id,
        class: classId,
        status: "active",
      });

      if (!enrollment) {
        return next(
          new ErrorResponse("You are not enrolled in this class", 403)
        );
      }

      // Get teachers of the class
      const teacherIds = classObj.subjects.reduce((acc, subject) => {
        if (subject.status === "active") {
          subject.teachers.forEach((teacher) => {
            if (teacher.status === "approved") {
              acc.push(teacher.teacher);
            }
          });
        }
        return acc;
      }, []);

      query._id = { $in: teacherIds };
    }

    // If subject is specified, get teachers of that subject
    if (subject) {
      const classObj = await Class.findById(classId);
      if (!classObj) {
        return next(
          new ErrorResponse(
            "Class must be specified for subject filtering",
            400
          )
        );
      }

      const subjectObj = classObj.subjects.find(
        (s) => s.subject.toString() === subject
      );
      if (!subjectObj) {
        return next(new ErrorResponse("Subject not found in this class", 404));
      }

      const teacherIds = subjectObj.teachers
        .filter((teacher) => teacher.status === "approved")
        .map((teacher) => teacher.teacher);

      query._id = { $in: teacherIds };
    }
  } else if (req.user.role === "teacher") {
    // Teachers can message their students and admins
    query.role = { $in: ["student", "admin"] };

    // If class is specified, get students of that class
    if (classId) {
      const classObj = await Class.findById(classId);
      if (!classObj) {
        return next(new ErrorResponse("Class not found", 404));
      }

      // Verify teacher teaches this class
      const isTeacher = classObj.subjects.some((subject) =>
        subject.teachers.some(
          (teacher) =>
            teacher.teacher.toString() === req.user._id.toString() &&
            teacher.status === "approved"
        )
      );

      if (!isTeacher) {
        return next(
          new ErrorResponse(
            "You are not authorized to view students of this class",
            403
          )
        );
      }

      // Get students enrolled in this class
      const enrollments = await AcademicEnrollment.find({
        class: classId,
        status: "active",
      });

      const studentIds = enrollments.map((e) => e.student);
      query._id = { $in: studentIds };
    }
  } else if (req.user.role === "admin") {
    // Admins can message everyone
    if (role) {
      query.role = role;
    }
  }

  // Add search functionality
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  // Get users with selected fields
  users = await User.find(query)
    .select("firstName lastName email role avatar isActive")
    .sort("firstName lastName");

  res.status(200).json({
    success: true,
    count: users.length,
    data: users,
  });
});
