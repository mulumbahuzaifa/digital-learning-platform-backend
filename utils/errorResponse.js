class ErrorResponse extends Error {
    constructor(message, statusCode) {
      super(message);
      this.statusCode = statusCode;
  
      // Maintains proper stack trace for where our error was thrown (only available on V8)
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, ErrorResponse);
      }
  
      this.name = this.constructor.name;
    }
  
    // Custom method to serialize errors for API responses
    toJSON() {
      return {
        success: false,
        error: this.message,
        statusCode: this.statusCode,
        stack: process.env.NODE_ENV === 'development' ? this.stack : undefined
      };
    }
  }
  
  module.exports = ErrorResponse;