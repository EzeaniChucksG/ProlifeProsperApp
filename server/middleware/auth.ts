/**
 * Authentication Middleware
 * Centralized authentication logic for all routes
 */
import { Request, Response, NextFunction } from "express";
import { authService, AuthUser } from "../auth/auth-service";

/**
 * Authenticate JWT token from request headers
 * Adds authenticated user to req.user
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const user = await authService.getCurrentUser(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  req.user = user;
  next();
};

/**
 * Authenticate JWT token but don't fail if missing
 * Adds user to req.user if token is valid, otherwise req.user is undefined
 */
export const authenticateTokenOptional = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getCurrentUser(req.headers.authorization);
    req.user = user || undefined; // Will be undefined if no valid token
    next();
  } catch (error) {
    req.user = undefined;
    next();
  }
};