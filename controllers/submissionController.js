const Submission = require("../models/Submission");
const Assignment = require("../models/Assignment");
const AcademicEnrollment = require("../models/AcademicEnrollment");
const ErrorResponse = require("../utils/errorResponse");
const path = require("path");
const fs = require("fs");
const User = require("../models/User");
const { validateObjectId } = require("../utils/validators");
const { calculateGrade } = require("../utils/gradingUtils");
const { checkPlagiarism } = require("../utils/plagiarismChecker");
const { sendNotification } = require("../utils/notifications");
const { getFileInfo } = require("../utils/fileUpload");

const asyncHandler = require("../middleware/async");

// @desc    Grade a submission
// @route   PUT /api/submissions/:id/grade
// @access  Private (Teacher, Admin)
exports.gradeSubmission = asyncHandler(async (req, res, next) => {
  const submission = await Submission.findById(req.params.id);

  if (!submission) {
    return next(new ErrorResponse("Submission not found", 404));
  }

  // Check if user is teacher or admin
  if (!["teacher", "admin"].includes(req.user.role)) {
    return next(new ErrorResponse("Not authorized to grade submissions", 403));
  }

  // Update submission with grade
  submission.grade = req.body.grade;
  submission.feedback = req.body.feedback;
  submission.gradedBy = req.user.id;
  submission.gradedAt = Date.now();
  submission.status = "graded";

  await submission.save();

  // Notify student
  await sendNotification({
    recipient: submission.student,
    type: "submission_graded",
    title: "Submission Graded",
    message: `Your submission for ${submission.assignment.title} has been graded.`,
    data: {
      submissionId: submission._id,
      assignmentId: submission.assignment,
      grade: submission.grade,
    },
  });

  res.status(200).json({
    success: true,
    data: submission,
  });
});

// @desc    Get all submissions
// @route   GET /api/submissions
// @access  Private (Teacher, Admin)
exports.getSubmissions = async (req, res, next) => {
  try {
    // Check if user is teacher or admin
    if (!["teacher", "admin"].includes(req.user.role)) {
      return next(
        new ErrorResponse("Not authorized to view all submissions", 403)
      );
    }

    const { assignment, student, status } = req.query;
    let query = {};

    if (assignment) query.assignment = assignment;
    if (student) query.student = student;
    if (status) query.status = status;

    // If teacher, only show submissions for their assignments
    if (req.user.role === "teacher") {
      const assignments = await Assignment.find({
        createdBy: req.user.id,
      }).select("_id");
      query.assignment = { $in: assignments.map((a) => a._id) };
    }

    const submissions = await Submission.find(query)
      .populate("assignment", "title dueDate totalMarks")
      .populate("student", "firstName lastName")
      .populate("enrollment", "academicYear term")
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
      .populate("enrollment", "academicYear term");

    if (!submission) {
      return next(
        new ErrorResponse(
          `Submission not found with id of ${req.params.id}`,
          404
        )
      );
    }

    // Check access based on role
    if (req.user.role === "student") {
      if (submission.student.toString() !== req.user.id) {
        return next(
          new ErrorResponse(
            "You are not authorized to view this submission",
            403
          )
        );
      }
    } else if (req.user.role === "teacher") {
      const assignment = await Assignment.findById(submission.assignment);
      if (!assignment || assignment.createdBy.toString() !== req.user.id) {
        return next(
          new ErrorResponse(
            "You are not authorized to view this submission",
            403
          )
        );
      }
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
    // Check if user is student
    if (req.user.role !== "student") {
      return next(
        new ErrorResponse("Only students can create submissions", 403)
      );
    }

    // Verify assignment exists and is published
    const assignment = await Assignment.findById(req.body.assignment);
    if (!assignment) {
      return next(
        new ErrorResponse(
          `Assignment not found with id of ${req.body.assignment}`,
          404
        )
      );
    }

    if (assignment.status !== "published") {
      return next(
        new ErrorResponse("Cannot submit to unpublished assignment", 400)
      );
    }

    // Verify student is enrolled in the class
    const enrollment = await AcademicEnrollment.findOne({
      student: req.user.id,
      class: assignment.class,
      status: "active",
    });

    if (!enrollment) {
      return next(new ErrorResponse("You are not enrolled in this class", 403));
    }

    // Check if submission already exists
    let submission = await Submission.findOne({
      assignment: req.body.assignment,
      student: req.user.id,
    });

    // Validate submission content
    if (
      !req.body.textSubmission &&
      (!req.body.files || req.body.files.length === 0)
    ) {
      return next(
        new ErrorResponse("Submission must include either text or files", 400)
      );
    }

    // Validate file types and sizes if files are provided
    if (req.body.files && req.body.files.length > 0) {
      const maxFileSize = 10 * 1024 * 1024; // 10MB
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png",
      ];

      for (const file of req.body.files) {
        if (file.size > maxFileSize) {
          return next(
            new ErrorResponse(
              `File ${file.originalname} exceeds maximum size of 10MB`,
              400
            )
          );
        }
        if (!allowedTypes.includes(file.mimetype)) {
          return next(
            new ErrorResponse(`File type ${file.mimetype} is not allowed`, 400)
          );
        }
      }
    }

    // If submission exists, update it
    if (submission) {
      // Check if submission can be updated
      if (submission.status === "graded") {
        return next(new ErrorResponse("Cannot update graded submission", 400));
      }

      // Get assignment to check due date
      if (!assignment.allowLateSubmission && new Date() > assignment.dueDate) {
        return next(
          new ErrorResponse("Cannot update submission after due date", 400)
        );
      }

      // Update existing submission
      submission = await Submission.findByIdAndUpdate(
        submission._id,
        {
          ...req.body,
          status: "resubmitted",
          submitDate: Date.now(),
          resubmissionCount: (submission.resubmissionCount || 0) + 1,
        },
        {
          new: true,
          runValidators: true,
        }
      );

      return res.status(200).json({
        success: true,
        message: "Submission updated successfully",
        data: submission,
      });
    }

    // Create new submission
    submission = await Submission.create({
      ...req.body,
      student: req.user.id,
      enrollment: enrollment._id,
      status: "submitted",
      submitDate: Date.now(),
      resubmissionCount: 0,
    });

    res.status(201).json({
      success: true,
      message: "Submission created successfully",
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
    // Check if user is student
    if (req.user.role !== "student") {
      return next(
        new ErrorResponse("Only students can update submissions", 403)
      );
    }

    let submission = await Submission.findById(req.params.id);

    if (!submission) {
      return next(
        new ErrorResponse(
          `Submission not found with id of ${req.params.id}`,
          404
        )
      );
    }

    // Verify student is the owner
    if (submission.student.toString() !== req.user.id) {
      return next(
        new ErrorResponse(
          "You are not authorized to update this submission",
          403
        )
      );
    }

    // Check if submission can be updated
    if (submission.status === "graded") {
      return next(new ErrorResponse("Cannot update graded submission", 400));
    }

    // Get assignment to check due date
    const assignment = await Assignment.findById(submission.assignment);
    if (!assignment.allowLateSubmission && new Date() > assignment.dueDate) {
      return next(
        new ErrorResponse("Cannot update submission after due date", 400)
      );
    }

    // Validate submission content
    if (
      !req.body.textSubmission &&
      (!req.body.files || req.body.files.length === 0)
    ) {
      return next(
        new ErrorResponse("Submission must include either text or files", 400)
      );
    }

    // Validate file types and sizes if files are provided
    if (req.body.files && req.body.files.length > 0) {
      const maxFileSize = 10 * 1024 * 1024; // 10MB
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png",
      ];

      for (const file of req.body.files) {
        if (file.size > maxFileSize) {
          return next(
            new ErrorResponse(
              `File ${file.originalname} exceeds maximum size of 10MB`,
              400
            )
          );
        }
        if (!allowedTypes.includes(file.mimetype)) {
          return next(
            new ErrorResponse(`File type ${file.mimetype} is not allowed`, 400)
          );
        }
      }
    }

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

// @desc    Get submissions by assignment
// @route   GET /api/submissions/assignment/:assignmentId
// @access  Private (Teacher, Admin)
exports.getSubmissionsByAssignment = asyncHandler(async (req, res, next) => {
  const submissions = await Submission.find({
    assignment: req.params.assignmentId,
  }).populate({
    path: "student",
    select: "name email",
  });

  res.status(200).json({
    success: true,
    count: submissions.length,
    data: submissions,
  });
});

// @desc    Request resubmission
// @route   PUT /api/submissions/:id/request-resubmission
// @access  Private (Teacher, Admin)
exports.requestResubmission = asyncHandler(async (req, res, next) => {
  const submission = await Submission.findById(req.params.id);

  if (!submission) {
    return next(new ErrorResponse("Submission not found", 404));
  }

  // Check if user is teacher or admin
  if (!["teacher", "admin"].includes(req.user.role)) {
    return next(
      new ErrorResponse("Not authorized to request resubmission", 403)
    );
  }

  submission.status = "resubmission_requested";
  submission.resubmissionReason = req.body.reason;
  submission.resubmissionDeadline = req.body.deadline;

  await submission.save();

  // Notify student
  await sendNotification({
    recipient: submission.student,
    type: "resubmission_requested",
    title: "Resubmission Requested",
    message: `Your submission for ${submission.assignment.title} needs to be resubmitted.`,
    data: {
      submissionId: submission._id,
      assignmentId: submission.assignment,
      reason: req.body.reason,
      deadline: req.body.deadline,
    },
  });

  res.status(200).json({
    success: true,
    data: submission,
  });
});

// @desc    Add parent feedback
// @route   PUT /api/submissions/:id/parent-feedback
// @access  Private (Parent)
exports.addParentFeedback = asyncHandler(async (req, res, next) => {
  const submission = await Submission.findById(req.params.id);

  if (!submission) {
    return next(new ErrorResponse("Submission not found", 404));
  }

  // Check if user is parent
  if (req.user.role !== "parent") {
    return next(
      new ErrorResponse("Not authorized to add parent feedback", 403)
    );
  }

  submission.parentFeedback = {
    feedback: req.body.feedback,
    parent: req.user.id,
    date: Date.now(),
  };

  await submission.save();

  res.status(200).json({
    success: true,
    data: submission,
  });
});

// @desc    Check submission for plagiarism
// @route   POST /api/submissions/:id/check-plagiarism
// @access  Private (Teacher, Admin)
exports.checkSubmissionPlagiarism = asyncHandler(async (req, res, next) => {
  const submission = await Submission.findById(req.params.id);

  if (!submission) {
    return next(new ErrorResponse("Submission not found", 404));
  }

  // Check if user is teacher or admin
  if (!["teacher", "admin"].includes(req.user.role)) {
    return next(new ErrorResponse("Not authorized to check plagiarism", 403));
  }

  const result = await checkPlagiarism(submission.content);

  submission.plagiarismCheck = {
    score: result.score,
    report: result.report,
    checkedBy: req.user.id,
    checkedAt: Date.now(),
  };

  await submission.save();

  res.status(200).json({
    success: true,
    data: submission,
  });
});

// @desc    Get submission statistics
// @route   GET /api/submissions/stats
// @access  Private (Teacher, Admin)
exports.getSubmissionStats = asyncHandler(async (req, res, next) => {
  // Check if user is teacher or admin
  if (!["teacher", "admin"].includes(req.user.role)) {
    return next(new ErrorResponse("Not authorized to view statistics", 403));
  }

  const stats = await Submission.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    data: stats,
  });
});

// @desc    Download submission file
// @route   GET /api/submissions/:id/download/:fileId
// @access  Private
exports.downloadSubmissionFile = asyncHandler(async (req, res, next) => {
  const submission = await Submission.findById(req.params.id);

  if (!submission) {
    return next(new ErrorResponse("Submission not found", 404));
  }

  // Check access
  await checkSubmissionAccess(submission, req.user);

  const file = submission.files.find(
    (f) => f._id.toString() === req.params.fileId
  );

  if (!file) {
    return next(new ErrorResponse("File not found", 404));
  }

  res.download(file.path, file.originalname);
});

// Helper function to check submission access
const checkSubmissionAccess = async (submission, user) => {
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

// @desc    Get student's submissions
// @route   GET /api/submissions/student
// @access  Private/Student
exports.getStudentSubmissions = async (req, res, next) => {
  try {
    // Check if user is student
    if (req.user.role !== "student") {
      return next(
        new ErrorResponse("Only students can access this endpoint", 403)
      );
    }

    const submissions = await Submission.find({ student: req.user.id })
      .populate("assignment", "title dueDate totalMarks")
      .populate("enrollment", "academicYear term")
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

// @desc    Get teacher's submissions to grade
// @route   GET /api/submissions/teacher
// @access  Private/Teacher
exports.getTeacherSubmissions = async (req, res, next) => {
  try {
    // Check if user is teacher
    if (req.user.role !== "teacher") {
      return next(
        new ErrorResponse("Only teachers can access this endpoint", 403)
      );
    }

    // Get assignments created by teacher
    const assignments = await Assignment.find({
      createdBy: req.user.id,
    }).select("_id");

    const submissions = await Submission.find({
      assignment: { $in: assignments.map((a) => a._id) },
    })
      .populate("assignment", "title dueDate totalMarks")
      .populate("student", "firstName lastName")
      .populate("enrollment", "academicYear term")
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
