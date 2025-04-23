const Submission = require("../models/Submission");
const Assignment = require("../models/Assignment");
const Class = require("../models/Class");
const ErrorResponse = require("../utils/errorResponse");
const path = require("path");
const fs = require("fs");

// @desc    Get all submissions
// @route   GET /api/submissions
// @access  Private/Teacher or Admin
exports.getSubmissions = async (req, res, next) => {
  try {
    let query = {};

    // Filter by assignment if provided
    if (req.query.assignment) {
      query.assignment = req.query.assignment;
    }

    // Filter by student if provided
    if (req.query.student) {
      query.student = req.query.student;
    }

    // Filter by class if provided
    if (req.query.class) {
      query.class = req.query.class;
    }

    // Filter by subject if provided
    if (req.query.subject) {
      query.subject = req.query.subject;
    }

    // For students, only show their own submissions
    if (req.user.role === "student") {
      query.student = req.user.id;
    }

    // For teachers, only show submissions for their classes/subjects
    if (req.user.role === "teacher") {
      const assignments = await Assignment.find({ createdBy: req.user.id });
      query.assignment = { $in: assignments.map((a) => a._id) };
    }

    const submissions = await Submission.find(query)
      .populate("assignment", "title dueDate")
      .populate("student", "firstName lastName")
      .populate("class", "name code")
      .populate("subject", "name code")
      .sort("-submitDate");

    res.status(200).json({
      success: true,
      count: submissions.length,
      data: submissions,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single submission
// @route   GET /api/submissions/:id
// @access  Private
exports.getSubmission = async (req, res, next) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate("assignment", "title dueDate totalMarks")
      .populate("student", "firstName lastName")
      .populate("class", "name code")
      .populate("subject", "name code");

    if (!submission) {
      return next(
        new ErrorResponse(
          `Submission not found with id of ${req.params.id}`,
          404
        )
      );
    }

    // Check if user has access to this submission
    const hasAccess = await checkSubmissionAccess(req.user, submission);
    if (!hasAccess) {
      return next(
        new ErrorResponse("Not authorized to access this submission", 403)
      );
    }

    res.status(200).json({
      success: true,
      data: submission,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create submission
// @route   POST /api/submissions
// @access  Private/Student
exports.createSubmission = async (req, res, next) => {
  try {
    // Verify user is a student
    if (req.user.role !== "student") {
      return next(
        new ErrorResponse("Only students can submit assignments", 403)
      );
    }

    // Verify assignment exists and is published
    const assignment = await Assignment.findById(req.body.assignment);
    if (!assignment || assignment.status !== "published") {
      return next(
        new ErrorResponse(`Assignment not found or not published`, 404)
      );
    }

    // Check if assignment is past due
    if (
      new Date() > new Date(assignment.dueDate) &&
      !assignment.allowLateSubmission
    ) {
      return next(new ErrorResponse("Assignment submission is closed", 400));
    }

    // Check if student is in the class
    const classObj = await Class.findById(assignment.class);
    if (
      !classObj ||
      !classObj.students.some(
        (s) => s.student.toString() === req.user.id && s.status === "approved"
      )
    ) {
      return next(new ErrorResponse("You are not enrolled in this class", 403));
    }

    // Check if student already submitted
    const existingSubmission = await Submission.findOne({
      assignment: req.body.assignment,
      student: req.user.id,
    });

    if (existingSubmission) {
      return next(
        new ErrorResponse("You have already submitted this assignment", 400)
      );
    }

    // Handle file upload if required
    let attachments = [];
    if (assignment.submissionType !== "text" && req.files) {
      const maxSize = 10 * 1024 * 1024; // 10MB

      // Handle single file or multiple files
      const files = Array.isArray(req.files.files)
        ? req.files.files
        : [req.files.files];

      for (const file of files) {
        // Check file size
        if (file.size > maxSize) {
          return next(
            new ErrorResponse(
              `File ${file.name} size cannot be more than 10MB`,
              400
            )
          );
        }

        // Check file format if specified
        if (assignment.allowedFormats && assignment.allowedFormats.length > 0) {
          const fileExt = path.extname(file.name).toLowerCase().substring(1);
          if (!assignment.allowedFormats.includes(fileExt)) {
            return next(
              new ErrorResponse(`File ${file.name} format not allowed`, 400)
            );
          }
        }

        // Create custom filename
        const fileExt = path.extname(file.name);
        const fileName = `submission_${req.user.id}_${Date.now()}_${file.name}`;
        const uploadPath = path.join(
          __dirname,
          "../uploads/submissions",
          fileName
        );

        // Move file to uploads folder
        await file.mv(uploadPath);

        attachments.push({
          url: `/uploads/submissions/${fileName}`,
          name: file.name,
          type: file.mimetype,
          size: file.size,
        });
      }
    }

    // Calculate if submission is late
    const isLate = new Date() > new Date(assignment.dueDate);
    const lateDays = isLate
      ? Math.ceil(
          (new Date() - new Date(assignment.dueDate)) / (1000 * 60 * 60 * 24)
        )
      : 0;

    // Create submission
    const submission = await Submission.create({
      assignment: req.body.assignment,
      student: req.user.id,
      class: assignment.class,
      subject: assignment.subject,
      textSubmission: req.body.textSubmission,
      attachments: attachments,
      isLate: isLate,
      lateDays: lateDays,
    });

    res.status(201).json({
      success: true,
      data: submission,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update submission
// @route   PUT /api/submissions/:id
// @access  Private/Student
exports.updateSubmission = async (req, res, next) => {
  try {
    let submission = await Submission.findById(req.params.id);

    if (!submission) {
      return next(
        new ErrorResponse(
          `Submission not found with id of ${req.params.id}`,
          404
        )
      );
    }

    // Check if user is owner
    if (submission.student.toString() !== req.user.id) {
      return next(
        new ErrorResponse("Not authorized to update this submission", 403)
      );
    }

    // Check if submission is already graded
    if (submission.status === "graded") {
      return next(new ErrorResponse("Cannot update a graded submission", 400));
    }

    // Get assignment details
    const assignment = await Assignment.findById(submission.assignment);
    if (!assignment) {
      return next(new ErrorResponse("Assignment not found", 404));
    }

    // Check if assignment is past due
    if (
      new Date() > new Date(assignment.dueDate) &&
      !assignment.allowLateSubmission
    ) {
      return next(new ErrorResponse("Assignment submission is closed", 400));
    }

    // Handle file updates if needed
    // (Implementation similar to createSubmission)

    submission = await Submission.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: submission,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Grade submission
// @route   PUT /api/submissions/:id/grade
// @access  Private/Teacher
exports.gradeSubmission = async (req, res, next) => {
  try {
    let submission = await Submission.findById(req.params.id).populate(
      "assignment",
      "totalMarks createdBy"
    );

    if (!submission) {
      return next(
        new ErrorResponse(
          `Submission not found with id of ${req.params.id}`,
          404
        )
      );
    }

    // Check if user is assignment creator
    if (submission.assignment.createdBy.toString() !== req.user.id) {
      return next(
        new ErrorResponse("Not authorized to grade this submission", 403)
      );
    }

    // Validate marks
    if (req.body.marksAwarded > submission.assignment.totalMarks) {
      return next(
        new ErrorResponse("Marks awarded cannot exceed total marks", 400)
      );
    }

    submission.marksAwarded = req.body.marksAwarded;
    submission.grade = calculateGrade(
      req.body.marksAwarded,
      submission.assignment.totalMarks
    );
    submission.feedback = req.body.feedback;
    submission.gradedBy = req.user.id;
    submission.gradedAt = new Date();
    submission.status = "graded";

    if (req.body.rubrics) {
      submission.rubrics = req.body.rubrics;
    }

    await submission.save();

    res.status(200).json({
      success: true,
      data: submission,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Download submission file
// @route   GET /api/submissions/:id/download/:fileId
// @access  Private
exports.downloadSubmissionFile = async (req, res, next) => {
  try {
    const submission = await Submission.findById(req.params.id);

    if (!submission) {
      return next(
        new ErrorResponse(
          `Submission not found with id of ${req.params.id}`,
          404
        )
      );
    }

    // Check if user has access to this submission
    const hasAccess = await checkSubmissionAccess(req.user, submission);
    if (!hasAccess) {
      return next(
        new ErrorResponse("Not authorized to access this submission", 403)
      );
    }

    // Find the file
    const file = submission.attachments.id(req.params.fileId);
    if (!file) {
      return next(
        new ErrorResponse(`File not found with id of ${req.params.fileId}`, 404)
      );
    }

    const filePath = path.join(__dirname, "../", file.url);
    const fileName = file.name || path.basename(filePath);

    res.download(filePath, fileName);
  } catch (err) {
    next(err);
  }
};

// Helper function to check submission access
const checkSubmissionAccess = async (user, submission) => {
  // Admins have access to everything
  if (user.role === "admin") return true;

  // Student can access their own submission
  if (user.role === "student" && submission.student.toString() === user.id) {
    return true;
  }

  // Teacher can access if they created the assignment
  if (user.role === "teacher") {
    const assignment = await Assignment.findById(submission.assignment);
    if (!assignment) return false;

    return assignment.createdBy.toString() === user.id;
  }

  return false;
};

// Helper function to calculate grade
const calculateGrade = (marks, totalMarks) => {
  const percentage = (marks / totalMarks) * 100;

  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  return "F";
};
