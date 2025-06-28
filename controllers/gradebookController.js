const Gradebook = require('../models/Gradebook');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const AcademicEnrollment = require('../models/AcademicEnrollment');

// @desc    Get all gradebook entries
// @route   GET /api/gradebook
// @access  Private
exports.getGradebooks = asyncHandler(async (req, res, next) => {
  const { class: classId, subject, student, academicYear, term, isPublished } = req.query;
  
  let query = {};

  // Apply filters
  if (classId) query.class = classId;
  if (subject) query.subject = subject;
  if (student) query.student = student;
  if (academicYear) query.academicYear = academicYear;
  if (term) query.term = term;
  if (isPublished) query.isPublished = isPublished === 'true';

  // Role-based filtering
  if (req.user.role === 'student') {
    query.student = req.user.id;
  } else if (req.user.role === 'teacher') {
    const classes = await Class.find({
      'subjects.teachers.teacher': req.user.id,
      'subjects.teachers.status': 'approved'
    });
    query.$or = [
      { class: { $in: classes.map(c => c._id) } },
      { teacher: req.user.id }
    ];
  }

  const gradebooks = await Gradebook.find(query)
    .populate('student', '_id firstName lastName')
    .populate('class', '_id name code')
    .populate('subject', '_id name code')
    .populate('teacher', '_id firstName lastName')
    .sort('academicYear term');

  res.status(200).json({
    success: true,
    count: gradebooks.length,
    data: gradebooks
  });
});

// @desc    Get single gradebook entry
// @route   GET /api/gradebook/:id
// @access  Private
exports.getGradebook = asyncHandler(async (req, res, next) => {
  const gradebook = await Gradebook.findById(req.params.id)
    .populate('student', 'firstName lastName')
    .populate('class', 'name code')
    .populate('subject', 'name code')
    .populate('teacher', 'firstName lastName');

  if (!gradebook) {
    return next(new ErrorResponse(`Gradebook entry not found with id of ${req.params.id}`, 404));
  }

  if (!hasGradebookAccess(req.user, gradebook)) {
    return next(new ErrorResponse('Not authorized to access this gradebook entry', 403));
  }

  res.status(200).json({
    success: true,
    data: gradebook
  });
});

// @desc    Create gradebook entry
// @route   POST /api/gradebook
// @access  Private/Teacher or Admin
exports.createGradebook = asyncHandler(async (req, res, next) => {
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return next(new ErrorResponse('Only teachers and admins can create gradebook entries', 403));
  }

  const { student, class: classId, subject, academicYear, term } = req.body;

  // Validate student
  const studentUser = await User.findById(student);
  if (!studentUser || studentUser.role !== 'student') {
    return next(new ErrorResponse(`Student not found with id of ${student}`, 404));
  }

  // Validate class
  const classObj = await Class.findById(classId);
  if (!classObj) {
    return next(new ErrorResponse(`Class not found with id of ${classId}`, 404));
  }
 console.log(req.body);
  // Validate subject
  const subjectObj = await Subject.findById(subject);
  if (!subjectObj) {
    return next(new ErrorResponse(`Subject not found with id of ${subject}`, 404));
  }

  // Check student enrollment
      const isEnrolled = await AcademicEnrollment.find({
        student: student,
        status: "active",
      });
  if (!isEnrolled) {
    return next(new ErrorResponse('Student is not enrolled in this class', 400));
  }

  // Check teacher assignment (skip for admin)
  if (req.user.role === 'teacher') {
    const isAssigned = classObj.subjects.some(
      s => s.subject.toString() === subject &&
           s.teachers.some(t => t.teacher.toString() === req.user.id && t.status === 'approved')
    );
    if (!isAssigned) {
      return next(new ErrorResponse('You are not assigned to teach this subject', 403));
    }
  }

  // Check for existing entry
  const exists = await Gradebook.findOne({
    student,
    class: classId,
    subject,
    academicYear,
    term
  });
  if (exists) {
    return next(new ErrorResponse('Gradebook entry already exists for this student/subject/term/year', 400));
  }

  // Create gradebook
  const gradebook = await Gradebook.create({
    ...req.body,
    teacher: req.body.teacher || req.user.id // Allow admin to specify a teacher or use themselves
  });

  res.status(201).json({
    success: true,
    data: gradebook
  });
});

// @desc    Update gradebook entry
// @route   PUT /api/gradebook/:id
// @access  Private/Teacher or Admin
exports.updateGradebook = asyncHandler(async (req, res, next) => {
  let gradebook = await Gradebook.findById(req.params.id);

  if (!gradebook) {
    return next(new ErrorResponse(`Gradebook entry not found with id of ${req.params.id}`, 404));
  }

  if (!canModifyGradebook(req.user, gradebook)) {
    return next(new ErrorResponse('Not authorized to update this gradebook entry', 403));
  }

  // Prevent changing certain fields
  const { student, class: classId, subject, teacher, academicYear, term, ...updateData } = req.body;

  // Recalculate totals if marks are updated
  if (req.body.assignments || req.body.tests || req.body.exams) {
    updateData.totalMarks = calculateTotalMarks(req.body);
    updateData.finalGrade = calculateGrade(updateData.totalMarks);
  }

  gradebook = await Gradebook.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: gradebook
  });
});

// @desc    Publish gradebook entry
// @route   PUT /api/gradebook/:id/publish
// @access  Private/Teacher or Admin
exports.publishGradebook = asyncHandler(async (req, res, next) => {
  let gradebook = await Gradebook.findById(req.params.id);

  if (!gradebook) {
    return next(new ErrorResponse(`Gradebook entry not found with id of ${req.params.id}`, 404));
  }

  if (!canModifyGradebook(req.user, gradebook)) {
    return next(new ErrorResponse('Not authorized to publish this gradebook entry', 403));
  }

  // Calculate totals if not set
  if (!gradebook.totalMarks) {
    gradebook.totalMarks = calculateTotalMarks(gradebook);
    gradebook.finalGrade = calculateGrade(gradebook.totalMarks);
  }

  gradebook.isPublished = true;
  gradebook.publishedAt = Date.now();
  await gradebook.save();

  res.status(200).json({
    success: true,
    data: gradebook
  });
});

// @desc    Delete gradebook entry
// @route   DELETE /api/gradebook/:id
// @access  Private/Teacher or Admin
exports.deleteGradebook = asyncHandler(async (req, res, next) => {
  const gradebook = await Gradebook.findById(req.params.id);

  if (!gradebook) {
    return next(new ErrorResponse(`Gradebook entry not found with id of ${req.params.id}`, 404));
  }

  if (!canModifyGradebook(req.user, gradebook)) {
    return next(new ErrorResponse('Not authorized to delete this gradebook entry', 403));
  }

  await gradebook.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// Helper Functions

function hasGradebookAccess(user, gradebook) {
  if (user.role === 'admin') return true;
  if (gradebook.student._id.toString() === user.id) return true;
  if (gradebook.teacher._id.toString() === user.id) return true;
  return false;
}

function canModifyGradebook(user, gradebook) {
  if (user.role === 'admin') return true;
  if (gradebook.teacher._id.toString() === user.id) return true;
  return false;
}

function calculateTotalMarks(gradebook) {
  let total = 0;
  let totalWeight = 0;

  // Calculate assignments
  if (gradebook.assignments && gradebook.assignments.length > 0) {
    gradebook.assignments.forEach(assignment => {
      if (assignment.marks && assignment.weight) {
        total += (assignment.marks * assignment.weight) / 100;
        totalWeight += assignment.weight;
      }
    });
  }

  // Calculate tests
  if (gradebook.tests && gradebook.tests.length > 0) {
    gradebook.tests.forEach(test => {
      if (test.marks && test.weight) {
        total += (test.marks * test.weight) / 100;
        totalWeight += test.weight;
      }
    });
  }

  // Calculate exams
  if (gradebook.exams && gradebook.exams.length > 0) {
    gradebook.exams.forEach(exam => {
      if (exam.marks && exam.weight) {
        total += (exam.marks * exam.weight) / 100;
        totalWeight += exam.weight;
      }
    });
  }

  // Normalize if weights don't sum to 100
  if (totalWeight > 0 && totalWeight !== 100) {
    total = (total * 100) / totalWeight;
  }

  return parseFloat(total.toFixed(2));
}

function calculateGrade(totalMarks) {
  if (totalMarks >= 90) return 'A';
  if (totalMarks >= 80) return 'B';
  if (totalMarks >= 70) return 'C';
  if (totalMarks >= 60) return 'D';
  return 'F';
}