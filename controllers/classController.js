const Class = require("../models/Class");
const Subject = require("../models/Subject");
const User = require("../models/User");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get all classes
// @route   GET /api/classes
// @access  Private
exports.getClasses = async (req, res, next) => {
  try {
    const { year, term, subject } = req.query;
    let query = {};

    if (year) query.year = year;
    if (term) query.academicTerm = term;
    if (subject) query["subjects.subject"] = subject;

    const classes = await Class.find(query)
      .populate("subjects.subject", "name code")
      .populate("subjects.teachers.teacher", "firstName lastName")
      .populate("students.student", "firstName lastName")
      .populate({
        path: "classTeacher",
        select: "firstName lastName email", // Only populate if field exists
      })
      .sort("name");

    res.status(200).json({
      success: true,
      count: classes.length,
      data: classes,
    });
  } catch (err) {
    console.error("Error fetching classes:", err);
    next(err);
  }
};

// @desc    Get single class
// @route   GET /api/classes/:id
// @access  Private
exports.getClass = async (req, res, next) => {
  try {
    const classObj = await Class.findById(req.params.id)
      .populate("subjects.subject")
      .populate("subjects.teachers.teacher", "firstName lastName")
      .populate("students.student", "firstName lastName")
      .populate("classTeacher", "firstName lastName");

    if (!classObj) {
      return next(
        new ErrorResponse(`Class not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: classObj,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create class
// @route   POST /api/classes
// @access  Private/Admin
exports.createClass = async (req, res, next) => {
  try {
    const { name, year, academicTerm, description } = req.body;

    // Initialize subjects as empty array if not provided
    const subjects = req.body.subjects || [];

    // Validate subjects if provided
    if (subjects.length > 0) {
      // Verify all subjects exist
      const subjectDocs = await Subject.find({
        _id: { $in: subjects.map((s) => s.subject) },
      });

      if (subjectDocs.length !== subjects.length) {
        return next(new ErrorResponse("One or more subjects not found", 404));
      }
    }

    // Generate unique class code
    const subjectCode =
      subjects.length > 0
        ? subjects[0].subject.code.substring(0, 4).toUpperCase()
        : "GEN";
    const randomChars = Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase();
    const code = `${year}-${subjectCode}-${academicTerm.replace(
      "Term ",
      "T"
    )}-${randomChars}`;

    // Create class with subjects
    const newClass = await Class.create({
      name,
      code,
      year,
      academicTerm,
      description,
      subjects: subjects.map((subject) => ({
        subject: subject.subject,
        teachers: subject.teachers || [],
      })),
    });

    res.status(201).json({
      success: true,
      data: newClass,
    });
  } catch (err) {
    console.error("Error creating class:", err);
    next(err);
  }
};

// @desc    Update class
// @route   PUT /api/classes/:id
// @access  Private/Admin
exports.updateClass = async (req, res, next) => {
  try {
    let classObj = await Class.findById(req.params.id);

    if (!classObj) {
      return next(
        new ErrorResponse(`Class not found with id of ${req.params.id}`, 404)
      );
    }

    // Verify subjects if being updated
    if (req.body.subjects && req.body.subjects.length > 0) {
      const subjects = await Subject.find({
        _id: { $in: req.body.subjects.map((s) => s.subject) },
      });

      if (subjects.length !== req.body.subjects.length) {
        return next(new ErrorResponse("One or more subjects not found", 404));
      }
    }

    classObj = await Class.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: classObj,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete class
// @route   DELETE /api/classes/:id
// @access  Private/Admin
exports.deleteClass = async (req, res, next) => {
  try {
    const classObj = await Class.findById(req.params.id);

    if (!classObj) {
      return next(
        new ErrorResponse(`Class not found with id of ${req.params.id}`, 404)
      );
    }

    await classObj.remove();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Add subject to class
// @route   POST /api/classes/:classId/subjects
// @access  Private/Admin
exports.addSubjectToClass = async (req, res, next) => {
  try {
    const classObj = await Class.findById(req.params.id);

    if (!classObj) {
      return next(
        new ErrorResponse(`Class not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if subject exists
    const subject = await Subject.findById(req.body.subject);
    if (!subject) {
      return next(
        new ErrorResponse(
          `Subject not found with id of ${req.body.subject}`,
          404
        )
      );
    }

    // Check if subject already in class
    const subjectExists = classObj.subjects.some(
      (s) => s.subject.toString() === req.body.subject
    );

    if (subjectExists) {
      return next(
        new ErrorResponse("Subject already exists in this class", 400)
      );
    }

    classObj.subjects.push({
      subject: req.body.subject,
      teachers: req.body.teachers || [],
    });

    await classObj.save();

    res.status(200).json({
      success: true,
      data: classObj,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Remove subject from class
// @route   DELETE /api/classes/:id/subjects/:subjectId
// @access  Private/Admin
exports.removeSubjectFromClass = async (req, res, next) => {
  try {
    const classObj = await Class.findById(req.params.id);

    if (!classObj) {
      return next(
        new ErrorResponse(`Class not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if subject exists in class
    const subjectIndex = classObj.subjects.findIndex(
      (s) => s.subject.toString() === req.params.subjectId
    );

    if (subjectIndex === -1) {
      return next(new ErrorResponse("Subject not found in this class", 404));
    }

    classObj.subjects.splice(subjectIndex, 1);
    await classObj.save();

    res.status(200).json({
      success: true,
      data: classObj,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Assign teacher to subject in class
// @route   POST /api/classes/:id/subjects/:subjectId/teachers
// @access  Private/Admin
exports.assignTeacherToSubject = async (req, res, next) => {
  try {
    const classObj = await Class.findById(req.params.id);

    if (!classObj) {
      return next(
        new ErrorResponse(`Class not found with id of ${req.params.id}`, 404)
      );
    }

    // Check if teacher exists and is a teacher
    const teacher = await User.findById(req.body.teacher);
    if (!teacher || teacher.role !== "teacher") {
      return next(
        new ErrorResponse(
          `Teacher not found with id of ${req.body.teacher}`,
          404
        )
      );
    }

    // Find subject in class
    const subject = classObj.subjects.find(
      (s) => s.subject.toString() === req.params.subjectId
    );

    if (!subject) {
      return next(new ErrorResponse("Subject not found in this class", 404));
    }

    // Check if teacher already assigned
    const teacherExists = subject.teachers.some(
      (t) => t.teacher.toString() === req.body.teacher
    );

    if (teacherExists) {
      return next(
        new ErrorResponse("Teacher already assigned to this subject", 400)
      );
    }

    subject.teachers.push({
      teacher: req.body.teacher,
      isLeadTeacher: req.body.isLeadTeacher || false,
      status: "approved",
    });

    await classObj.save();

    res.status(200).json({
      success: true,
      data: classObj,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Remove teacher from subject in class
// @route   DELETE /api/classes/:id/subjects/:subjectId/teachers/:teacherId
// @access  Private/Admin
exports.removeTeacherFromSubject = async (req, res, next) => {
  try {
    const classObj = await Class.findById(req.params.id);

    if (!classObj) {
      return next(
        new ErrorResponse(`Class not found with id of ${req.params.id}`, 404)
      );
    }

    // Find subject in class
    const subject = classObj.subjects.find(
      (s) => s.subject.toString() === req.params.subjectId
    );

    if (!subject) {
      return next(new ErrorResponse("Subject not found in this class", 404));
    }

    // Find teacher in subject
    const teacherIndex = subject.teachers.findIndex(
      (t) => t.teacher.toString() === req.params.teacherId
    );

    if (teacherIndex === -1) {
      return next(new ErrorResponse("Teacher not found for this subject", 404));
    }

    subject.teachers.splice(teacherIndex, 1);
    await classObj.save();

    res.status(200).json({
      success: true,
      data: classObj,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Add student to class
// @route   POST /api/classes/:id/students
// @access  Private/Admin
exports.addStudentToClass = async (req, res, next) => {
  try {
    const classObj = await Class.findById(req.params.id);
    if (!classObj) {
      return next(new ErrorResponse(`Class not found with id of ${req.params.id}`, 404));
    }

    // Check if student exists and is actually a student
    const student = await User.findById(req.body.student);
    if (!student || student.role !== 'student') {
      return next(new ErrorResponse(`Student not found with id of ${req.body.student}`, 404));
    }

    // Check if student already in class
    const studentExists = classObj.students.some(
      s => s.student.toString() === req.body.student
    );

    if (studentExists) {
      return next(new ErrorResponse('Student already exists in this class', 400));
    }

    classObj.students.push({
      student: req.body.student,
      status: req.body.status || 'approved',
      enrollmentType: req.body.enrollmentType || 'new',
      enrolledBy: req.user.id
    });

    await classObj.save();

    res.status(200).json({
      success: true,
      data: classObj
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Remove student from class
// @route   DELETE /api/classes/:id/students/:studentId
// @access  Private/Admin
exports.removeStudentFromClass = async (req, res, next) => {
  try {
    const classObj = await Class.findById(req.params.id);
    if (!classObj) {
      return next(new ErrorResponse(`Class not found with id of ${req.params.id}`, 404));
    }

    const studentIndex = classObj.students.findIndex(
      s => s.student.toString() === req.params.studentId
    );

    if (studentIndex === -1) {
      return next(new ErrorResponse('Student not found in this class', 404));
    }

    // Also remove from prefects if they are one
    classObj.prefects = classObj.prefects.filter(
      p => p.student.toString() !== req.params.studentId
    );

    classObj.students.splice(studentIndex, 1);
    await classObj.save();

    res.status(200).json({
      success: true,
      data: classObj
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Assign prefect to class
// @route   POST /api/classes/:id/prefects
// @access  Private/Admin
exports.assignPrefect = async (req, res, next) => {
  try {
    const classObj = await Class.findById(req.params.id);
    if (!classObj) {
      return next(new ErrorResponse(`Class not found with id of ${req.params.id}`, 404));
    }

    // Verify student exists in this class
    const studentInClass = classObj.students.some(
      s => s.student.toString() === req.body.student && s.status === 'approved'
    );

    if (!studentInClass) {
      return next(new ErrorResponse('Student not found in this class or not approved', 404));
    }

    // Check if position already assigned
    const positionExists = classObj.prefects.some(
      p => p.position === req.body.position
    );

    if (positionExists) {
      return next(new ErrorResponse('This prefect position is already assigned', 400));
    }

    classObj.prefects.push({
      position: req.body.position,
      student: req.body.student,
      assignedAt: Date.now(),
      assignedBy: req.user.id
    });

    await classObj.save();

    res.status(200).json({
      success: true,
      data: classObj
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Remove prefect from class
// @route   DELETE /api/classes/:id/prefects/:prefectId
// @access  Private/Admin
exports.removePrefect = async (req, res, next) => {
  try {
    const classObj = await Class.findById(req.params.id);
    if (!classObj) {
      return next(new ErrorResponse(`Class not found with id of ${req.params.id}`, 404));
    }

    const prefectIndex = classObj.prefects.findIndex(
      p => p._id.toString() === req.params.prefectId
    );

    if (prefectIndex === -1) {
      return next(new ErrorResponse('Prefect assignment not found', 404));
    }

    classObj.prefects.splice(prefectIndex, 1);
    await classObj.save();

    res.status(200).json({
      success: true,
      data: classObj
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get my classes (for teachers and students)
// @route   GET /api/classes/my-classes
// @access  Private
exports.getMyClasses = async (req, res, next) => {
  try {
    let classes;

    if (req.user.role === "teacher") {
      classes = await Class.find({
        "subjects.teachers.teacher": req.user.id,
        "subjects.teachers.status": "approved",
      })
        .populate("subjects.subject")
        .populate("students.student", "firstName lastName");
    } else if (req.user.role === "student") {
      classes = await Class.find({
        "students.student": req.user.id,
        "students.status": "approved",
      })
        .populate("subjects.subject")
        .populate("subjects.teachers.teacher", "firstName lastName");
    } else {
      return next(
        new ErrorResponse("Admins do not have assigned classes", 400)
      );
    }

    res.status(200).json({
      success: true,
      count: classes.length,
      data: classes,
    });
  } catch (err) {
    next(err);
  }
};
