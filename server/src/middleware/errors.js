export function notFound(req, res) {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` })
}

export function errorHandler(error, _req, res, _next) {
  const status = error.status ?? 500
  if (status >= 500) console.error(error)
  res.status(status).json({
    message: status >= 500 ? 'Internal server error' : error.message,
  })
}

export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}
