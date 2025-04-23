const Assignment = require("../models/Assignment");
const Class = require("../models/Class");
const Subject = require("../models/Subject");
const Submission = require("../models/Submission");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get all assignments
// @route   GET /api/assignments
// @access  Private
exports.getAssignments = async (req, res, next) => {
  try {
    let query = {};

    // Filter by class if provided
    if (req.query.class) {
      query.class = req.query.class;
    }

    // Filter by subject if provided
    if (req.query.subject) {
      query.subject = req.query.subject;
    }

    // Filter by status if provided
    if (req.query.status) {
      query.status = req.query.status;
    }

    const assignments = await Assignment.find(query)
      .populate("class", "name code")
      .populate("subject", "name code")
      .populate("createdBy", "firstName lastName")
      .sort("-createdAt");

    res.status(200).json({
      success: true,
      count: assignments.length,
      data: assignments,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single assignment
// @route   GET /api/assignments/:id
// @access  Private
exports.getAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate("class", "name code")
      .populate("subject", "name code")
      .populate("createdBy", "firstName lastName");

    if (!assignment) {
      return next(
        new ErrorResponse(
          `Assignment not found with id of ${req.params.id}`,
          404
        )
      );
    }

    // Check if user has access to this assignment
    const hasAccess = await checkAssignmentAccess(req.user, assignment);
    if (!hasAccess) {
      return next(
        new ErrorResponse("Not authorized to access this assignment", 403)
      );
    }

    res.status(200).json({
      success: true,
      data: assignment,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create assignment
// @route   POST /api/assignments
// @access  Private/Teacher
exports.createAssignment = async (req, res, next) => {
  try {
    // Verify user is a teacher
    if (req.user.role !== "teacher") {
      return next(
        new ErrorResponse("Only teachers can create assignments", 403)
      );
    }

    // Verify class exists
    const classObj = await Class.findById(req.body.class);
    if (!classObj) {
      return next(
        new ErrorResponse(`Class not found with id of ${req.body.class}`, 404)
      );
    }

    // Verify subject exists
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
          (t) => t.teacher.toString() === req.user.id && t.status === "approved"
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

    // Create assignment
    const assignment = await Assignment.create({
      ...req.body,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: assignment,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update assignment
// @route   PUT /api/assignments/:id
// @access  Private/Teacher or Admin
exports.updateAssignment = async (req, res, next) => {
  try {
    let assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return next(
        new ErrorResponse(
          `Assignment not found with id of ${req.params.id}`,
          404
        )
      );
    }

    // Check if user is owner or admin
    if (
      req.user.role !== "admin" &&
      assignment.createdBy.toString() !== req.user.id
    ) {
      return next(
        new ErrorResponse("Not authorized to update this assignment", 403)
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

    assignment = await Assignment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: assignment,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete assignment
// @route   DELETE /api/assignments/:id
// @access  Private/Teacher or Admin
exports.deleteAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return next(
        new ErrorResponse(
          `Assignment not found with id of ${req.params.id}`,
          404
        )
      );
    }

    // Check if user is owner or admin
    if (
      req.user.role !== "admin" &&
      assignment.createdBy.toString() !== req.user.id
    ) {
      return next(
        new ErrorResponse("Not authorized to delete this assignment", 403)
      );
    }

    await assignment.remove();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Publish assignment
// @route   PUT /api/assignments/:id/publish
// @access  Private/Teacher
exports.publishAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return next(
        new ErrorResponse(
          `Assignment not found with id of ${req.params.id}`,
          404
        )
      );
    }

    // Check if user is owner
    if (assignment.createdBy.toString() !== req.user.id) {
      return next(
        new ErrorResponse("Not authorized to publish this assignment", 403)
      );
    }

    assignment.status = "published";
    await assignment.save();

    res.status(200).json({
      success: true,
      data: assignment,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get submissions for assignment
// @route   GET /api/assignments/:id/submissions
// @access  Private/Teacher or Admin
exports.getAssignmentSubmissions = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return next(
        new ErrorResponse(
          `Assignment not found with id of ${req.params.id}`,
          404
        )
      );
    }

    // Check if user is owner or admin
    if (
      req.user.role !== "admin" &&
      assignment.createdBy.toString() !== req.user.id
    ) {
      return next(
        new ErrorResponse(
          "Not authorized to view submissions for this assignment",
          403
        )
      );
    }

    const submissions = await Submission.find({ assignment: req.params.id })
      .populate("student", "firstName lastName")
      .sort("submitDate");

    res.status(200).json({
      success: true,
      count: submissions.length,
      data: submissions,
    });
  } catch (err) {
    next(err);
  }
};

// Helper function to check assignment access
const checkAssignmentAccess = async (user, assignment) => {
  // Admins have access to everything
  if (user.role === "admin") return true;

  // Assignment creator has access
  if (assignment.createdBy.toString() === user.id) return true;

  // For teachers - check if they teach this subject in this class
  if (user.role === "teacher") {
    const classObj = await Class.findById(assignment.class);
    if (!classObj) return false;

    return classObj.subjects.some(
      (s) =>
        s.subject.toString() === assignment.subject.toString() &&
        s.teachers.some(
          (t) => t.teacher.toString() === user.id && t.status === "approved"
        )
    );
  }

  // For students - check if they're in this class
  if (user.role === "student") {
    const classObj = await Class.findById(assignment.class);
    if (!classObj) return false;

    return classObj.students.some(
      (s) => s.student.toString() === user.id && s.status === "approved"
    );
  }

  return false;
};
