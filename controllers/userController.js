const User = require("../models/User");
const Class = require("../models/Class");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require('../middleware/async');
const sendEmail = require('../utils/emailService');
const fileUpload = require('../utils/fileUpload');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = asyncHandler(async (req, res, next) => {
  // Filtering, sorting, pagination
  const { role, isActive, search } = req.query;
  let query = {};
  
  if (role) query.role = role;
  if (isActive) query.isActive = isActive === 'true';
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const users = await User.find(query)
    .select('-password -resetPasswordToken -resetPasswordExpire')
    .sort('-createdAt');

  res.status(200).json({ 
    success: true, 
    count: users.length, 
    data: users 
  });
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id)
    .select('-password -resetPasswordToken -resetPasswordExpire');

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Create user (Admin only)
// @route   POST /api/users
// @access  Private/Admin
exports.createUser = asyncHandler(async (req, res, next) => {
  // Check if user exists
  const existingUser = await User.findOne({ email: req.body.email });
  if (existingUser) {
    return next(
      new ErrorResponse(`User with email ${req.body.email} already exists`, 400)
    );
  }

  const userData = { ...req.body };

  // Handle qualification documents for teachers
  if (userData.role === 'teacher' && req.files && req.files.length > 0 && req.body.newQualification) {
    try {
      const newQualification = JSON.parse(req.body.newQualification);
      
      // Process uploaded files
      const documentFiles = req.files.map(file => ({
        name: file.originalname,
        url: `/uploads/qualifications/${file.filename}`,
        fileType: file.mimetype,
        uploadedAt: Date.now(),
        description: req.body.documentDescription || 'Qualification document'
      }));
      
      // Add documents to the qualification
      newQualification.documents = documentFiles;
      
      // Initialize profile and qualifications if they don't exist
      if (!userData.profile) userData.profile = {};
      if (!userData.profile.qualifications) userData.profile.qualifications = [];
      
      // Add the qualification to the user data
      userData.profile.qualifications.push(newQualification);
    } catch (error) {
      return next(new ErrorResponse(`Invalid qualification data: ${error.message}`, 400));
    }
  }

  // Create user
  const user = await User.create(userData);

  // Send verification email if not admin-created
  if (!req.user) {
    const verificationToken = user.getVerificationToken();
    await user.save({ validateBeforeSave: false });

    const verificationUrl = `${req.protocol}://${req.get('host')}/api/auth/verifyemail/${verificationToken}`;
    const message = `You are receiving this email because you were registered on our platform. Please verify your email by clicking: \n\n ${verificationUrl}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Email Verification',
        message
      });
    } catch (err) {
      console.error(err);
      user.emailVerificationToken = undefined;
      user.emailVerificationExpire = undefined;
      await user.save({ validateBeforeSave: false });
    }
  }

  res.status(201).json({
    success: true,
    data: user
  });
});
  
// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin or Owner
exports.updateUser = asyncHandler(async (req, res, next) => {
  let user = await User.findById(req.params.id);

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if user is admin or owner
  if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
    return next(
      new ErrorResponse(`Not authorized to update this user`, 401)
    );
  }

  // Prevent role change for non-admins
  if (req.user.role !== 'admin' && req.body.role) {
    return next(
      new ErrorResponse(`Only admins can change user roles`, 401)
    );
  }

  const userData = { ...req.body };

  // Handle qualification documents for teachers
  if (user.role === 'teacher' && req.files && req.files.length > 0) {
    // Handle adding documents to existing qualification
    if (req.body.qualificationIndex) {
      const qualificationIndex = parseInt(req.body.qualificationIndex);
      
      // Ensure the qualification exists
      if (!user.profile.qualifications[qualificationIndex]) {
        return next(new ErrorResponse(`Qualification not found at index ${qualificationIndex}`, 404));
      }
      
      // Process uploaded files
      const documentFiles = req.files.map(file => ({
        name: file.originalname,
        url: `/uploads/qualifications/${file.filename}`,
        fileType: file.mimetype,
        uploadedAt: Date.now(),
        description: req.body.documentDescription || 'Qualification document'
      }));
      
      // Add documents to the specific qualification
      if (!user.profile.qualifications[qualificationIndex].documents) {
        user.profile.qualifications[qualificationIndex].documents = [];
      }
      
      user.profile.qualifications[qualificationIndex].documents.push(...documentFiles);
      
      // Save user with updated qualifications
      await user.save();
      
      return res.status(200).json({
        success: true,
        data: user
      });
    }
    
    // Handle adding a new qualification with documents
    if (req.body.newQualification) {
      try {
        const newQualification = JSON.parse(req.body.newQualification);
        
        // Process uploaded files for the new qualification
        const documentFiles = req.files.map(file => ({
          name: file.originalname,
          url: `/uploads/qualifications/${file.filename}`,
          fileType: file.mimetype,
          uploadedAt: Date.now(),
          description: req.body.documentDescription || 'Qualification document'
        }));
        
        // Add documents to the new qualification
        newQualification.documents = documentFiles;
        
        // Add the new qualification to the user's profile
        if (!user.profile) user.profile = {};
        if (!user.profile.qualifications) user.profile.qualifications = [];
        
        user.profile.qualifications.push(newQualification);
        
        // Save user with updated qualifications
        await user.save();
        
        return res.status(200).json({
          success: true,
          data: user
        });
      } catch (error) {
        return next(new ErrorResponse(`Invalid qualification data: ${error.message}`, 400));
      }
    }
  }

  // Update user with standard fields
  user = await User.findByIdAndUpdate(req.params.id, userData, {
    new: true,
    runValidators: true
  }).select('-password');

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
    );
  }

  await user.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Update user profile
// @route   PUT /api/users/profile/:id
// @access  Private/Owner or Admin
exports.updateProfile = asyncHandler(async (req, res, next) => {
  let user = await User.findById(req.params.id);

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if user is admin or owner
  if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
    return next(
      new ErrorResponse(`Not authorized to update this profile`, 401)
    );
  }

  // Handle file uploads if present
  if (req.files && req.files.length > 0) {
    try {
      // Check if we have qualification data
      if (!req.body.newQualification) {
        return next(new ErrorResponse('Qualification data is required when uploading documents', 400));
      }
      
      const newQualification = JSON.parse(req.body.newQualification);
      
      // Process uploaded files for the qualification
      const documentFiles = req.files.map(file => ({
        name: file.originalname,
        url: `/uploads/qualifications/${file.filename}`,
        fileType: file.mimetype,
        uploadedAt: Date.now(),
        description: req.body.documentDescription || 'Qualification document'
      }));
      
      // Add documents to the qualification
      newQualification.documents = documentFiles;
      
      // Add the qualification to the user's profile
      if (!user.profile.qualifications) {
        user.profile.qualifications = [];
      }
      
      user.profile.qualifications.push(newQualification);
    } catch (error) {
      return next(new ErrorResponse(`Invalid qualification data: ${error.message}`, 400));
    }
  } else {
    // Handle profile updates without file uploads
    const profileData = req.body.profile || {};
    
    // Update only the provided profile fields
    if (profileData.bio !== undefined) user.profile.bio = profileData.bio;
    if (profileData.dateOfBirth !== undefined) user.profile.dateOfBirth = profileData.dateOfBirth;
    if (profileData.gender !== undefined) user.profile.gender = profileData.gender;
    if (profileData.phone !== undefined) user.profile.phone = profileData.phone;
    
    // Handle address updates
    if (profileData.address) {
      user.profile.address = user.profile.address || {};
      if (profileData.address.district !== undefined) user.profile.address.district = profileData.address.district;
      if (profileData.address.county !== undefined) user.profile.address.county = profileData.address.county;
      if (profileData.address.subCounty !== undefined) user.profile.address.subCounty = profileData.address.subCounty;
    }
    
    // Handle student-specific fields
    if (user.role === 'student') {
      if (profileData.currentClass !== undefined) user.profile.currentClass = profileData.currentClass;
      if (profileData.year !== undefined) user.profile.year = profileData.year;
      if (profileData.studentId !== undefined) user.profile.studentId = profileData.studentId;
      
      // Handle parentGuardian updates
      if (profileData.parentGuardian) {
        user.profile.parentGuardian = user.profile.parentGuardian || {};
        if (profileData.parentGuardian.name !== undefined) user.profile.parentGuardian.name = profileData.parentGuardian.name;
        if (profileData.parentGuardian.contact !== undefined) user.profile.parentGuardian.contact = profileData.parentGuardian.contact;
        if (profileData.parentGuardian.relationship !== undefined) user.profile.parentGuardian.relationship = profileData.parentGuardian.relationship;
      }
    }
    
    // Handle teacher-specific fields
    if (user.role === 'teacher') {
      if (profileData.teacherId !== undefined) user.profile.teacherId = profileData.teacherId;
      if (profileData.department !== undefined) user.profile.department = profileData.department;
    }
  }
  
  await user.save();

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Get all students
// @route   GET /api/users/students
// @access  Private/Owner or Admin
exports.getStudents = asyncHandler(async (req, res, next) => {
  const { isActive, search } = req.query;
  let query = { role: 'student' };
  
  if (isActive) query.isActive = isActive === 'true';
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const students = await User.find(query)
    .select('-password -resetPasswordToken -resetPasswordExpire')
    .sort('-createdAt');

  res.status(200).json({ 
    success: true, 
    count: students.length, 
    data: students 
  });
});

// @desc    Get all teachers
// @route   GET /api/users/teachers
// @access  Private
exports.getTeachers = asyncHandler(async (req, res, next) => {
  const { isActive, search } = req.query;
  let query = { role: 'teacher' };
  
  if (isActive) query.isActive = isActive === 'true';
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const teachers = await User.find(query)
    .select('-password -resetPasswordToken -resetPasswordExpire')
    .sort('-createdAt');

  res.status(200).json({ 
    success: true, 
    count: teachers.length, 
    data: teachers 
  });
});
// @desc    Handle class enrollment request
// @route   PUT /api/users/enrollment/:userId/:requestId
// @access  Private/Admin
// exports.handleEnrollment = asyncHandler(async (req, res, next) => {
//   const { userId, requestId } = req.params;
//   const { status, reason } = req.body;

//   const user = await User.findById(userId);
//   if (!user) {
//     return next(new ErrorResponse(`User not found with id of ${userId}`, 404));
//   }

//   const request = user.classRequests.id(requestId);
//   if (!request) {
//     return next(new ErrorResponse(`Enrollment request not found`, 404));
//   }

//   // Update request
//   request.status = status;
//   request.processedAt = Date.now();
//   request.processedBy = req.user.id;
//   if (reason) request.reason = reason;

//   await user.save();

//   res.status(200).json({
//     success: true,
//     data: user
//   });
// });