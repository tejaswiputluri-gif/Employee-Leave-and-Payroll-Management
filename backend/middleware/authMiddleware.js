import jwt from "jsonwebtoken";
import { appConfig } from "../config/env.js";
import { getUserProfile } from "../models/repository.js";

export async function protect(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authorization token is required",
    });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, appConfig.jwtSecret);

    if (decoded.tokenType && decoded.tokenType !== "access") {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please log in again.",
      });
    }

    const user = await getUserProfile(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Session expired. Please log in again.",
    });
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to access this resource",
      });
    }

    next();
  };
}
