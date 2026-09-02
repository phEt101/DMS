import type { AuthenticatedUser } from "../features/auth/services/auth.service.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionId?: number;
    }
  }
}

export {};
