import type { ErrorRequestHandler, RequestHandler } from 'express'

export class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
    this.name = 'HttpError'
  }
}

export function httpError(status: number, message: string) {
  return new HttpError(status, message)
}

export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` })
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  const status = error instanceof HttpError ? error.status : 500
  if (status >= 500) console.error(error)
  res.status(status).json({
    message: status >= 500 ? 'Internal server error' : (error as Error).message,
  })
}

export function asyncHandler(handler: RequestHandler): RequestHandler {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
}
