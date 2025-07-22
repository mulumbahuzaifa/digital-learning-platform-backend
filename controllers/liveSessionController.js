const asyncHandler = require("../middleware/async");
const ErrorResponse = require("../utils/errorResponse");
const LiveSession = require("../models/LiveSession");
const User = require("../models/User");
const Class = require("../models/Class");
const { sendNotification } = require("../utils/notifications");

// @desc    Create a new live session
// @route   POST /api/live-sessions
// @access  Private (Teacher)
exports.createLiveSession = asyncHandler(async (req, res, next) => {
  // Add teacher to req.body
  req.body.teacher = req.user.id;

  // Check if user is teacher
  if (req.user.role !== "teacher") {
    return next(
      new ErrorResponse("Only teachers can create live sessions", 403)
    );
  }

  // Validate class and subject
  const classDoc = await Class.findById(req.body.class);
  if (!classDoc) {
    return next(new ErrorResponse("Class not found", 404));
  }

  // Check if teacher is assigned to this class and subject
  const isAssigned = classDoc.subjects.some(
    (subject) =>
      subject.subject.toString() === req.body.subject.toString() &&
      subject.teachers.some(
        (teacher) =>
          teacher.teacher.toString() === req.user.id &&
          teacher.status === "approved"
      )
  );

  if (!isAssigned) {
    return next(
      new ErrorResponse(
        "You are not authorized to create sessions for this class/subject",
        403
      )
    );
  }

  // Create session
  const session = await LiveSession.create(req.body);

  // Notify students in the class
  const students = await User.find({
    role: "student",
    "enrolledClasses.class": req.body.class,
    "enrolledClasses.status": "approved",
  });

  // Send notifications to all students
  await Promise.all(
    students.map((student) =>
      sendNotification({
        recipient: student._id,
        type: "live_session_scheduled",
        title: "New Live Session Scheduled",
        message: `A new live session "${
          session.title
        }" has been scheduled for ${new Date(
          session.startTime
        ).toLocaleString()}`,
        data: {
          sessionId: session._id,
          classId: session.class,
          subjectId: session.subject,
          startTime: session.startTime,
        },
      })
    )
  );

  res.status(201).json({
    success: true,
    data: session,
  });
});

// @desc    Get all live sessions
// @route   GET /api/live-sessions
// @access  Private
exports.getLiveSessions = asyncHandler(async (req, res, next) => {
  let query;

  // Copy req.query
  const reqQuery = { ...req.query };

  // Fields to exclude
  const removeFields = ["select", "sort", "page", "limit"];

  // Loop over removeFields and delete them from reqQuery
  removeFields.forEach((param) => delete reqQuery[param]);

  // Create query string
  let queryStr = JSON.stringify(reqQuery);

  // Create operators ($gt, $gte, etc)
  queryStr = queryStr.replace(
    /\b(gt|gte|lt|lte|in)\b/g,
    (match) => `$${match}`
  );

  // Finding resource
  query = LiveSession.find(JSON.parse(queryStr))
    .populate({
      path: "teacher",
      select: "name email",
    })
    .populate({
      path: "class",
      select: "name code",
    })
    .populate({
      path: "subject",
      select: "name code",
    });

  // Select Fields
  if (req.query.select) {
    const fields = req.query.select.split(",").join(" ");
    query = query.select(fields);
  }

  // Sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(",").join(" ");
    query = query.sort(sortBy);
  } else {
    query = query.sort("-startTime");
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 25;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await LiveSession.countDocuments();

  query = query.skip(startIndex).limit(limit);

  // Executing query
  const sessions = await query;

  // Pagination result
  const pagination = {};

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit,
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit,
    };
  }

  res.status(200).json({
    success: true,
    count: sessions.length,
    pagination,
    data: sessions,
  });
});

// @desc    Get single live session
// @route   GET /api/live-sessions/:id
// @access  Private
exports.getLiveSession = asyncHandler(async (req, res, next) => {
  const session = await LiveSession.findById(req.params.id)
    .populate({
      path: "teacher",
      select: "name email",
    })
    .populate({
      path: "class",
      select: "name code",
    })
    .populate({
      path: "subject",
      select: "name code",
    })
    .populate({
      path: "participants.user",
      select: "name email role",
    });

  if (!session) {
    return next(new ErrorResponse("Live session not found", 404));
  }

  // Check access
  await checkSessionAccess(session, req.user);

  res.status(200).json({
    success: true,
    data: session,
  });
});

// @desc    Update live session
// @route   PUT /api/live-sessions/:id
// @access  Private (Teacher)
exports.updateLiveSession = asyncHandler(async (req, res, next) => {
  let session = await LiveSession.findById(req.params.id);

  if (!session) {
    return next(new ErrorResponse("Live session not found", 404));
  }

  // Make sure user is session owner
  if (session.teacher.toString() !== req.user.id) {
    return next(
      new ErrorResponse("Not authorized to update this session", 403)
    );
  }

  // Check if session has already started
  if (session.status === "live" || session.status === "ended") {
    return next(
      new ErrorResponse("Cannot update a session that has already started", 400)
    );
  }

  session = await LiveSession.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  // Notify students about update
  const students = await User.find({
    role: "student",
    "enrolledClasses.class": session.class,
    "enrolledClasses.status": "approved",
  });

  await Promise.all(
    students.map((student) =>
      sendNotification({
        recipient: student._id,
        type: "live_session_updated",
        title: "Live Session Updated",
        message: `The live session "${session.title}" has been updated`,
        data: {
          sessionId: session._id,
          classId: session.class,
          subjectId: session.subject,
          startTime: session.startTime,
        },
      })
    )
  );

  res.status(200).json({
    success: true,
    data: session,
  });
});

// @desc    Delete live session
// @route   DELETE /api/live-sessions/:id
// @access  Private (Teacher)
exports.deleteLiveSession = asyncHandler(async (req, res, next) => {
  const session = await LiveSession.findById(req.params.id);

  if (!session) {
    return next(new ErrorResponse("Live session not found", 404));
  }

  // Make sure user is session owner
  if (session.teacher.toString() !== req.user.id) {
    return next(
      new ErrorResponse("Not authorized to delete this session", 403)
    );
  }

  // Check if session has already started
  if (session.status === "live" || session.status === "ended") {
    return next(
      new ErrorResponse("Cannot delete a session that has already started", 400)
    );
  }

  await session.remove();

  // Notify students about cancellation
  const students = await User.find({
    role: "student",
    "enrolledClasses.class": session.class,
    "enrolledClasses.status": "approved",
  });

  await Promise.all(
    students.map((student) =>
      sendNotification({
        recipient: student._id,
        type: "live_session_cancelled",
        title: "Live Session Cancelled",
        message: `The live session "${session.title}" has been cancelled`,
        data: {
          sessionId: session._id,
          classId: session.class,
          subjectId: session.subject,
        },
      })
    )
  );

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Join live session
// @route   POST /api/live-sessions/:id/join
// @access  Private
exports.joinLiveSession = asyncHandler(async (req, res, next) => {
  const session = await LiveSession.findById(req.params.id);

  if (!session) {
    return next(new ErrorResponse("Live session not found", 404));
  }

  // Check if session is active
  if (!session.isActive) {
    return next(new ErrorResponse("Session is not active", 400));
  }

  // Check access
  // await checkSessionAccess(session, req.user);

  // Add participant
  session.addParticipant(req.user.id);
  await session.save();

  res.status(200).json({
    success: true,
    data: session,
  });
});

// @desc    Leave live session
// @route   POST /api/live-sessions/:id/leave
// @access  Private
exports.leaveLiveSession = asyncHandler(async (req, res, next) => {
  const session = await LiveSession.findById(req.params.id);

  if (!session) {
    return next(new ErrorResponse("Live session not found", 404));
  }

  // Remove participant
  session.removeParticipant(req.user.id);
  await session.save();

  res.status(200).json({
    success: true,
    data: session,
  });
});


// @desc    Start live session and create Zoom meeting
// @route   POST /api/live-sessions/:id/start
// @access  Private (Teacher)
exports.startLiveSession = asyncHandler(async (req, res, next) => {
  const session = await LiveSession.findById(req.params.id);

  if (!session) {
    return next(new ErrorResponse("Live session not found", 404));
  }

  // Make sure user is session owner
  if (session.teacher.toString() !== req.user.id) {
    return next(new ErrorResponse("Not authorized to start this session", 403));
  }

  // Check if session can be started
  if (session.status !== "scheduled") {
    return next(
      new ErrorResponse("Session cannot be started in its current state", 400)
    );
  }

  try {
    // Create Zoom meeting if it doesn't exist
    if (!session.meetingId) {
      const zoomMeeting = await VideoService.createMeeting({
        title: session.title,
        startTime: session.startTime.toISOString(),
        duration: session.duration || 60, // default to 60 minutes if not set
      });

      // Update session with meeting details
      session.meetingId = zoomMeeting.meetingId;
      session.meetingUrl = zoomMeeting.joinUrl;
      session.meetingPassword = zoomMeeting.password;
    }

    // Update session status
    session.status = "live";
    session.startedAt = new Date();
    await session.save();

    // Get enrolled students
    const students = await User.find({
      role: "student",
      "enrolledClasses.class": session.class,
      "enrolledClasses.status": "approved",
    }).select('_id email firstName lastName');

    // Notify students
    await Promise.all(
      students.map((student) =>
        sendNotification({
          recipient: student._id,
          type: "live_session_started",
          title: "Live Session Started",
          message: `The live session "${session.title}" has started`,
          data: {
            sessionId: session._id,
            classId: session.class,
            subjectId: session.subject,
            meetingUrl: session.meetingUrl,
            meetingPassword: session.meetingPassword,
          },
        })
      )
    );

    // Optionally send emails to students
    if (process.env.SEND_EMAIL_NOTIFICATIONS === 'true') {
      await Promise.all(
        students.map((student) => 
          sendEmail({
            email: student.email,
            subject: `Live Session Started: ${session.title}`,
            template: 'live-session-started',
            context: {
              name: student.firstName,
              title: session.title,
              meetingUrl: session.meetingUrl,
              password: session.meetingPassword,
              teacher: req.user.name,
              startTime: session.startTime,
              duration: session.duration,
            }
          })
        )
      );
    }

    res.status(200).json({
      success: true,
      data: {
        ...session.toObject(),
        studentCount: students.length,
      },
    });

  } catch (error) {
    console.error('Error starting live session:', error);
    return next(new ErrorResponse("Failed to start live session", 500));
  }
});

// @desc    End live session
// @route   POST /api/live-sessions/:id/end
// @access  Private (Teacher)
exports.endLiveSession = asyncHandler(async (req, res, next) => {
  const session = await LiveSession.findById(req.params.id);

  if (!session) {
    return next(new ErrorResponse("Live session not found", 404));
  }

  // Make sure user is session owner
  if (session.teacher.toString() !== req.user.id) {
    return next(new ErrorResponse("Not authorized to end this session", 403));
  }

  // Check if session can be ended
  if (session.status !== "live") {
    return next(
      new ErrorResponse("Session cannot be ended in its current state", 400)
    );
  }

  session.status = "ended";
  await session.save();

  // Notify participants
  const participants = session.participants.map((p) => p.user);
  await Promise.all(
    participants.map((participantId) =>
      sendNotification({
        recipient: participantId,
        type: "live_session_ended",
        title: "Live Session Ended",
        message: `The live session "${session.title}" has ended`,
        data: {
          sessionId: session._id,
          classId: session.class,
          subjectId: session.subject,
          recordingUrl: session.recordingUrl,
        },
      })
    )
  );

  res.status(200).json({
    success: true,
    data: session,
  });
});

// @desc    Add chat message
// @route   POST /api/live-sessions/:id/chat
// @access  Private
exports.addChatMessage = asyncHandler(async (req, res, next) => {
  const session = await LiveSession.findById(req.params.id);

  if (!session) {
    return next(new ErrorResponse("Live session not found", 404));
  }

  // Check if session is active
  if (!session.isActive) {
    return next(new ErrorResponse("Session is not active", 400));
  }

  // Check if chat is enabled
  if (!session.settings.enableChat) {
    return next(new ErrorResponse("Chat is disabled for this session", 400));
  }

  // Add message
  session.addChatMessage(req.user.id, req.body.message);
  await session.save();

  res.status(200).json({
    success: true,
    data: session,
  });
});

// Helper function to check session access
const checkSessionAccess = async (session, user) => {
  // Admins have access to everything
  if (user.role === "admin") return true;

  // Teacher can access their own sessions
  if (user.role === "teacher" && session.teacher.toString() === user.id) {
    return true;
  }

  // Student can access if enrolled in the class
  if (user.role === "student") {
    const isEnrolled = user.enrolledClasses.some(
      (enrollment) =>
        enrollment.class.toString() === session.class.toString() &&
        enrollment.status === "approved"
    );
    return isEnrolled;
  }

  return false;
};
