const Content = require("../models/Content");
const Class = require("../models/Class");
const Subject = require("../models/Subject");
const AcademicEnrollment = require("../models/AcademicEnrollment");
const ErrorResponse = require("../utils/errorResponse");
const asyncHandler = require("../middleware/async");
const fileUpload = require("../utils/fileUpload");
const fs = require("fs");
const path = require("path");

// @desc    Get all content with advanced filtering
// @route   GET /api/content
// @access  Private
exports.getContent = asyncHandler(async (req, res, next) => {
  const {
    class: classId,
    subject,
    type,
    isPublic,
    accessLevel,
    search,
    sort = "-createdAt",
    page = 1,
    limit = 10,
  } = req.query;

  // Build query
  let query = {};

  // Apply filters
  if (classId) query.class = classId;
  if (subject) query.subject = subject;
  if (type) query.type = type;
  if (isPublic) query.isPublic = isPublic === "true";
  if (accessLevel) query.accessLevel = accessLevel;

  // Search functionality
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { tags: { $regex: search, $options: "i" } },
    ];
  }
  console.log(req.user);

  // Add access control for non-admins
  if (req.user.role !== "admin") {
    query.$or = [
      { accessLevel: "public" },
      { accessLevel: "school" },
      {
        accessLevel: "class",
        class: { $in: await getUsersClasses(req.user.id) },
      },
      { uploadedBy: req.user.id },
    ];
  }

  // Execute query with pagination
  const skip = (page - 1) * limit;
  const content = await Content.find(query)
    .populate({
      path: "class",
      select: "name code level stream",
    })
    .populate({
      path: "subject",
      select: "name code description",
    })
    .populate({
      path: "uploadedBy",
      select: "firstName lastName email avatar",
    })
    .select(
      "title description type fileUrl thumbnail fileSize fileType tags isPublic accessLevel downloads views createdAt"
    )
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count for pagination
  const total = await Content.countDocuments(query);

  res.status(200).json({
    success: true,
    count: content.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page),
    data: content,
  });
});

// @desc    Get single content with access control
// @route   GET /api/content/:id
// @access  Private
exports.getSingleContent = asyncHandler(async (req, res, next) => {
  const content = await Content.findById(req.params.id)
    .populate({
      path: "class",
      select: "name code level stream description",
    })
    .populate({
      path: "subject",
      select: "name code description",
    })
    .populate({
      path: "uploadedBy",
      select: "firstName lastName email avatar role",
    });

  if (!content) {
    return next(
      new ErrorResponse(`Content not found with id of ${req.params.id}`, 404)
    );
  }

  // Ensure required fields exist
  if (!content.class || !content.subject) {
    return next(
      new ErrorResponse(
        "Content is missing required class or subject information",
        400
      )
    );
  }

  // Check access permissions
  if (!(await hasAccess(content, req.user))) {
    return next(
      new ErrorResponse("Not authorized to access this content", 403)
    );
  }

  // Increment view count
  content.views += 1;
  await content.save();

  res.status(200).json({
    success: true,
    data: content,
  });
});

// @desc    Create content with validation
// @route   POST /api/content
// @access  Private/Teacher,Admin
exports.createContent = asyncHandler(async (req, res, next) => {
  // Validate required fields
  const { title, type, class: classId, subject: subjectId } = req.body;
  if (!title || !type || !classId || !subjectId) {
    return next(
      new ErrorResponse("Please provide title, type, class, and subject", 400)
    );
  }

  // Validate content type
  const validTypes = [
    "note",
    "assignment",
    "slide",
    "video",
    "audio",
    "document",
    "link",
    "quiz",
  ];
  if (!validTypes.includes(type)) {
    return next(
      new ErrorResponse(
        `Invalid content type. Must be one of: ${validTypes.join(", ")}`,
        400
      )
    );
  }

  // Verify class exists
  const classObj = await Class.findById(classId);
  if (!classObj) {
    return next(
      new ErrorResponse(`Class not found with id of ${classId}`, 404)
    );
  }

  // Verify subject exists and is assigned to class
  const subject = await Subject.findById(subjectId);
  if (!subject) {
    return next(
      new ErrorResponse(`Subject not found with id of ${subjectId}`, 404)
    );
  }

  // Check if subject is assigned to class
  const isSubjectInClass = classObj.subjects.some(
    (sub) => sub.subject.toString() === subjectId
  );
  if (!isSubjectInClass) {
    return next(
      new ErrorResponse(
        "This subject is not assigned to the selected class",
        400
      )
    );
  }

  // Check teacher authorization
  if (req.user.role === "teacher") {
    const isAssigned = classObj.subjects.some(
      (sub) =>
        sub.subject.toString() === subjectId &&
        sub.teachers.some(
          (t) => t.teacher.toString() === req.user.id.toString()
        )
    );

    if (!isAssigned) {
      return next(
        new ErrorResponse("Not authorized to add content for this subject", 403)
      );
    }
  }

  // Handle file upload
  let fileData = {};
  if (req.file) {
    try {
      // Validate file size (10MB limit)
      if (req.file.size > 10 * 1024 * 1024) {
        return next(new ErrorResponse("File size cannot exceed 10MB", 400));
      }

      // Validate file type
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png",
        "video/mp4",
        "audio/mpeg",
      ];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return next(
          new ErrorResponse(
            "Invalid file type. Allowed types: PDF, DOC, DOCX, JPEG, PNG, MP4, MP3",
            400
          )
        );
      }

      fileData = await fileUpload.uploadFile(req.file);
    } catch (err) {
      return next(new ErrorResponse("File upload failed", 500));
    }
  } else if (type !== "link") {
    return next(
      new ErrorResponse("File is required for this content type", 400)
    );
  }

  // Create content
  const content = await Content.create({
    ...req.body,
    fileUrl: fileData.url,
    fileSize: fileData.size,
    fileType: fileData.mimetype,
    uploadedBy: req.user.id,
    downloads: 0,
    views: 0,
  });

  // Populate the response
  const populatedContent = await Content.findById(content._id)
    .populate("class", "name code")
    .populate("subject", "name code")
    .populate("uploadedBy", "firstName lastName");

  res.status(201).json({
    success: true,
    data: populatedContent,
  });
});

// @desc    Update content with validation
// @route   PUT /api/content/:id
// @access  Private/Owner,Admin
exports.updateContent = asyncHandler(async (req, res, next) => {
  let content = await Content.findById(req.params.id);

  if (!content) {
    return next(
      new ErrorResponse(`Content not found with id of ${req.params.id}`, 404)
    );
  }

  // Check ownership
  if (
    content.uploadedBy.toString() !== req.user.id &&
    req.user.role !== "admin"
  ) {
    return next(
      new ErrorResponse("Not authorized to update this content", 403)
    );
  }

  // Handle file update
  let fileData = {};
  if (req.file) {
    try {
      // Validate file size (10MB limit)
      if (req.file.size > 10 * 1024 * 1024) {
        return next(new ErrorResponse("File size cannot exceed 10MB", 400));
      }

      // Validate file type
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/jpeg",
        "image/png",
        "video/mp4",
        "audio/mpeg",
      ];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return next(
          new ErrorResponse(
            "Invalid file type. Allowed types: PDF, DOC, DOCX, JPEG, PNG, MP4, MP3",
            400
          )
        );
      }

      // Delete old file if exists
      if (content.fileUrl) {
        await fileUpload.deleteFile(content.fileUrl);
      }

      fileData = await fileUpload.uploadFile(req.file);
      req.body.fileUrl = fileData.url;
      req.body.fileSize = fileData.size;
      req.body.fileType = fileData.mimetype;
    } catch (err) {
      return next(new ErrorResponse("File upload failed", 500));
    }
  }

  // Update content
  content = await Content.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  })
    .populate("class", "name code level stream")
    .populate("subject", "name code description")
    .populate("uploadedBy", "firstName lastName email role profile.avatar");

  res.status(200).json({
    success: true,
    data: content,
  });
});

// @desc    Delete content with cleanup
// @route   DELETE /api/content/:id
// @access  Private/Owner,Admin
exports.deleteContent = asyncHandler(async (req, res, next) => {
  const content = await Content.findById(req.params.id);

  if (!content) {
    return next(
      new ErrorResponse(`Content not found with id of ${req.params.id}`, 404)
    );
  }

  // Check ownership
  if (
    content.uploadedBy.toString() !== req.user.id &&
    req.user.role !== "admin"
  ) {
    return next(
      new ErrorResponse("Not authorized to delete this content", 403)
    );
  }

  // Delete associated file
  if (content.fileUrl) {
    try {
      await fileUpload.deleteFile(content.fileUrl);
    } catch (err) {
      console.error("Error deleting file:", err);
      // Continue with content deletion even if file deletion fails
    }
  }

  await content.deleteOne();

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Download content with access control
// @route   GET /api/content/:id/download
// @access  Private
exports.downloadContent = asyncHandler(async (req, res, next) => {
  const content = await Content.findById(req.params.id);

  if (!content) {
    return next(
      new ErrorResponse(`Content not found with id of ${req.params.id}`, 404)
    );
  }

  // Check access permissions
  if (!(await hasAccess(content, req.user))) {
    return next(
      new ErrorResponse("Not authorized to download this content", 403)
    );
  }

  // Increment download count
  content.downloads += 1;
  await content.save();

  // For local files
  if (content.fileUrl.startsWith("/uploads/")) {
    const filePath = path.join(__dirname, "../public", content.fileUrl);
    if (fs.existsSync(filePath)) {
      return res.download(
        filePath,
        content.title + path.extname(content.fileUrl)
      );
    }
    return next(new ErrorResponse("File not found", 404));
  }

  // For external URLs
  res.redirect(content.fileUrl);
});

// @desc    Get my content with role-based filtering
// @route   GET /api/content/my-content
// @access  Private
exports.getMyContent = asyncHandler(async (req, res, next) => {
  let query = {};

  // Role-based content filtering
  if (req.user.role === "teacher") {
    // Get classes where teacher is assigned to subjects
    const teacherClasses = await Class.find({
      "subjects.teachers": {
        $elemMatch: {
          teacher: req.user._id,
          status: "approved",
        },
      },
    });

    if (!teacherClasses || teacherClasses.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        message: "No classes found for this teacher",
      });
    }

    const classIds = teacherClasses.map((c) => c._id);
    const subjectIds = teacherClasses.flatMap((c) =>
      c.subjects
        .filter((s) =>
          s.teachers.some(
            (t) =>
              t.teacher.toString() === req.user._id.toString() &&
              t.status === "approved"
          )
        )
        .map((s) => s.subject)
    );

    query.$or = [
      { uploadedBy: req.user._id },
      {
        class: { $in: classIds },
        subject: { $in: subjectIds },
      },
    ];
  } else if (req.user.role === "student") {
    // Get classes where student is enrolled
    const studentClasses = await Class.find({
      "students.student": req.user._id,
      "students.status": "approved",
    });

    if (!studentClasses || studentClasses.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        message: "No classes found for this student",
      });
    }

    const classIds = studentClasses.map((c) => c._id);
    query.class = { $in: classIds };
  } else if (req.user.role === "admin") {
    // Admins can see all content
    query = {};
  } else {
    return next(new ErrorResponse("Not authorized to access content", 403));
  }

  // Apply additional filters
  const {
    type,
    isPublic,
    accessLevel,
    search,
    sort = "-createdAt",
    page = 1,
    limit = 10,
  } = req.query;

  // Apply filters
  if (type) {
    const validTypes = [
      "note",
      "assignment",
      "slide",
      "video",
      "audio",
      "document",
      "link",
      "quiz",
    ];
    if (!validTypes.includes(type)) {
      return next(
        new ErrorResponse(
          `Invalid content type. Must be one of: ${validTypes.join(", ")}`,
          400
        )
      );
    }
    query.type = type;
  }

  if (isPublic) query.isPublic = isPublic === "true";
  if (accessLevel) {
    const validLevels = ["class", "school", "public"];
    if (!validLevels.includes(accessLevel)) {
      return next(
        new ErrorResponse(
          `Invalid access level. Must be one of: ${validLevels.join(", ")}`,
          400
        )
      );
    }
    query.accessLevel = accessLevel;
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { tags: { $regex: search, $options: "i" } },
    ];
  }

  // Execute query with pagination
  const skip = (page - 1) * limit;
  const content = await Content.find(query)
    .populate({
      path: "class",
      select: "name code level stream",
    })
    .populate({
      path: "subject",
      select: "name code description",
    })
    .populate({
      path: "uploadedBy",
      select: "firstName lastName email profile.avatar role isActive",
    })
    .select(
      "title description type fileUrl thumbnail fileSize fileType tags isPublic accessLevel downloads views createdAt"
    )
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count for pagination
  const total = await Content.countDocuments(query);

  res.status(200).json({
    success: true,
    count: content.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: parseInt(page),
    data: content,
  });
});

// Helper function to check content access
const hasAccess = async (content, user) => {
  try {
    // Validate input parameters
    if (!content || !user) {
      console.error("Invalid parameters in hasAccess:", { content, user });
      return false;
    }

    // Admins have access to everything
    if (user.role === "admin") return true;

    // Content owner has access
    if (
      content.uploadedBy &&
      content.uploadedBy.toString() === user._id.toString()
    )
      return true;

    // Public content is accessible to all
    if (content.accessLevel === "public") return true;

    // School-level content is accessible to all school members
    if (content.accessLevel === "school") return true;

    // Class-level content
    if (content.accessLevel === "class") {
      // Validate required fields
      if (!content.class || !content.subject) {
        console.error("Content missing required fields:", {
          class: content.class,
          subject: content.subject,
        });
        return false;
      }

      const classObj = await Class.findById(content.class);
      if (!classObj) {
        console.error("Class not found:", content.class);
        return false;
      }

      // For teachers - check if they teach this subject in this class
      if (user.role === "teacher") {
        // Ensure subject exists in class
        const subjectInClass = classObj.subjects?.find(
          (s) =>
            s.subject && s.subject.toString() === content.subject.toString()
        );

        if (!subjectInClass) {
          console.error("Subject not found in class:", {
            subjectId: content.subject,
            classSubjects: classObj.subjects,
          });
          return false;
        }

        return (
          subjectInClass.teachers?.some(
            (t) =>
              t.teacher &&
              t.teacher.toString() === user._id.toString() &&
              t.status === "approved"
          ) || false
        );
      }

      // For students - check if they're enrolled in this class
      if (user.role === "student") {
        // Check for active enrollment in the class
        const enrollment = await AcademicEnrollment.findOne({
          student: user._id,
          class: content.class,
          status: "active",
          "subjects.subject": content.subject,
          "subjects.status": "enrolled",
        });

        return !!enrollment;
      }
    }

    return false;
  } catch (error) {
    console.error("Error in hasAccess:", error);
    return false;
  }
};

// Helper function to get user's classes
const getUsersClasses = async (userId) => {
  try {
    // For teachers - get classes where they teach
    const teacherClasses = await Class.find({
      "subjects.teachers": {
        $elemMatch: {
          teacher: userId,
          status: "approved",
        },
      },
    });

    // For students - get classes where they are enrolled
    const studentEnrollments = await AcademicEnrollment.find({
      student: userId,
      status: "active",
    });

    // Combine and return unique class IDs
    const classIds = new Set([
      ...teacherClasses.map((c) => c._id),
      ...studentEnrollments.map((e) => e.class),
    ]);

    return Array.from(classIds);
  } catch (error) {
    console.error("Error in getUsersClasses:", error);
    return [];
  }
};
