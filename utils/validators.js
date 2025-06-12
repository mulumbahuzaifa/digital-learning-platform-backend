const mongoose = require("mongoose");
const ErrorResponse = require("./errorResponse");

/**
 * Validates if a string is a valid MongoDB ObjectId
 * @param {string} id - The ID to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const validateObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Validates if a string is a valid email address
 * @param {string} email - The email to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

/**
 * Validates if a string is a valid phone number (Ugandan format)
 * @param {string} phone - The phone number to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const validatePhone = (phone) => {
  const re = /^(\+256|0)[0-9]{9}$/;
  return re.test(phone);
};

/**
 * Validates if a string is a valid date
 * @param {string} date - The date to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const validateDate = (date) => {
  const d = new Date(date);
  return d instanceof Date && !isNaN(d);
};

/**
 * Validates if a string is a valid academic year (format: YYYY-YYYY)
 * @param {string} year - The academic year to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const validateAcademicYear = (year) => {
  const re = /^\d{4}-\d{4}$/;
  if (!re.test(year)) return false;

  const [start, end] = year.split("-").map(Number);
  return end === start + 1;
};

/**
 * Validates if a string is a valid term (Term 1, Term 2, Term 3)
 * @param {string} term - The term to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const validateTerm = (term) => {
  return ["Term 1", "Term 2", "Term 3"].includes(term);
};

/**
 * Validates if a number is within a specified range
 * @param {number} value - The value to validate
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {boolean} - True if valid, false otherwise
 */
const validateRange = (value, min, max) => {
  return value >= min && value <= max;
};

/**
 * Validates if a string matches a specific pattern
 * @param {string} value - The value to validate
 * @param {RegExp} pattern - The pattern to match against
 * @returns {boolean} - True if valid, false otherwise
 */
const validatePattern = (value, pattern) => {
  return pattern.test(value);
};

/**
 * Validates if a string is not empty and has a minimum length
 * @param {string} value - The value to validate
 * @param {number} minLength - Minimum required length
 * @returns {boolean} - True if valid, false otherwise
 */
const validateString = (value, minLength = 1) => {
  return typeof value === "string" && value.trim().length >= minLength;
};

/**
 * Validates if an array has a minimum number of items
 * @param {Array} array - The array to validate
 * @param {number} minItems - Minimum required items
 * @returns {boolean} - True if valid, false otherwise
 */
const validateArray = (array, minItems = 1) => {
  return Array.isArray(array) && array.length >= minItems;
};

/**
 * Validates if an object has all required fields
 * @param {Object} obj - The object to validate
 * @param {Array} requiredFields - Array of required field names
 * @returns {boolean} - True if valid, false otherwise
 */
const validateObject = (obj, requiredFields) => {
  if (typeof obj !== "object" || obj === null) return false;
  return requiredFields.every((field) => obj.hasOwnProperty(field));
};

/**
 * Validates if a file has an allowed extension
 * @param {string} filename - The filename to validate
 * @param {Array} allowedExtensions - Array of allowed extensions
 * @returns {boolean} - True if valid, false otherwise
 */
const validateFileExtension = (filename, allowedExtensions) => {
  const ext = filename.split(".").pop().toLowerCase();
  return allowedExtensions.includes(ext);
};

/**
 * Validates if a file size is within limits
 * @param {number} size - File size in bytes
 * @param {number} maxSize - Maximum allowed size in bytes
 * @returns {boolean} - True if valid, false otherwise
 */
const validateFileSize = (size, maxSize) => {
  return size <= maxSize;
};

module.exports = {
  validateObjectId,
  validateEmail,
  validatePhone,
  validateDate,
  validateAcademicYear,
  validateTerm,
  validateRange,
  validatePattern,
  validateString,
  validateArray,
  validateObject,
  validateFileExtension,
  validateFileSize,
};
