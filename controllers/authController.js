const jwt = require('jsonwebtoken');
const User = require('../models/User');
const sendEmail = require('../utils/emailService');
const crypto = require('crypto');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role
    });

    // Generate verification token
    const verificationToken = user.getVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Send verification email
    const verificationUrl = `${req.protocol}://${req.get('host')}/api/auth/verify-email/${verificationToken}`;
    
    const message = `Please verify your email by clicking on this link: \n\n ${verificationUrl}`;
    
    try {
      await sendEmail({
        email: user.email,
        subject: 'Email Verification',
        message
      });

      res.status(200).json({ 
        success: true, 
        message: 'Verification email sent'
      });
    } catch (err) {
      user.emailVerificationToken = undefined;
      user.emailVerificationExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return next(new ErrorResponse('Email could not be sent', 500));
    }
  } catch (err) {
    next(err);
  }
};

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
exports.verifyEmail = async (req, res, next) => {
  try {
    const verificationToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      emailVerificationToken: verificationToken,
      emailVerificationExpire: { $gt: Date.now() }
    });

    if (!user) {
      return next(new ErrorResponse('Invalid or expired token', 400));
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      data: {
        id: user._id,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Email verification error:', err);
    next(new ErrorResponse('Email verification failed', 500));
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password, remember } = req.body;

    // Validate email & password
    if (!email || !password) {
      return next(new ErrorResponse('Please provide email and password', 400));
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Check if email is verified
    if (!user.isVerified) {
      return next(new ErrorResponse('Please verify your email first', 401));
    }

     // Create token
     const token = user.getSignedJwtToken(
        remember ? process.env.JWT_COOKIE_EXPIRE : process.env.JWT_COOKIE_EXPIRE_REMEMBER
     );

     // Prepare user data to return (excluding sensitive info)
     const userData = {
       _id: user._id,
       firstName: user.firstName,
       lastName: user.lastName,
       email: user.email,
       role: user.role,
       isVerified: user.isVerified,
       profile: user.profile,
       createdAt: user.createdAt
     };
 
     res.status(200).json({
       success: true,
       token,
       user: userData
     });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('profile.currentClass')
      .populate('classRequests.class');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Validate email format
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address'
      });
    }

    const user = await User.findOne({ email });

    // Return same response whether user exists or not (security best practice)
    const response = {
      success: true,
      message: 'If an account exists with this email, a password reset link will be sent',
      data: {
        email: email, // Return the email for frontend reference
        timestamp: new Date().toISOString()
      }
    };

    if (!user) {
      // Log the attempt (but don't reveal user doesn't exist to client)
      console.log(`Password reset attempt for non-existent email: ${email}`);
      return res.status(200).json(response);
    }

    // Generate reset token
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Create frontend reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    // Enhanced email template
    const emailTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2d3748;">Password Reset Request</h2>
        <p>Hello ${user.firstName},</p>
        <p>We received a request to reset your password for ${process.env.APP_NAME}.</p>
        
        <div style="margin: 25px 0; text-align: center;">
          <a href="${resetUrl}" 
             style="background-color: #4299e1; color: white; 
                    padding: 12px 24px; text-decoration: none; 
                    border-radius: 4px; font-weight: bold;
                    display: inline-block;">
            Reset Password
          </a>
        </div>
        
        <p style="color: #718096; font-size: 0.9em;">
          This link will expire in ${process.env.RESET_TOKEN_EXPIRE / 60 / 60} hours.
        </p>
        
        <p>If you didn't request this, please ignore this email or contact support.</p>
        
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        
        <p style="font-size: 0.8em; color: #718096;">
          © ${new Date().getFullYear()} ${process.env.APP_NAME}
        </p>
      </div>
    `;

    try {
      const emailResponse = await sendEmail({
        email: user.email,
        subject: `Password Reset - ${process.env.APP_NAME}`,
        html: emailTemplate,
        contentType: 'text/html'
      });

      // Add email sending info to response
      response.data.emailSent = true;
      response.data.emailServiceResponse = emailResponse.messageId;

      res.status(200).json(response);
    } catch (err) {
      console.error('Email send error:', err);
      
      // Reset token if email failed
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        error: 'Failed to send password reset email. Please try again later.'
      });
    }
  } catch (err) {
    console.error('Forgot password error:', err);
    next(err);
  }
};

// @desc    Reset password
// @route   POST /api/auth/resetpassword
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    // Validate inputs
    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Please provide token, new password, and confirmation'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Passwords do not match'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters'
      });
    }

    // Hash token and find user
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired token. Please request a new password reset.'
      });
    }

    // Set new password
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Send confirmation email
    try {
      const confirmationTemplate = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2d3748;">Password Updated</h2>
          <p>Hello ${user.firstName},</p>
          <p>Your password for ${process.env.APP_NAME} was successfully changed.</p>
          <p>If you didn't make this change, please contact our support team immediately.</p>
          
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          
          <p style="font-size: 0.8em; color: #718096;">
            © ${new Date().getFullYear()} ${process.env.APP_NAME}
          </p>
        </div>
      `;

      await sendEmail({
        email: user.email,
        subject: `Password Updated - ${process.env.APP_NAME}`,
        html: confirmationTemplate,
        contentType: 'text/html'
      });
    } catch (emailErr) {
      console.error('Failed to send confirmation email:', emailErr);
      // Continue even if confirmation email fails
    }

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.',
      data: {
        userId: user._id,
        email: user.email,
        timestamp: new Date().toISOString()
      }
    });

  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({
      success: false,
      error: 'An error occurred while resetting your password. Please try again.'
    });
  }
};
