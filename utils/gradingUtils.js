const ErrorResponse = require("./errorResponse");

/**
 * Calculate grade based on marks and total marks
 * @param {number} marks - Marks obtained
 * @param {number} totalMarks - Total possible marks
 * @returns {string} - Grade (A, B, C, D, F)
 */
const calculateGrade = (marks, totalMarks) => {
  if (marks < 0 || totalMarks <= 0) {
    throw new ErrorResponse("Invalid marks or total marks", 400);
  }

  const percentage = (marks / totalMarks) * 100;

  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  return "F";
};

/**
 * Calculate grade points based on grade
 * @param {string} grade - Grade (A, B, C, D, F)
 * @returns {number} - Grade points
 */
const calculateGradePoints = (grade) => {
  const gradePoints = {
    A: 5,
    B: 4,
    C: 3,
    D: 2,
    F: 0,
  };

  return gradePoints[grade] || 0;
};

/**
 * Calculate weighted grade based on multiple assessments
 * @param {Array} assessments - Array of assessment objects with marks and weight
 * @returns {Object} - Final grade and percentage
 */
const calculateWeightedGrade = (assessments) => {
  if (!Array.isArray(assessments) || assessments.length === 0) {
    throw new ErrorResponse("Invalid assessments data", 400);
  }

  let totalWeight = 0;
  let weightedMarks = 0;

  assessments.forEach((assessment) => {
    if (!assessment.marks || !assessment.totalMarks || !assessment.weight) {
      throw new ErrorResponse("Invalid assessment data", 400);
    }

    const percentage = (assessment.marks / assessment.totalMarks) * 100;
    weightedMarks += percentage * assessment.weight;
    totalWeight += assessment.weight;
  });

  if (totalWeight === 0) {
    throw new ErrorResponse("Total weight cannot be zero", 400);
  }

  const finalPercentage = weightedMarks / totalWeight;
  const finalGrade = calculateGrade(finalPercentage, 100);

  return {
    grade: finalGrade,
    percentage: finalPercentage,
    gradePoints: calculateGradePoints(finalGrade),
  };
};

/**
 * Generate grading report for a submission
 * @param {Object} submission - Submission object
 * @param {Object} assignment - Assignment object
 * @returns {Object} - Grading report
 */
const generateGradingReport = (submission, assignment) => {
  const { marksAwarded, feedback, rubrics, gradedBy, gradedAt, status } =
    submission;

  const grade = calculateGrade(marksAwarded, assignment.totalMarks);
  const gradePoints = calculateGradePoints(grade);

  return {
    submissionId: submission._id,
    assignmentId: assignment._id,
    studentId: submission.student,
    marksAwarded,
    totalMarks: assignment.totalMarks,
    percentage: (marksAwarded / assignment.totalMarks) * 100,
    grade,
    gradePoints,
    feedback,
    rubrics,
    gradedBy,
    gradedAt,
    status,
  };
};

/**
 * Validate grading criteria
 * @param {Object} criteria - Grading criteria object
 * @returns {boolean} - True if valid, false otherwise
 */
const validateGradingCriteria = (criteria) => {
  if (!criteria || typeof criteria !== "object") return false;

  const requiredFields = ["description", "marks", "weight"];
  return requiredFields.every((field) => criteria.hasOwnProperty(field));
};

/**
 * Calculate average grade for multiple submissions
 * @param {Array} submissions - Array of submission objects
 * @returns {Object} - Average grade statistics
 */
const calculateAverageGrade = (submissions) => {
  if (!Array.isArray(submissions) || submissions.length === 0) {
    throw new ErrorResponse("Invalid submissions data", 400);
  }

  const grades = submissions.map((submission) => {
    const grade = calculateGrade(
      submission.marksAwarded,
      submission.assignment.totalMarks
    );
    return calculateGradePoints(grade);
  });

  const average = grades.reduce((a, b) => a + b, 0) / grades.length;

  return {
    average,
    highest: Math.max(...grades),
    lowest: Math.min(...grades),
    count: grades.length,
  };
};

module.exports = {
  calculateGrade,
  calculateGradePoints,
  calculateWeightedGrade,
  generateGradingReport,
  validateGradingCriteria,
  calculateAverageGrade,
};
