class ApiResponse {
  static success(res, data, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data
    });
  }

  static error(res, message, errors = null, statusCode = 400) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors
    });
  }

  static paginated(res, data, page, limit, total) {
    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  }
}

module.exports = ApiResponse;
