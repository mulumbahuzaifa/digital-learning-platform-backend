const asyncHandler = require("../middleware/async");
const Assignment = require("../models/Assignment");
const Class = require("../models/Class");
const Subject = require("../models/Subject");
const AcademicEnrollment = require("../models/AcademicEnrollment");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get all assignments
// @route   GET /api/assignments
// @access  Private (Teacher, Admin)
exports.getAssignments = async (req, res, next) => {
  try {
    // Check if user is teacher or admin
    if (!["teacher", "admin"].includes(req.user.role)) {
      return next(
        new ErrorResponse("Not authorized to view all assignments", 403)
      );
    }

    const { class: classId, subject, status, type } = req.query;
    let query = {};

    if (classId) query.class = classId;
    if (subject) query.subject = subject;
    if (status) query.status = status;
    if (type) query.assignmentType = type;

    // If teacher, only show their assignments
    if (req.user.role === "teacher") {
      query.createdBy = req.user.id;
    }

    const assignments = await Assignment.find(query)
      .populate("class", "name code level stream")
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
      .populate("class", "name code level stream")
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

    // Check access based on role
    if (req.user.role === "student") {
      // Check if student is enrolled in the class
      const enrollment = await AcademicEnrollment.findOne({
        student: req.user.id,
        class: assignment.class,
        status: "active",
      });

      if (!enrollment) {
        return next(
          new ErrorResponse("You are not enrolled in this class", 403)
        );
      }
    } else if (
      req.user.role === "teacher" &&
      assignment.createdBy.toString() !== req.user.id
    ) {
      // Check if teacher is assigned to the subject
      const classObj = await Class.findById(assignment.class);
      const teacherAssigned = classObj.subjects
        .find((s) => s.subject.toString() === assignment.subject.toString())
        ?.teachers.some(
          (t) => t.teacher.toString() === req.user.id && t.status === "approved"
        );

      if (!teacherAssigned) {
        return next(
          new ErrorResponse(
            "You are not authorized to view this assignment",
            403
          )
        );
      }
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
// @access  Private (Teacher, Admin)
exports.createAssignment = async (req, res, next) => {
  try {
    // Check if user is teacher or admin
    if (req.user.role !== "teacher" && req.user.role !== "admin") {
      return next(
        new ErrorResponse("Only teachers and admins can create assignments", 403)
      );
    }

    // Verify class exists
    const classObj = await Class.findById(req.body.class);
    if (!classObj) {
      return next(
        new ErrorResponse(`Class not found with id of ${req.body.class}`, 404)
      );
    }

    // Verify subject exists in class
    const subjectExists = classObj.subjects.some(
      (s) => s.subject.toString() === req.body.subject
    );
    if (!subjectExists) {
      return next(new ErrorResponse("Subject not found in this class", 404));
    }

    // Skip teacher verification for admins
    if (req.user.role === "teacher") {
      // Verify teacher is assigned to this subject
      const teacherAssigned = classObj.subjects
        .find((s) => s.subject.toString() === req.body.subject)
        ?.teachers.some(
          (t) => t.teacher.toString() === req.user.id && t.status === "approved"
        );

      if (!teacherAssigned) {
        return next(
          new ErrorResponse(
            "You are not authorized to create assignments for this subject",
            403
          )
        );
      }
    }

    // Validate assignment type
    const validTypes = ["homework", "quiz", "project", "exam"];
    if (!validTypes.includes(req.body.assignmentType)) {
      return next(new ErrorResponse("Invalid assignment type", 400));
    }

    // Validate due date
    if (new Date(req.body.dueDate) <= new Date()) {
      return next(new ErrorResponse("Due date must be in the future", 400));
    }

    // Create assignment
    const assignment = await Assignment.create({
      ...req.body,
      createdBy: req.user.id,
      status: "draft", // Default status
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
// @access  Private/Teacher/Admin
exports.updateAssignment = async (req, res, next) => {
  try {
    // Check if user is teacher or admin
    if (req.user.role !== "teacher" && req.user.role !== "admin") {
      return next(
        new ErrorResponse("Only teachers and admins can update assignments", 403)
      );
    }

    let assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return next(
        new ErrorResponse(
          `Assignment not found with id of ${req.params.id}`,
          404
        )
      );
    }

    // For teachers, verify they are the creator
    if (req.user.role === "teacher" && assignment.createdBy.toString() !== req.user.id) {
      return next(
        new ErrorResponse(
          "You are not authorized to update this assignment",
          403
        )
      );
    }

    // For teachers, if changing class or subject, verify they are assigned
    if (req.user.role === "teacher" && (req.body.class || req.body.subject)) {
      const classObj = await Class.findById(req.body.class || assignment.class);
      const subjectId = req.body.subject || assignment.subject;

      const teacherAssigned = classObj.subjects
        .find((s) => s.subject.toString() === subjectId.toString())
        ?.teachers.some(
          (t) => t.teacher.toString() === req.user.id && t.status === "approved"
        );

      if (!teacherAssigned) {
        return next(
          new ErrorResponse(
            "You are not authorized to assign to this class/subject",
            403
          )
        );
      }
    }

    // Validate assignment type if being updated
    if (req.body.assignmentType) {
      const validTypes = ["homework", "quiz", "project", "exam"];
      if (!validTypes.includes(req.body.assignmentType)) {
        return next(new ErrorResponse("Invalid assignment type", 400));
      }
    }

    // Validate due date if being updated
    if (req.body.dueDate && new Date(req.body.dueDate) <= new Date()) {
      return next(new ErrorResponse("Due date must be in the future", 400));
    }

    // Prevent updating certain fields if assignment is published (except for admins)
    if (assignment.status === "published" && req.user.role !== "admin") {
      const restrictedFields = [
        "class",
        "subject",
        "assignmentType",
        "totalMarks",
      ];
      for (const field of restrictedFields) {
        if (req.body[field]) {
          return next(
            new ErrorResponse(
              `Cannot update ${field} of published assignment`,
              400
            )
          );
        }
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
// @access  Private/Teacher/Admin
exports.deleteAssignment = async (req, res, next) => {
  try {
    // Check if user is teacher or admin
    if (req.user.role !== "teacher" && req.user.role !== "admin") {
      return next(
        new ErrorResponse("Only teachers and admins can delete assignments", 403)
      );
    }

    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return next(
        new ErrorResponse(
          `Assignment not found with id of ${req.params.id}`,
          404
        )
      );
    }

    // For teachers, verify they are the creator
    if (req.user.role === "teacher" && assignment.createdBy.toString() !== req.user.id) {
      return next(
        new ErrorResponse(
          "You are not authorized to delete this assignment",
          403
        )
      );
    }

    // Prevent teachers from deleting published assignments (admins can delete any)
    if (assignment.status === "published" && req.user.role !== "admin") {
      return next(new ErrorResponse("Cannot delete published assignment", 400));
    }

    await assignment.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get assignments for a student
// @route   GET /api/assignments/student
// @access  Private/Student
exports.getStudentAssignments = async (req, res, next) => {
  try {
    // Check if user is student
    if (req.user.role !== "student") {
      return next(
        new ErrorResponse("Only students can access this endpoint", 403)
      );
    }

    // Get student's current enrollments
    const enrollments = await AcademicEnrollment.find({
      student: req.user.id,
      status: "active",
    }).populate("class", "name code level stream");

    if (!enrollments.length) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
      });
    }

    // Get assignments for enrolled classes
    const assignments = await Assignment.find({
      class: { $in: enrollments.map((e) => e.class._id) },
      status: "published",
    })
      .populate("class", "name code level stream")
      .populate("subject", "name code")
      .populate("createdBy", "firstName lastName")
      .sort("-createdAt");

    // Transform response to include enrollment info
    const transformedAssignments = assignments.map((assignment) => {
      const enrollment = enrollments.find(
        (e) => e.class._id.toString() === assignment.class._id.toString()
      );
      return {
        ...assignment.toObject(),
        academicYear: enrollment.academicYear,
        term: enrollment.term,
      };
    });

    res.status(200).json({
      success: true,
      count: transformedAssignments.length,
      data: transformedAssignments,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get assignments for a teacher
// @route   GET /api/assignments/teacher
// @access  Private/Teacher
exports.getTeacherAssignments = async (req, res, next) => {
  try {
    // Check if user is teacher
    if (req.user.role !== "teacher") {
      return next(
        new ErrorResponse("Only teachers can access this endpoint", 403)
      );
    }

    // Get classes where teacher is assigned
    const classes = await Class.find({
      "subjects.teachers": {
        $elemMatch: {
          teacher: req.user.id,
          status: "approved",
        },
      },
    });

    if (!classes.length) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
      });
    }

    // Get assignments for these classes
    const assignments = await Assignment.find({
      class: { $in: classes.map((c) => c._id) },
      createdBy: req.user.id,
    })
      .populate("class", "name code level stream")
      .populate("subject", "name code")
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
