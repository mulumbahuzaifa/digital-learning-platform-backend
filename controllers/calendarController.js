const CalendarEvent = require("../models/CalendarEvent");
const Class = require("../models/Class");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get all calendar events
// @route   GET /api/calendar
// @access  Private
exports.getEvents = async (req, res, next) => {
  try {
    let query = {
      $or: [
        { createdBy: req.user.id },
        { attendees: { $elemMatch: { user: req.user.id } } },
      ],
    };

    // Filter by date range
    if (req.query.start && req.query.end) {
      query.$or = [
        // Events that start within the range
        {
          start: {
            $gte: new Date(req.query.start),
            $lte: new Date(req.query.end),
          },
        },
        // Events that end within the range
        {
          end: {
            $gte: new Date(req.query.start),
            $lte: new Date(req.query.end),
          },
        },
        // Events that span the range
        {
          start: { $lte: new Date(req.query.start) },
          end: { $gte: new Date(req.query.end) },
        },
      ];
    }

    // Filter by type
    if (req.query.type) {
      query.eventType = req.query.type;
    }

    // Filter by class
    if (req.query.class) {
      query.class = req.query.class;
    }

    const events = await CalendarEvent.find(query)
      .populate("class", "name code")
      .populate("createdBy", "firstName lastName")
      .populate("attendees.user", "firstName lastName")
      .sort("start");

    res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single calendar event
// @route   GET /api/calendar/:id
// @access  Private
exports.getEvent = async (req, res, next) => {
  try {
    const event = await CalendarEvent.findById(req.params.id)
      .populate("class", "name code")
      .populate("createdBy", "firstName lastName")
      .populate("attendees.user", "firstName lastName");

    if (!event) {
      return next(
        new ErrorResponse(`Event not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if user has access to this event
    const hasAccess = await checkEventAccess(req.user, event);
    if (!hasAccess) {
      return next(
        new ErrorResponse("Not authorized to access this event", 403)
      );
    }

    res.status(200).json({
      success: true,
      data: event,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create calendar event
// @route   POST /api/calendar
// @access  Private
exports.createEvent = async (req, res, next) => {
  try {
    // Validate class if provided
    if (req.body.class) {
      const classObj = await Class.findById(req.body.class);
      if (!classObj) {
        return next(
          new ErrorResponse(`Class not found with id of ${req.body.class}`, 404)
        );
      }

      // Check if user is teacher in this class
      const isTeacher = classObj.subjects.some((s) =>
        s.teachers.some(
          (t) => t.teacher.toString() === req.user.id && t.status === "approved"
        )
      );

      if (!isTeacher && req.user.role !== "admin") {
        return next(
          new ErrorResponse(
            "Not authorized to create events for this class",
            403
          )
        );
      }
    }

    const event = await CalendarEvent.create({
      ...req.body,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: event,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update calendar event
// @route   PUT /api/calendar/:id
// @access  Private
exports.updateEvent = async (req, res, next) => {
  try {
    let event = await CalendarEvent.findById(req.params.id);

    if (!event) {
      return next(
        new ErrorResponse(`Event not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if user is creator or admin
    if (
      event.createdBy.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return next(
        new ErrorResponse("Not authorized to update this event", 403)
      );
    }

    // Validate class if being updated
    if (req.body.class) {
      const classObj = await Class.findById(req.body.class);
      if (!classObj) {
        return next(
          new ErrorResponse(`Class not found with id of ${req.body.class}`, 404)
        );
      }
    }

    event = await CalendarEvent.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: event,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete calendar event
// @route   DELETE /api/calendar/:id
// @access  Private
exports.deleteEvent = async (req, res, next) => {
  try {
    const event = await CalendarEvent.findById(req.params.id);

    if (!event) {
      return next(
        new ErrorResponse(`Event not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if user is creator or admin
    if (
      event.createdBy.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return next(
        new ErrorResponse("Not authorized to delete this event", 403)
      );
    }

    await event.remove();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update event attendance
// @route   PUT /api/calendar/:id/attendance
// @access  Private
exports.updateAttendance = async (req, res, next) => {
  try {
    const event = await CalendarEvent.findById(req.params.id);

    if (!event) {
      return next(
        new ErrorResponse(`Event not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if user is attendee
    const attendeeIndex = event.attendees.findIndex(
      (a) => a.user.toString() === req.user.id
    );

    if (attendeeIndex === -1) {
      return next(
        new ErrorResponse("You are not an attendee of this event", 403)
      );
    }

    // Update attendance status
    event.attendees[attendeeIndex].status = req.body.status;
    await event.save();

    res.status(200).json({
      success: true,
      data: event,
    });
  } catch (err) {
    next(err);
  }
};

// Helper function to check event access
const checkEventAccess = async (user, event) => {
  // Admins have access to everything
  if (user.role === "admin") return true;

  // Creator has access
  if (event.createdBy.toString() === user.id) return true;

  // Attendee has access
  if (event.attendees.some((a) => a.user.toString() === user.id)) {
    return true;
  }

  // For class events, check if user is in the class
  if (event.class) {
    const classObj = await Class.findById(event.class);
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

  return false;
};
