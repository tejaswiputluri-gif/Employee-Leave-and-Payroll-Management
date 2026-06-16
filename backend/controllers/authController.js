import bcrypt from "bcryptjs";
import { appConfig } from "../config/env.js";
import { getDemoCredentials } from "../models/repository.js";
import {
  completePasswordReset,
  getLoginAccount,
  issueAccessToken,
  issueRefreshToken,
  listSignupApprovers,
  recordLoginFailure,
  recordLoginSuccess,
  refreshSession,
  requestPasswordReset,
  registerAccount,
  revokeSession,
  sendOtpEmail,
} from "../models/authRepository.js";

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const account = await getLoginAccount(email);

    if (!account) {
      await recordLoginFailure({ email, id: null }, "Account not found");
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (account.locked_until && new Date(account.locked_until).getTime() > Date.now()) {
      return res.status(423).json({
        success: false,
        message: "Account locked for 30 minutes due to failed login attempts",
      });
    }

    const isValid = await bcrypt.compare(password, account.password_hash);

    if (!isValid) {
      const authState = await recordLoginFailure(account, "Invalid password");
      if (authState.lockedUntil) {
        return res.status(423).json({
          success: false,
          message: "Account locked for 30 minutes due to failed login attempts",
        });
      }

      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const refreshToken = issueRefreshToken(account);
    const accessToken = issueAccessToken(account);
    await recordLoginSuccess(account, refreshToken);

    res.json({
      success: true,
      token: accessToken,
      accessToken,
      refreshToken,
      sessionExpiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      user: {
        id: account.id,
        employee_id: account.employee_id,
        full_name: account.full_name,
        email: account.email,
        role: account.role,
        department: account.department,
        designation: account.designation,
        monthly_salary: Number(account.monthly_salary),
        join_date: account.join_date,
        status: account.status,
        manager_id: Number(account.manager_id || 0),
        leave_balance: account.leave_balance || null,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    const account = await refreshSession(refreshToken);

    if (!account) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is invalid or expired",
      });
    }

    const accessToken = issueAccessToken(account);
    const nextRefreshToken = refreshToken;

    res.json({
      success: true,
      accessToken,
      refreshToken: nextRefreshToken,
      sessionExpiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    await revokeSession(req.user);
    res.json({ success: true, message: "Signed out successfully" });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const request = await requestPasswordReset(email);
    if (!request) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    const delivery = await sendOtpEmail(request.account.email, request.otp);
    res.json({
      success: true,
      message: delivery.sent
        ? "OTP sent to the registered email"
        : "OTP generated. SMTP is not configured, so a preview was returned.",
      previewOtp: delivery.sent ? undefined : request.otp,
      expiresAt: request.expiresAt,
    });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP, and new password are required",
      });
    }

    const result = await completePasswordReset(email, otp, newPassword);
    if (!result.ok) {
      return res.status(400).json({ success: false, message: result.message });
    }

    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
}

export async function signup(req, res, next) {
  try {
    const result = await registerAccount(req.body);
    if (!result.ok) {
      return res.status(400).json({ success: false, message: result.message });
    }

    res.status(201).json({
      success: true,
      message: "Account created successfully. Please sign in.",
      account: {
        email: result.account.email,
        full_name: result.account.full_name,
        role: result.account.role,
      },
    });
  } catch (error) {
    next(error);
  }
}

export function me(req, res) {
  res.json({
    success: true,
    user: req.user,
  });
}

export function demoCredentials(_req, res) {
  res.json({
    success: true,
    credentials: getDemoCredentials(),
  });
}

export async function signupApprovers(_req, res, next) {
  try {
    const approvers = await listSignupApprovers();
    res.json({ success: true, approvers });
  } catch (error) {
    next(error);
  }
}
