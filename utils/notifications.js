const User = require("../models/User");
const Notification = require("../models/Notification");
const ErrorResponse = require("./errorResponse");
const config = require("../config/config");

/**
 * Send a notification to a user
 * @param {Object} options - Notification options
 * @param {string} options.recipient - Recipient user ID
 * @param {string} options.type - Notification type
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message
 * @param {Object} options.data - Additional data
 * @returns {Promise<Object>} - Created notification
 */
const sendNotification = async (options) => {
  try {
    const { recipient, type, title, message, data } = options;

    // Validate recipient exists
    const user = await User.findById(recipient);
    if (!user) {
      throw new ErrorResponse("Recipient not found", 404);
    }

    // Create notification
    const notification = await Notification.create({
      recipient,
      type,
      title,
      message,
      data,
      status: "unread",
    });

    // Send email notification if enabled
    if (user.emailNotifications && user.email) {
      await sendEmailNotification(user.email, title, message);
    }

    // Send SMS notification if enabled
    if (user.smsNotifications && user.phone) {
      await sendSMSNotification(user.phone, message);
    }

    return notification;
  } catch (error) {
    console.error("Notification error:", error);
    throw new ErrorResponse(
      "Error sending notification",
      error.statusCode || 500
    );
  }
};

/**
 * Send email notification
 * @param {string} email - Recipient email
 * @param {string} subject - Email subject
 * @param {string} message - Email message
 * @returns {Promise<void>}
 */
const sendEmailNotification = async (email, subject, message) => {
  try {
    if (!config.emailService) {
      console.log("Email service not configured");
      return;
    }

    // Implement email sending logic here
    // This is a placeholder for your email service integration
    console.log(`Sending email to ${email}: ${subject}`);
  } catch (error) {
    console.error("Email notification error:", error);
  }
};

/**
 * Send SMS notification
 * @param {string} phone - Recipient phone number
 * @param {string} message - SMS message
 * @returns {Promise<void>}
 */
const sendSMSNotification = async (phone, message) => {
  try {
    if (!config.smsService) {
      console.log("SMS service not configured");
      return;
    }

    // Implement SMS sending logic here
    // This is a placeholder for your SMS service integration
    console.log(`Sending SMS to ${phone}: ${message}`);
  } catch (error) {
    console.error("SMS notification error:", error);
  }
};

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - Updated notification
 */
const markNotificationAsRead = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: notificationId,
        recipient: userId,
      },
      { status: "read" },
      { new: true }
    );

    if (!notification) {
      throw new ErrorResponse("Notification not found", 404);
    }

    return notification;
  } catch (error) {
    throw new ErrorResponse(
      "Error marking notification as read",
      error.statusCode || 500
    );
  }
};

/**
 * Get user's notifications
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - User's notifications
 */
const getUserNotifications = async (userId, options = {}) => {
  try {
    const query = { recipient: userId };

    if (options.status) {
      query.status = options.status;
    }

    if (options.type) {
      query.type = options.type;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(options.limit || 50)
      .skip(options.skip || 0);

    return notifications;
  } catch (error) {
    throw new ErrorResponse(
      "Error getting notifications",
      error.statusCode || 500
    );
  }
};

/**
 * Delete notification
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
const deleteNotification = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: userId,
    });

    if (!notification) {
      throw new ErrorResponse("Notification not found", 404);
    }
  } catch (error) {
    throw new ErrorResponse(
      "Error deleting notification",
      error.statusCode || 500
    );
  }
};

/**
 * Get unread notification count
 * @param {string} userId - User ID
 * @returns {Promise<number>} - Count of unread notifications
 */
const getUnreadCount = async (userId) => {
  try {
    return await Notification.countDocuments({
      recipient: userId,
      status: "unread",
    });
  } catch (error) {
    throw new ErrorResponse(
      "Error getting unread count",
      error.statusCode || 500
    );
  }
};

module.exports = {
  sendNotification,
  markNotificationAsRead,
  getUserNotifications,
  deleteNotification,
  getUnreadCount,
};
