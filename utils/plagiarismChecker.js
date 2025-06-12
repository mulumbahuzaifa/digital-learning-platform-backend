const axios = require("axios");
const ErrorResponse = require("./errorResponse");
const config = require("../config/config");

/**
 * Check text for plagiarism using external API
 * @param {string} text - Text to check for plagiarism
 * @returns {Promise<Object>} - Plagiarism check results
 */
const checkPlagiarism = async (text) => {
  try {
    if (!text || typeof text !== "string") {
      throw new ErrorResponse("Invalid text input", 400);
    }

    // If no API key is configured, return a mock response
    if (!config.plagiarismApiKey) {
      return {
        score: 0,
        report: "Plagiarism checking is not configured",
        details: [],
      };
    }

    // Make API request to plagiarism detection service
    const response = await axios.post(
      config.plagiarismApiEndpoint,
      {
        text,
        language: "en",
        sensitivity: "high",
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.plagiarismApiKey}`,
        },
      }
    );

    // Process and format the response
    const result = {
      score: response.data.similarityScore || 0,
      report: generatePlagiarismReport(response.data),
      details: response.data.matches || [],
    };

    return result;
  } catch (error) {
    console.error("Plagiarism check error:", error);
    throw new ErrorResponse(
      "Error checking plagiarism",
      error.response?.status || 500
    );
  }
};

/**
 * Generate a human-readable plagiarism report
 * @param {Object} data - Raw plagiarism check data
 * @returns {string} - Formatted report
 */
const generatePlagiarismReport = (data) => {
  if (!data || !data.matches) {
    return "No plagiarism detected";
  }

  const matches = data.matches.map((match) => ({
    source: match.source || "Unknown source",
    similarity: match.similarity || 0,
    text: match.text || "",
  }));

  let report = `Plagiarism Score: ${data.similarityScore || 0}%\n\n`;
  report += "Matched Sources:\n";

  matches.forEach((match, index) => {
    report += `\n${index + 1}. Source: ${match.source}\n`;
    report += `   Similarity: ${match.similarity}%\n`;
    report += `   Matched Text: "${match.text.substring(0, 100)}..."\n`;
  });

  return report;
};

/**
 * Check multiple submissions for plagiarism
 * @param {Array} submissions - Array of submission objects
 * @returns {Promise<Array>} - Array of plagiarism check results
 */
const checkMultipleSubmissions = async (submissions) => {
  if (!Array.isArray(submissions)) {
    throw new ErrorResponse("Invalid submissions data", 400);
  }

  const results = await Promise.all(
    submissions.map(async (submission) => {
      const result = await checkPlagiarism(submission.textSubmission);
      return {
        submissionId: submission._id,
        studentId: submission.student,
        ...result,
      };
    })
  );

  return results;
};

/**
 * Compare two texts for similarity
 * @param {string} text1 - First text
 * @param {string} text2 - Second text
 * @returns {Promise<Object>} - Similarity results
 */
const compareTexts = async (text1, text2) => {
  try {
    if (!text1 || !text2) {
      throw new ErrorResponse("Both texts are required", 400);
    }

    // If no API key is configured, return a mock response
    if (!config.plagiarismApiKey) {
      return {
        similarity: 0,
        report: "Text comparison is not configured",
      };
    }

    const response = await axios.post(
      `${config.plagiarismApiEndpoint}/compare`,
      {
        text1,
        text2,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.plagiarismApiKey}`,
        },
      }
    );

    return {
      similarity: response.data.similarity || 0,
      report: `Similarity between texts: ${response.data.similarity || 0}%`,
    };
  } catch (error) {
    console.error("Text comparison error:", error);
    throw new ErrorResponse(
      "Error comparing texts",
      error.response?.status || 500
    );
  }
};

module.exports = {
  checkPlagiarism,
  checkMultipleSubmissions,
  compareTexts,
};
