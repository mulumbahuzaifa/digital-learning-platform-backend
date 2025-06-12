const AcademicEnrollment = require("../models/AcademicEnrollment");
const Class = require("../models/Class");
const User = require("../models/User");
const ErrorResponse = require("../utils/errorResponse");
const { sendNotification } = require("../utils/notifications");

// @desc    Get all enrollments
// @route   GET /api/enrollments
// @access  Private (Admin, Teacher)
exports.getEnrollments = async (req, res, next) => {
  try {
    const { student, class: classId, status, academicYear, term } = req.query;
    let query = {};

    if (student) query.student = student;
    if (classId) query.class = classId;
    if (status) query.status = status;
    if (academicYear) query.academicYear = academicYear;
    if (term) query.term = term;

    const enrollments = await AcademicEnrollment.find(query)
      .populate("student", "firstName lastName email")
      .populate("class", "name code level stream")
      .populate("subjects.subject", "name code")
      .sort("-enrollmentDate");

    res.status(200).json({
      success: true,
      count: enrollments.length,
      data: enrollments,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single enrollment
// @route   GET /api/enrollments/:id
// @access  Private
exports.getEnrollment = async (req, res, next) => {
  try {
    const enrollment = await AcademicEnrollment.findById(req.params.id)
      .populate("student", "firstName lastName email")
      .populate("class", "name code level stream")
      .populate("subjects.subject", "name code");

    if (!enrollment) {
      return next(
        new ErrorResponse(
          `Enrollment not found with id of ${req.params.id}`,
          404
        )
      );
    }

    // Check access based on role
    if (req.user.role === "student") {
      if (enrollment.student.toString() !== req.user.id) {
        return next(
          new ErrorResponse(
            "You are not authorized to view this enrollment",
            403
          )
        );
      }
    } else if (req.user.role === "teacher") {
      const classObj = await Class.findById(enrollment.class);
      const teacherAssigned = classObj.subjects.some((s) =>
        s.teachers.some(
          (t) => t.teacher.toString() === req.user.id && t.status === "approved"
        )
      );

      if (!teacherAssigned) {
        return next(
          new ErrorResponse(
            "You are not authorized to view this enrollment",
            403
          )
        );
      }
    }

    res.status(200).json({
      success: true,
      data: enrollment,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create enrollment
// @route   POST /api/enrollments
// @access  Private/Admin
exports.createEnrollment = async (req, res, next) => {
  try {
    // Check if student exists and is actually a student
    const student = await User.findById(req.body.student);
    if (!student || student.role !== "student") {
      return next(
        new ErrorResponse(
          `Student not found with id of ${req.body.student}`,
          404
        )
      );
    }

    // Check if class exists
    const classObj = await Class.findById(req.body.class);
    if (!classObj) {
      return next(
        new ErrorResponse(`Class not found with id of ${req.body.class}`, 404)
      );
    }

    // Check if student already has an active enrollment
    const existingEnrollment = await AcademicEnrollment.findOne({
      student: req.body.student,
      status: "active",
    });

    if (existingEnrollment) {
      return next(
        new ErrorResponse("Student already has an active enrollment", 400)
      );
    }

    // Create enrollment with subjects from class
    const enrollment = await AcademicEnrollment.create({
      ...req.body,
      subjects: classObj.subjects.map((subject) => ({
        subject: subject.subject,
        status: "enrolled",
      })),
      enrolledBy: req.user.id,
    });

    // Send notification to student
    // await sendNotification({
    //   recipient: student._id,
    //   type: "enrollment_created",
    //   title: "New Class Enrollment",
    //   message: `You have been enrolled in ${classObj.name}`,
    //   data: {
    //     enrollmentId: enrollment._id,
    //     classId: classObj._id,
    //     academicYear: enrollment.academicYear,
    //     term: enrollment.term,
    //   },
    // });

    res.status(201).json({
      success: true,
      data: enrollment,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update enrollment
// @route   PUT /api/enrollments/:id
// @access  Private/Admin
exports.updateEnrollment = async (req, res, next) => {
  try {
    let enrollment = await AcademicEnrollment.findById(req.params.id);

    if (!enrollment) {
      return next(
        new ErrorResponse(
          `Enrollment not found with id of ${req.params.id}`,
          404
        )
      );
    }

    // Prevent updating certain fields if enrollment is completed
    if (enrollment.status === "completed") {
      return next(new ErrorResponse("Cannot update completed enrollment", 400));
    }

    enrollment = await AcademicEnrollment.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      data: enrollment,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete enrollment
// @route   DELETE /api/enrollments/:id
// @access  Private/Admin
exports.deleteEnrollment = async (req, res, next) => {
  try {
    const enrollment = await AcademicEnrollment.findById(req.params.id);

    if (!enrollment) {
      return next(
        new ErrorResponse(
          `Enrollment not found with id of ${req.params.id}`,
          404
        )
      );
    }

    // Prevent deleting completed enrollments
    if (enrollment.status === "completed") {
      return next(new ErrorResponse("Cannot delete completed enrollment", 400));
    }

    await enrollment.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get student's enrollments
// @route   GET /api/enrollments/student/:studentId
// @access  Private
exports.getStudentEnrollments = async (req, res, next) => {
  try {
    // Check if user is authorized to view student's enrollments
    if (req.user.role === "student" && req.params.studentId !== req.user.id) {
      return next(
        new ErrorResponse(
          "You are not authorized to view these enrollments",
          403
        )
      );
    }

    const enrollments = await AcademicEnrollment.find({
      student: req.params.studentId,
    })
      .populate("class", "name code level stream")
      .populate("subjects.subject", "name code")
      .sort("-enrollmentDate");

    res.status(200).json({
      success: true,
      count: enrollments.length,
      data: enrollments,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get class enrollments
// @route   GET /api/enrollments/class/:classId
// @access  Private
exports.getClassEnrollments = async (req, res, next) => {
  try {
    // Check if user is authorized to view class enrollments
    if (req.user.role === "teacher") {
      const classObj = await Class.findById(req.params.classId);
      const teacherAssigned = classObj.subjects.some((s) =>
        s.teachers.some(
          (t) => t.teacher.toString() === req.user.id && t.status === "approved"
        )
      );

      if (!teacherAssigned) {
        return next(
          new ErrorResponse(
            "You are not authorized to view these enrollments",
            403
          )
        );
      }
    }

    const enrollments = await AcademicEnrollment.find({
      class: req.params.classId,
      status: "active",
    })
      .populate("student", "firstName lastName email")
      .populate("subjects.subject", "name code")
      .sort("-enrollmentDate");

    res.status(200).json({
      success: true,
      count: enrollments.length,
      data: enrollments,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Transfer enrollment
// @route   POST /api/enrollments/:id/transfer
// @access  Private/Admin
exports.transferEnrollment = async (req, res, next) => {
  try {
    const enrollment = await AcademicEnrollment.findById(req.params.id);

    if (!enrollment) {
      return next(
        new ErrorResponse(
          `Enrollment not found with id of ${req.params.id}`,
          404
        )
      );
    }

    // Check if target class exists
    const targetClass = await Class.findById(req.body.toClass);
    if (!targetClass) {
      return next(
        new ErrorResponse(
          `Target class not found with id of ${req.body.toClass}`,
          404
        )
      );
    }

    // Update enrollment status and transfer details
    enrollment.status = "transferred";
    enrollment.transferDetails = {
      fromClass: enrollment.class,
      toClass: req.body.toClass,
      transferDate: Date.now(),
      reason: req.body.reason,
    };

    await enrollment.save();

    // Create new enrollment in target class
    const newEnrollment = await AcademicEnrollment.create({
      student: enrollment.student,
      class: req.body.toClass,
      academicYear: enrollment.academicYear,
      term: enrollment.term,
      status: "active",
      subjects: targetClass.subjects.map((subject) => ({
        subject: subject.subject,
        status: "enrolled",
      })),
      enrolledBy: req.user.id,
    });

    // Send notification to student
    await sendNotification({
      recipient: enrollment.student,
      type: "enrollment_transferred",
      title: "Class Transfer",
      message: `You have been transferred to ${targetClass.name}`,
      data: {
        oldEnrollmentId: enrollment._id,
        newEnrollmentId: newEnrollment._id,
        fromClass: enrollment.class,
        toClass: targetClass._id,
        reason: req.body.reason,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        oldEnrollment: enrollment,
        newEnrollment,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Complete enrollment
// @route   POST /api/enrollments/:id/complete
// @access  Private/Admin
exports.completeEnrollment = async (req, res, next) => {
  try {
    const enrollment = await AcademicEnrollment.findById(req.params.id);

    if (!enrollment) {
      return next(
        new ErrorResponse(
          `Enrollment not found with id of ${req.params.id}`,
          404
        )
      );
    }

    enrollment.status = "completed";
    enrollment.completionDate = Date.now();

    // Update all subjects to completed status
    enrollment.subjects.forEach((subject) => {
      subject.status = "completed";
      subject.completionDate = Date.now();
    });

    await enrollment.save();

    // Send notification to student
    await sendNotification({
      recipient: enrollment.student,
      type: "enrollment_completed",
      title: "Enrollment Completed",
      message: `Your enrollment in ${enrollment.class.name} has been completed`,
      data: {
        enrollmentId: enrollment._id,
        classId: enrollment.class,
        completionDate: enrollment.completionDate,
      },
    });

    res.status(200).json({
      success: true,
      data: enrollment,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get enrollment statistics
// @route   GET /api/enrollments/stats
// @access  Private/Admin
exports.getEnrollmentStats = async (req, res, next) => {
  try {
    const stats = await AcademicEnrollment.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const formattedStats = {
      total: stats.reduce((acc, curr) => acc + curr.count, 0),
      active: stats.find((s) => s._id === "active")?.count || 0,
      completed: stats.find((s) => s._id === "completed")?.count || 0,
      transferred: stats.find((s) => s._id === "transferred")?.count || 0,
    };

    res.status(200).json({
      success: true,
      data: formattedStats,
    });
  } catch (err) {
    next(err);
  }
};
