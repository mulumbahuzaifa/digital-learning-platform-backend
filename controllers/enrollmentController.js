const Class = require('../models/Class');
const User = require('../models/User');
const EnrollmentRequest = require('../models/EnrollmentRequest');
const Subject = require('../models/Subject');

// @desc    Student requests to join a class
// @route   POST /api/enroll/student/:classId
// @access  Private/Student
exports.studentRequestToJoinClass = async (req, res, next) => {
  try {
    const { classId } = req.params;
    
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can use this endpoint'
      });
    }
    
    // Check if already in a class
    if (req.user.profile.currentClass) {
      return res.status(400).json({
        success: false,
        message: 'You are already enrolled in a class'
      });
    }
    
    const classObj = await Class.findById(classId);
    if (!classObj) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }
    
    // Check if already has pending request
    const existingRequest = await EnrollmentRequest.findOne({
      user: req.user.id,
      class: classId,
      status: 'pending'
    });
    
    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending request for this class'
      });
    }
    
    // Create enrollment request
    const enrollmentRequest = await EnrollmentRequest.create({
      user: req.user.id,
      class: classId,
      role: 'student',
      status: 'pending'
    });
    
    // Add to user's classRequests
    req.user.classRequests.push({
      class: classId,
      status: 'pending',
      roleInClass: 'student'
    });
    await req.user.save();
    
    // Add to class's students (pending)
    classObj.students.push({
      student: req.user.id,
      status: 'pending'
    });
    await classObj.save();
    
    res.status(201).json({
      success: true,
      message: 'Enrollment request submitted. Waiting for admin approval.',
      data: enrollmentRequest
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Teacher requests to teach a subject in class
// @route   POST /api/enroll/teacher/:classId/:subjectId
// @access  Private/Teacher
exports.teacherRequestToTeach = async (req, res, next) => {
  try {
    const { classId, subjectId } = req.params;
    
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can use this endpoint'
      });
    }
    
    const [classObj, subject] = await Promise.all([
      Class.findById(classId),
      Subject.findById(subjectId)
    ]);
    
    if (!classObj || !subject) {
      return res.status(404).json({
        success: false,
        message: 'Class or subject not found'
      });
    }
    
    // Check if teacher is qualified to teach this subject
    const isQualified = req.user.profile.qualifications.some(q => 
      q.subject.toString() === subjectId
    );
    
    if (!isQualified) {
      return res.status(403).json({
        success: false,
        message: 'You are not qualified to teach this subject'
      });
    }
    
    // Check if already teaching this subject in this class
    const subjectInClass = classObj.subjects.find(s => 
      s.subject.toString() === subjectId
    );
    
    if (subjectInClass) {
      const alreadyTeaching = subjectInClass.teachers.some(t => 
        t.teacher.toString() === req.user.id
      );
      
      if (alreadyTeaching) {
        return res.status(400).json({
          success: false,
          message: 'You are already assigned to teach this subject in this class'
        });
      }
    }
    
    // Create enrollment request
    const enrollmentRequest = await EnrollmentRequest.create({
      user: req.user.id,
      class: classId,
      subject: subjectId,
      role: 'teacher',
      status: 'pending'
    });
    
    // Add to user's classRequests
    req.user.classRequests.push({
      class: classId,
      subject: subjectId,
      status: 'pending',
      roleInClass: 'teacher'
    });
    await req.user.save();
    
    // Add to class's subjects teachers (pending)
    const subjectIndex = classObj.subjects.findIndex(s => 
      s.subject.toString() === subjectId
    );
    
    if (subjectIndex !== -1) {
      classObj.subjects[subjectIndex].teachers.push({
        teacher: req.user.id,
        status: 'pending'
      });
      await classObj.save();
    } else {
      // If subject not in class, add it first
      classObj.subjects.push({
        subject: subjectId,
        teachers: [{
          teacher: req.user.id,
          status: 'pending'
        }]
      });
      await classObj.save();
    }
    
    res.status(201).json({
      success: true,
      message: 'Teaching request submitted. Waiting for admin approval.',
      data: enrollmentRequest
    });
  } catch (err) {
    next(err);
  }
};