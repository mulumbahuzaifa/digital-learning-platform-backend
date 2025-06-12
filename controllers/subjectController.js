const Class = require("../models/Class");
const Subject = require("../models/Subject");
const User = require("../models/User");
const AcademicEnrollment = require("../models/AcademicEnrollment");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");

// @desc    Get all subjects
// @route   GET /api/subjects
// @access  Private
exports.getSubjects = asyncHandler(async (req, res, next) => {
  const {
    category,
    subCategory,
    isActive,
    search,
    sort,
    page = 1,
    limit = 10,
  } = req.query;
  let query = {};

  // Filter by category if provided
  if (category) {
    query.category = category;
  }

  // Filter by subCategory if provided
  if (subCategory) {
    query.subCategory = subCategory;
  }

  // Filter by active status
  if (isActive !== undefined) {
    query.isActive = isActive === "true";
  }

  // Search functionality
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { code: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  // Role-based filtering
  if (req.user.role === "teacher") {
    // Get subjects taught by the teacher
    const teacherClasses = await Class.find({
      "subjects.teachers": {
        $elemMatch: {
          teacher: req.user._id,
          status: "approved",
        },
      },
    });

    const subjectIds = teacherClasses.reduce((acc, classObj) => {
      classObj.subjects.forEach((subject) => {
        if (subject.status === "active") {
          acc.push(subject.subject);
        }
      });
      return acc;
    }, []);

    query._id = { $in: subjectIds };
  } else if (req.user.role === "student") {
    // Get subjects from student's enrolled classes
    const enrollments = await AcademicEnrollment.find({
      student: req.user._id,
      status: "active",
    });

    const classIds = enrollments.map((e) => e.class);
    const studentClasses = await Class.find({ _id: { $in: classIds } });

    const subjectIds = studentClasses.reduce((acc, classObj) => {
      classObj.subjects.forEach((subject) => {
        if (subject.status === "active") {
          acc.push(subject.subject);
        }
      });
      return acc;
    }, []);

    query._id = { $in: subjectIds };
  }

  // Build sort object
  let sortObj = {};
  if (sort) {
    const sortFields = sort.split(",");
    sortFields.forEach((field) => {
      const order = field.startsWith("-") ? -1 : 1;
      const fieldName = field.startsWith("-") ? field.slice(1) : field;
      sortObj[fieldName] = order;
    });
  } else {
    sortObj = { name: 1 };
  }

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const subjects = await Subject.find(query)
    .sort(sortObj)
    .skip(skip)
    .limit(parseInt(limit))
    .populate("teachers", "firstName lastName email avatar");

  const total = await Subject.countDocuments(query);

  res.status(200).json({
    success: true,
    count: subjects.length,
    total,
    totalPages: Math.ceil(total / parseInt(limit)),
    currentPage: parseInt(page),
    data: subjects,
  });
});

// @desc    Get single subject
// @route   GET /api/subjects/:id
// @access  Private
exports.getSubject = asyncHandler(async (req, res, next) => {
  const subject = await Subject.findById(req.params.id).populate(
    "teachers",
    "firstName lastName email avatar"
  );

  if (!subject) {
    return next(
      new ErrorResponse(`Subject not found with id of ${req.params.id}`, 404)
    );
  }

  // Check access based on role
  if (req.user.role === "teacher") {
    const isTeacher = await Class.findOne({
      "subjects.subject": subject._id,
      "subjects.teachers": {
        $elemMatch: {
          teacher: req.user._id,
          status: "approved",
        },
      },
    });

    if (!isTeacher) {
      return next(
        new ErrorResponse("Not authorized to access this subject", 403)
      );
    }
  } else if (req.user.role === "student") {
    const isEnrolled = await AcademicEnrollment.findOne({
      student: req.user._id,
      status: "active",
      class: {
        $in: await Class.find({
          "subjects.subject": subject._id,
          "subjects.status": "active",
        }).distinct("_id"),
      },
    });

    if (!isEnrolled) {
      return next(
        new ErrorResponse("Not authorized to access this subject", 403)
      );
    }
  }

  res.status(200).json({
    success: true,
    data: subject,
  });
});

// @desc    Create subject
// @route   POST /api/subjects
// @access  Private/Admin
exports.createSubject = asyncHandler(async (req, res, next) => {
  // Check if subject with same code exists
  const existingSubject = await Subject.findOne({
    code: req.body.code,
  });

  if (existingSubject) {
    return next(
      new ErrorResponse("Subject with this code already exists", 400)
    );
  }

  const subject = await Subject.create(req.body);

  res.status(201).json({
    success: true,
    data: subject,
  });
});

// @desc    Update subject
// @route   PUT /api/subjects/:id
// @access  Private/Admin
exports.updateSubject = asyncHandler(async (req, res, next) => {
  let subject = await Subject.findById(req.params.id);

  if (!subject) {
    return next(
      new ErrorResponse(`Subject not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if subject with same code exists
  if (req.body.code) {
    const existingSubject = await Subject.findOne({
      code: req.body.code,
      _id: { $ne: req.params.id },
    });

    if (existingSubject) {
      return next(
        new ErrorResponse("Subject with this code already exists", 400)
      );
    }
  }

  subject = await Subject.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate("teachers", "firstName lastName email avatar");

  res.status(200).json({
    success: true,
    data: subject,
  });
});

// @desc    Delete subject
// @route   DELETE /api/subjects/:id
// @access  Private/Admin
exports.deleteSubject = asyncHandler(async (req, res, next) => {
  const subject = await Subject.findById(req.params.id);

  if (!subject) {
    return next(
      new ErrorResponse(`Subject not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if subject is being used in any classes
  // const classesUsingSubject = await Class.findOne({
  //   "subjects.subject": req.params.id,
  // });

  // if (classesUsingSubject) {
  //   return next(
  //     new ErrorResponse(
  //       "Cannot delete subject that is assigned to classes",
  //       400
  //     )
  //   );
  // }

  await subject.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Get classes for a subject
// @route   GET /api/subjects/:id/classes
// @access  Private
exports.getSubjectClasses = asyncHandler(async (req, res, next) => {
  const subject = await Subject.findById(req.params.id);

  if (!subject) {
    return next(
      new ErrorResponse(`Subject not found with id of ${req.params.id}`, 404)
    );
  }

  // Check access based on role
  if (req.user.role === "teacher") {
    const isTeacher = await Class.findOne({
      "subjects.subject": subject._id,
      "subjects.teachers": {
        $elemMatch: {
          teacher: req.user._id,
          status: "approved",
        },
      },
    });

    if (!isTeacher) {
      return next(
        new ErrorResponse("Not authorized to access this subject", 403)
      );
    }
  } else if (req.user.role === "student") {
    const isEnrolled = await AcademicEnrollment.findOne({
      student: req.user._id,
      status: "active",
      class: {
        $in: await Class.find({
          "subjects.subject": subject._id,
          "subjects.status": "active",
        }).distinct("_id"),
      },
    });

    if (!isEnrolled) {
      return next(
        new ErrorResponse("Not authorized to access this subject", 403)
      );
    }
  }

  const classes = await Class.find({ "subjects.subject": req.params.id })
    .populate("subjects.subject")
    .populate("subjects.teachers.teacher", "firstName lastName email avatar")
    .sort("name");

  res.status(200).json({
    success: true,
    count: classes.length,
    data: classes,
  });
});

// @desc    Get teachers for a subject
// @route   GET /api/subjects/:id/teachers
// @access  Private
exports.getSubjectTeachers = asyncHandler(async (req, res, next) => {
  const subject = await Subject.findById(req.params.id);

  if (!subject) {
    return next(
      new ErrorResponse(`Subject not found with id of ${req.params.id}`, 404)
    );
  }

  // Check access based on role
  if (req.user.role === "teacher") {
    const isTeacher = await Class.findOne({
      "subjects.subject": subject._id,
      "subjects.teachers": {
        $elemMatch: {
          teacher: req.user._id,
          status: "approved",
        },
      },
    });

    if (!isTeacher) {
      return next(
        new ErrorResponse("Not authorized to access this subject", 403)
      );
    }
  } else if (req.user.role === "student") {
    const isEnrolled = await AcademicEnrollment.findOne({
      student: req.user._id,
      status: "active",
      class: {
        $in: await Class.find({
          "subjects.subject": subject._id,
          "subjects.status": "active",
        }).distinct("_id"),
      },
    });

    if (!isEnrolled) {
      return next(
        new ErrorResponse("Not authorized to access this subject", 403)
      );
    }
  }

  const classes = await Class.find({
    "subjects.subject": req.params.id,
  }).populate(
    "subjects.teachers.teacher",
    "firstName lastName email avatar role"
  );

  const teachers = classes.reduce((acc, classObj) => {
    classObj.subjects.forEach((subject) => {
      if (subject.subject.toString() === req.params.id) {
        subject.teachers.forEach((teacher) => {
          if (
            teacher.status === "approved" &&
            !acc.some(
              (t) => t._id.toString() === teacher.teacher._id.toString()
            )
          ) {
            acc.push(teacher.teacher);
          }
        });
      }
    });
    return acc;
  }, []);

  res.status(200).json({
    success: true,
    count: teachers.length,
    data: teachers,
  });
});

// @desc    Get students for a subject
// @route   GET /api/subjects/:id/students
// @access  Private/Teacher
exports.getSubjectStudents = asyncHandler(async (req, res, next) => {
  const subject = await Subject.findById(req.params.id);

  if (!subject) {
    return next(
      new ErrorResponse(`Subject not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if user is a teacher of this subject
  const isTeacher = await Class.findOne({
    "subjects.subject": subject._id,
    "subjects.teachers": {
      $elemMatch: {
        teacher: req.user._id,
        status: "approved",
      },
    },
  });

  if (!isTeacher) {
    return next(
      new ErrorResponse("Not authorized to access this subject", 403)
    );
  }

  // Get all classes that have this subject
  const classes = await Class.find({
    "subjects.subject": subject._id,
    "subjects.status": "active",
  });

  // Get all active enrollments for these classes
  const enrollments = await AcademicEnrollment.find({
    class: { $in: classes.map((c) => c._id) },
    status: "active",
  }).populate("student", "firstName lastName email avatar");

  const students = enrollments.map((e) => e.student);

  res.status(200).json({
    success: true,
    count: students.length,
    data: students,
  });
});
