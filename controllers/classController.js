const Class = require("../models/Class");
const Subject = require("../models/Subject");
const User = require("../models/User");
const AcademicEnrollment = require("../models/AcademicEnrollment");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get all classes
// @route   GET /api/classes
// @access  Private
exports.getClasses = async (req, res, next) => {
  try {
    const { level, stream, subject } = req.query;
    let query = {};

    if (level) query.level = level;
    if (stream) query.stream = stream;
    if (subject) query["subjects.subject"] = subject;

    const classes = await Class.find(query)
      .populate("subjects.subject", "name code")
      .populate("subjects.teachers.teacher", "firstName lastName")
      .populate({
        path: "classTeacher",
        select: "firstName lastName email",
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
      .populate("classTeacher", "firstName lastName");

    if (!classObj) {
      return next(
        new ErrorResponse(`Class not found with id of ${req.params.id}`, 404)
      );
    }

    // Get current academic year and term enrollments
    const currentEnrollments = await AcademicEnrollment.find({
      class: req.params.id,
      status: "active",
    })
    .populate("class", "name code level stream")
      .populate("student", "firstName lastName email")
      .populate("subjects.subject", "name code");

    const response = {
      ...classObj.toObject(),
      currentEnrollments,
    };

    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create class
// @route   POST /api/classes
// @access  Private/Admin or Teacher
exports.createClass = async (req, res, next) => {
  try {
    const { name, level, stream, description } = req.body;

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

    // Create class with subjects
    const newClass = await Class.create({
      name,
      level,
      code: `CL-${this.level}-${this.stream}`, // Auto-generated code
      stream,
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
// @access  Private/Admin or Teacher
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

    await classObj.deleteOne();

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
// @access  Private/Admin or Teacher
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

// @desc    Get my classes (for teachers and students)
// @route   GET /api/classes/my-classes
// @access  Private
exports.getMyClasses = async (req, res, next) => {
  try {
    let classes;

    if (req.user.role === "teacher") {
      // Teacher case - get classes where teacher is assigned to subjects
      classes = await Class.find({
        "subjects.teachers": {
          $elemMatch: {
            teacher: req.user._id,
            status: "approved",
          },
        },
      })
        .populate({
          path: "subjects.subject",
          select:
            "name code category isActive subCategory description syllabus",
        })

        .populate({
          path: "subjects.teachers.teacher",
          select: "firstName lastName",
          match: { _id: req.user._id },
        });

      // Get current academic year enrollments for these classes
      const enrollments = await AcademicEnrollment.find({
        class: { $in: classes.map((c) => c._id) },
        status: "active",
      }) 
        .populate("student", "firstName lastName email")
        .populate("subjects.subject", "name code category isActive subCategory description syllabus");

      // Transform data for cleaner response
      const transformedClasses = classes.map((classObj) => {
        // Get enrollments for this specific class
        const classEnrollments = enrollments.filter(
          (e) => e.class.toString() === classObj._id.toString()
        );

        return {
          class: {
            _id: classObj._id,
            name: classObj.name,
            code: classObj.code,
            level: classObj.level,
            stream: classObj.stream,
          },
          subjects: classObj.subjects
            .filter((subject) =>
              subject.teachers.some(
                (t) => t.teacher && t.teacher._id.equals(req.user._id)
              )
            )
            .map((subject) => ({
              _id: subject.subject._id,
              name: subject.subject.name,
              code: subject.subject.code,
              category: subject.subject.category,
              subCategory: subject.subject.subCategory,
              isActive: subject.subject.isActive,
            })),
          enrolledStudents: classEnrollments.map((enrollment) => ({
            student: {
              _id: enrollment.student._id,
              firstName: enrollment.student.firstName,
              lastName: enrollment.student.lastName,
              email: enrollment.student.email,
            },
            enrollmentDetails: {
              academicYear: enrollment.academicYear,
              term: enrollment.term,
              status: enrollment.status,
              enrollmentDate: enrollment.enrollmentDate,
              subjects: enrollment.subjects.map((s) => ({
                subject: s.subject,
                status: s.status,
                enrollmentDate: s.enrollmentDate,
                completionDate: s.completionDate,
              })),
            },
          })),
        };
      });

      return res.status(200).json({
        success: true,
        role: "teacher",
        count: transformedClasses.length,
        data: transformedClasses,
      });
    } else if (req.user.role === "student") {
      // Student case - get current enrollments
      const enrollments = await AcademicEnrollment.find({
        student: req.user._id,
        status: "active",
      })
        .populate({
          path: "class",
          select: "name code level stream isActive subjects",
           populate: [{
            // Populate subject details
            path: "subjects.subject",
            select: "name code category isActive subCategory description syllabus teachers"
          }, {
            // Populate teacher details
            path: "subjects.teachers.teacher",
            select: "firstName lastName email"
          }]
        })
      .populate({
        path: "subjects.subject",
        select: "name code category isActive subCategory description syllabus teachers"
      });

      const transformedClasses = enrollments.map((enrollment) => {
        // Get subjects with their teachers from the class
        const activeSubjects = enrollment.subjects
          .filter((s) => s.status === "enrolled")
          .map((s) => {
            // Find matching subject in class.subjects to get teachers
            const classSubject = enrollment.class.subjects.find(
              (cs) => cs.subject._id.toString() === s.subject._id.toString()
            );
            if (!classSubject) {
              console.warn(
                `Subject ${s.subject._id} not found in class ${enrollment.class._id}`
              );
              return null; // Skip if subject not found in class
            }
            // Ensure classSubject is defined before accessing teachers
            if (!classSubject.teachers || !Array.isArray(classSubject.teachers)) {
              console.warn(
                `No teachers found for subject ${s.subject._id} in class ${enrollment.class._id}`
              );
              return null; // Skip if no teachers
            }

          // Map teachers if available
            const teachers = classSubject?.teachers
              ?.filter(t => t.teacher) // Filter out any null teacher references
              .map(t => ({
                teacher:{
                  _id: t.teacher._id,
                  firstName: t.teacher.firstName,
                  lastName: t.teacher.lastName,
                  email: t.teacher.email
                },
                isLeadTeacher: t.isLeadTeacher || false,
                status: t.status || 'approved'
              })) || [];
              console.log("Teachers for Subject:", teachers);
            return {
              _id: s.subject._id,
              name: s.subject.name,
              code: s.subject.code,
              category: s.subject.category,
              subCategory: s.subject.subCategory,
              isActive: s.subject.isActive,
              description: s.subject.description,
              syllabus: s.subject.syllabus,
              enrollmentStatus: s.status,
              teachers: teachers 
            };
          }) .filter(subject => subject !== null); // Remove any null entries
          console.log("Active Subjects for Class:", activeSubjects);
        return {
          _id: enrollment.class._id,
          name: enrollment.class.name,
          code: enrollment.class.code,
          level: enrollment.class.level,
          stream: enrollment.class.stream,
          isActive: enrollment.class.isActive,
          enrollmentInfo: {
            _id: enrollment._id,
            academicYear: enrollment.academicYear,
            term: enrollment.term,
            enrollmentDate: enrollment.enrollmentDate,
            status: enrollment.status,
          },
          subjects: activeSubjects,
        };
      });
      console.log("Transformed Classes for Student:", transformedClasses);

      return res.status(200).json({
        success: true,
        role: "student",
        count: transformedClasses.length,
        data: transformedClasses,
      });
    } else {
      return next(
        new ErrorResponse(
          "This endpoint is only for teachers and students",
          403
        )
      );
    }
  } catch (err) {
    console.error("Error fetching classes:", err);
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
      return next(
        new ErrorResponse(`Class not found with id of ${req.params.id}`, 404)
      );
    }

    // Verify student exists in this class
    const studentInClass = classObj.students.some(
      (s) =>
        s.student.toString() === req.body.student && s.status === "approved"
    );

    if (!studentInClass) {
      return next(
        new ErrorResponse(
          "Student not found in this class or not approved",
          404
        )
      );
    }

    // Check if position already assigned
    const positionExists = classObj.prefects.some(
      (p) => p.position === req.body.position
    );

    if (positionExists) {
      return next(
        new ErrorResponse("This prefect position is already assigned", 400)
      );
    }

    classObj.prefects.push({
      position: req.body.position,
      student: req.body.student,
      assignedAt: Date.now(),
      assignedBy: req.user.id,
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

// @desc    Remove prefect from class
// @route   DELETE /api/classes/:id/prefects/:prefectId
// @access  Private/Admin
exports.removePrefect = async (req, res, next) => {
  try {
    const classObj = await Class.findById(req.params.id);
    if (!classObj) {
      return next(
        new ErrorResponse(`Class not found with id of ${req.params.id}`, 404)
      );
    }

    const prefectIndex = classObj.prefects.findIndex(
      (p) => p._id.toString() === req.params.prefectId
    );

    if (prefectIndex === -1) {
      return next(new ErrorResponse("Prefect assignment not found", 404));
    }

    classObj.prefects.splice(prefectIndex, 1);
    await classObj.save();

    res.status(200).json({
      success: true,
      data: classObj,
    });
  } catch (err) {
    next(err);
  }
};
