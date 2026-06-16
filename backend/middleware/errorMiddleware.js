export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(error, _req, res, _next) {
  console.error(error);
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Something went wrong",
  });
}
