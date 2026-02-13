const logger = require('../utils/logger');
const ApiResponse = require('../utils/response');

function errorHandler(err, req, res, next) {
  logger.error('API Error:', err);

  if (err.name === 'ValidationError') {
    return ApiResponse.error(res, 'Validation Error', err.errors, 400);
  }

  if (err.name === 'UnauthorizedError') {
    return ApiResponse.error(res, 'Unauthorized', null, 401);
  }

  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(e => ({ field: e.path, message: e.message }));
    return ApiResponse.error(res, 'Database Validation Error', errors, 400);
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return ApiResponse.error(res, 'Duplicate entry', null, 409);
  }

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal Server Error'
    : err.message;

  return ApiResponse.error(res, message, null, statusCode);
}

function notFoundHandler(req, res) {
  return ApiResponse.error(res, 'Route not found', null, 404);
}

module.exports = {
  errorHandler,
  notFoundHandler
};
