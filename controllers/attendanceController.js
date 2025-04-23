const Attendance = require("../models/Attendance");
const Class = require("../models/Class");
const Subject = require("../models/Subject");
const User = require("../models/User");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get all attendance records
// @route   GET /api/attendance
// @access  Private
exports.getAttendance = async (req, res, next) => {
  try {
    let query = {};

    // Filter by class if provided
    if (req.query.class) {
      query.class = req.query.class;
    }

    // Filter by date if provided
    if (req.query.date) {
      query.date = new Date(req.query.date);
    }

    // Filter by date range if provided
    if (req.query.startDate && req.query.endDate) {
      query.date = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate),
      };
    }

    // For teachers, only show attendance for their classes
    if (req.user.role === "teacher") {
      const classes = await Class.find({
        "subjects.teachers.teacher": req.user.id,
        "subjects.teachers.status": "approved",
      });

      query.class = { $in: classes.map((c) => c._id) };
    }

    // For students, only show their attendance
    else if (req.user.role === "student") {
      query["records.student"] = req.user.id;
    }

    const attendance = await Attendance.find(query)
      .populate("class", "name code")
      .populate("subject", "name code")
      .populate("recordedBy", "firstName lastName")
      .populate("records.student", "firstName lastName")
      .sort("-date");

    res.status(200).json({
      success: true,
      count: attendance.length,
      data: attendance,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single attendance record
// @route   GET /api/attendance/:id
// @access  Private
exports.getAttendanceRecord = async (req, res, next) => {
  try {
    const attendance = await Attendance.findById(req.params.id)
      .populate("class", "name code")
      .populate("subject", "name code")
      .populate("recordedBy", "firstName lastName")
      .populate("records.student", "firstName lastName");

    if (!attendance) {
      return next(
        new ErrorResponse(
          `Attendance record not found with id of ${req.params.id}`,
          404
        )
      );
    }

    // Check if user has access to this attendance record
    const hasAccess = await checkAttendanceAccess(req.user, attendance);
    if (!hasAccess) {
      return next(
        new ErrorResponse(
          "Not authorized to access this attendance record",
          403
        )
      );
    }

    res.status(200).json({
      success: true,
      data: attendance,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create attendance record
// @route   POST /api/attendance
// @access  Private/Teacher
exports.createAttendance = async (req, res, next) => {
  try {
    // Verify user is a teacher
    if (req.user.role !== "teacher") {
      return next(
        new ErrorResponse("Only teachers can create attendance records", 403)
      );
    }

    // Verify class exists
    const classObj = await Class.findById(req.body.class);
    if (!classObj) {
      return next(
        new ErrorResponse(`Class not found with id of ${req.body.class}`, 404)
      );
    }

    // Verify subject exists if provided
    if (req.body.subject) {
      const subject = await Subject.findById(req.body.subject);
      if (!subject) {
        return next(
          new ErrorResponse(
            `Subject not found with id of ${req.body.subject}`,
            404
          )
        );
      }

      // Check if teacher is assigned to this subject in this class
      const isAssigned = classObj.subjects.some(
        (s) =>
          s.subject.toString() === req.body.subject &&
          s.teachers.some(
            (t) =>
              t.teacher.toString() === req.user.id && t.status === "approved"
          )
      );

      if (!isAssigned) {
        return next(
          new ErrorResponse(
            "You are not assigned to teach this subject in this class",
            403
          )
        );
      }
    }

    // Check if attendance already exists for this class/date/session
    const existingAttendance = await Attendance.findOne({
      class: req.body.class,
      date: req.body.date,
      session: req.body.session,
    });

    if (existingAttendance) {
      return next(
        new ErrorResponse(
          "Attendance record already exists for this class/date/session",
          400
        )
      );
    }

    // Validate students in the records
    const studentIds = req.body.records.map((r) => r.student);
    const students = await User.find({
      _id: { $in: studentIds },
      role: "student",
    });

    if (students.length !== studentIds.length) {
      return next(
        new ErrorResponse("One or more students not found or not valid", 404)
      );
    }

    // Check if students are enrolled in this class
    const invalidStudents = studentIds.filter(
      (studentId) =>
        !classObj.students.some(
          (s) => s.student.toString() === studentId && s.status === "approved"
        )
    );

    if (invalidStudents.length > 0) {
      return next(
        new ErrorResponse(
          `Students not enrolled in this class: ${invalidStudents.join(", ")}`,
          400
        )
      );
    }

    const attendance = await Attendance.create({
      ...req.body,
      recordedBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: attendance,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update attendance record
// @route   PUT /api/attendance/:id
// @access  Private/Teacher or Admin
exports.updateAttendance = async (req, res, next) => {
  try {
    let attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return next(
        new ErrorResponse(
          `Attendance record not found with id of ${req.params.id}`,
          404
        )
      );
    }

    // Check if user is admin or the teacher who created the record
    if (
      req.user.role !== "admin" &&
      attendance.recordedBy.toString() !== req.user.id
    ) {
      return next(
        new ErrorResponse(
          "Not authorized to update this attendance record",
          403
        )
      );
    }

    // Verify class if being updated
    if (req.body.class) {
      const classObj = await Class.findById(req.body.class);
      if (!classObj) {
        return next(
          new ErrorResponse(`Class not found with id of ${req.body.class}`, 404)
        );
      }
    }

    // Verify subject if being updated
    if (req.body.subject) {
      const subject = await Subject.findById(req.body.subject);
      if (!subject) {
        return next(
          new ErrorResponse(
            `Subject not found with id of ${req.body.subject}`,
            404
          )
        );
      }
    }

    // Validate students if records are being updated
    if (req.body.records) {
      const studentIds = req.body.records.map((r) => r.student);
      const students = await User.find({
        _id: { $in: studentIds },
        role: "student",
      });

      if (students.length !== studentIds.length) {
        return next(
          new ErrorResponse("One or more students not found or not valid", 404)
        );
      }

      // Check if students are enrolled in the class
      const classObj = await Class.findById(attendance.class);
      const invalidStudents = studentIds.filter(
        (studentId) =>
          !classObj.students.some(
            (s) => s.student.toString() === studentId && s.status === "approved"
          )
      );

      if (invalidStudents.length > 0) {
        return next(
          new ErrorResponse(
            `Students not enrolled in this class: ${invalidStudents.join(
              ", "
            )}`,
            400
          )
        );
      }
    }

    attendance = await Attendance.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: attendance,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Submit attendance record
// @route   PUT /api/attendance/:id/submit
// @access  Private/Teacher
exports.submitAttendance = async (req, res, next) => {
  try {
    let attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return next(
        new ErrorResponse(
          `Attendance record not found with id of ${req.params.id}`,
          404
        )
      );
    }

    // Check if user is the teacher who created the record
    if (attendance.recordedBy.toString() !== req.user.id) {
      return next(
        new ErrorResponse(
          "Not authorized to submit this attendance record",
          403
        )
      );
    }

    attendance.isSubmitted = true;
    attendance.submittedAt = new Date();
    await attendance.save();

    res.status(200).json({
      success: true,
      data: attendance,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Verify attendance record
// @route   PUT /api/attendance/:id/verify
// @access  Private/Admin
exports.verifyAttendance = async (req, res, next) => {
  try {
    let attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return next(
        new ErrorResponse(
          `Attendance record not found with id of ${req.params.id}`,
          404
        )
      );
    }

    attendance.isVerified = true;
    attendance.verifiedBy = req.user.id;
    attendance.verifiedAt = new Date();
    await attendance.save();

    res.status(200).json({
      success: true,
      data: attendance,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete attendance record
// @route   DELETE /api/attendance/:id
// @access  Private/Teacher or Admin
exports.deleteAttendance = async (req, res, next) => {
  try {
    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return next(
        new ErrorResponse(
          `Attendance record not found with id of ${req.params.id}`,
          404
        )
      );
    }

    // Check if user is admin or the teacher who created the record
    if (
      req.user.role !== "admin" &&
      attendance.recordedBy.toString() !== req.user.id
    ) {
      return next(
        new ErrorResponse(
          "Not authorized to delete this attendance record",
          403
        )
      );
    }

    await attendance.remove();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// Helper function to check attendance access
const checkAttendanceAccess = async (user, attendance) => {
  // Admins have access to everything
  if (user.role === "admin") return true;

  // Teacher who recorded it has access
  if (attendance.recordedBy.toString() === user.id) return true;

  // For teachers, check if they teach this class/subject
  if (user.role === "teacher") {
    const classObj = await Class.findById(attendance.class);
    if (!classObj) return false;

    // If attendance is for a specific subject
    if (attendance.subject) {
      return classObj.subjects.some(
        (s) =>
          s.subject.toString() === attendance.subject.toString() &&
          s.teachers.some(
            (t) => t.teacher.toString() === user.id && t.status === "approved"
          )
      );
    }

    // For general class attendance
    return classObj.subjects.some((s) =>
      s.teachers.some(
        (t) => t.teacher.toString() === user.id && t.status === "approved"
      )
    );
  }

  // For students, check if they're in the records
  if (user.role === "student") {
    return attendance.records.some((r) => r.student.toString() === user.id);
  }

  return false;
};
