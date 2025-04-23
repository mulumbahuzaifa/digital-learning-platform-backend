const Class = require("../models/Class");
const Subject = require("../models/Subject");
const ErrorResponse = require("../utils/errorResponse");

// @desc    Get all subjects
// @route   GET /api/subjects
// @access  Public
exports.getSubjects = async (req, res, next) => {
  try {
    let query = {};

    // Filter by category if provided
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Filter by subCategory if provided
    if (req.query.subCategory) {
      query.subCategory = req.query.subCategory;
    }

    const subjects = await Subject.find(query).sort("name");

    res.status(200).json({
      success: true,
      count: subjects.length,
      data: subjects,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single subject
// @route   GET /api/subjects/:id
// @access  Public
exports.getSubject = async (req, res, next) => {
    try {
      const subject = await Subject.findById(req.params.id);
  
      if (!subject) {
        return next(
          new ErrorResponse(`Subject not found with id of ${req.params.id}`, 404)
        );
      }
  
      res.status(200).json({
        success: true,
        data: subject
      });
    } catch (err) {
      next(err);
    }
  };
  
  // @desc    Create subject
  // @route   POST /api/subjects
  // @access  Private/Admin
  exports.createSubject = async (req, res, next) => {
    try {
       // Check if subject with same code exists
      const existingSubject = await Subject.findOne({
        code: req.body.code
      });
  
      if (existingSubject) {
        return next(
          new ErrorResponse('Subject with this code already exists', 400)
        );
      }
  
      const subject = await Subject.create(req.body);
  
      res.status(201).json({
        success: true,
        data: subject
      });
    } catch (err) {
      console.log(err);
      
      next(err);
    }
  };
  
  // @desc    Update subject
  // @route   PUT /api/subjects/:id
  // @access  Private/Admin
  exports.updateSubject = async (req, res, next) => {
    try {
      let subject = await Subject.findById(req.params.id);
  
      if (!subject) {
        return next(
          new ErrorResponse(`Subject not found with id of ${req.params.id}`, 404)
        );
      }
  
      // Check if new name or code conflicts with existing subjects
      if (req.body.name || req.body.code) {
        const existingSubject = await Subject.findOne({
          $and: [
            { _id: { $ne: req.params.id } },
            { $or: [{ name: req.body.name }, { code: req.body.code }] }
          ]
        });
  
        if (existingSubject) {
          return next(
            new ErrorResponse('Another subject with this name or code already exists', 400)
          );
        }
      }
  
      subject = await Subject.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
      });
  
      res.status(200).json({
        success: true,
        data: subject
      });
    } catch (err) {
      next(err);
    }
  };
  
  // @desc    Delete subject
  // @route   DELETE /api/subjects/:id
  // @access  Private/Admin
  exports.deleteSubject = async (req, res, next) => {
    try {
      const subject = await Subject.findById(req.params.id);
  
      if (!subject) {
        return next(
          new ErrorResponse(`Subject not found with id of ${req.params.id}`, 404)
        );
      }
  
      await subject.remove();
  
      res.status(200).json({
        success: true,
        data: {}
      });
    } catch (err) {
      next(err);
    }
  };
  
  // @desc    Get classes for a subject
  // @route   GET /api/subjects/:id/classes
  // @access  Private
  exports.getSubjectClasses = async (req, res, next) => {
    try {
      const classes = await Class.find({ 'subjects.subject': req.params.id })
        .populate('subjects.subject')
        .populate('subjects.teachers.teacher', 'firstName lastName');
  
      res.status(200).json({
        success: true,
        count: classes.length,
        data: classes
      });
    } catch (err) {
      next(err);
    }
  };
