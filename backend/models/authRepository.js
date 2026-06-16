import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { appConfig } from "../config/env.js";
import { getPool } from "../config/db.js";
import { demoStore, persistDemoStore } from "../data/demoData.js";
import { addMinutes, formatEmployeeCode, normalizeEmail } from "./workflowUtils.js";

const ACCESS_TOKEN_EXPIRY = appConfig.jwtExpiresIn || "8h";
const REFRESH_TOKEN_EXPIRY = "7d";
const LOGIN_LOCK_THRESHOLD = 5;
const LOGIN_LOCK_MINUTES = 30;
const OTP_EXPIRY_MINUTES = 10;

function getDemoAuthState(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!demoStore.authState[normalizedEmail]) {
    demoStore.authState[normalizedEmail] = {
      failedLoginAttempts: 0,
      lockedUntil: null,
      refreshTokenHash: null,
      passwordResetOtpHash: null,
      passwordResetOtpExpiresAt: null,
      lastLoginAt: null,
    };
  }

  return demoStore.authState[normalizedEmail];
}

function getDemoUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  return demoStore.users.find((user) => normalizeEmail(user.email) === normalizedEmail) || null;
}

function mapAuthRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    employee_id: row.employee_id,
    email: row.email,
    password_hash: row.password_hash,
    role: row.role,
    full_name: row.full_name,
    department: row.department,
    designation: row.designation,
    monthly_salary: row.monthly_salary,
    join_date: row.join_date,
    status: row.status,
    manager_id: row.manager_id,
    failed_login_attempts: Number(row.failed_login_attempts || 0),
    locked_until: row.locked_until,
    refresh_token_hash: row.refresh_token_hash,
    password_reset_otp_hash: row.password_reset_otp_hash,
    password_reset_otp_expires_at: row.password_reset_otp_expires_at,
    last_login_at: row.last_login_at,
  };
}

function buildTokenPayload(user) {
  return {
    userId: user.id,
    employeeId: user.employee_id,
    role: user.role,
    tokenType: "access",
  };
}

function buildRefreshPayload(user) {
  return {
    userId: user.id,
    employeeId: user.employee_id,
    role: user.role,
    tokenType: "refresh",
  };
}

export function issueAccessToken(user) {
  return jwt.sign(buildTokenPayload(user), appConfig.jwtSecret, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

export function issueRefreshToken(user) {
  return jwt.sign(buildRefreshPayload(user), appConfig.jwtSecret, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

export function getSessionExpiryDate() {
  return addMinutes(new Date(), 8 * 60);
}

export async function getLoginAccount(email) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  if (appConfig.dataMode !== "postgres") {
    const user = getDemoUserByEmail(normalizedEmail);
    if (!user) {
      return null;
    }

    const authState = getDemoAuthState(normalizedEmail);
    return {
      ...user,
      ...authState,
    };
  }

  const pool = getPool();
  const { rows } = await pool.query(
    `
      SELECT
        u.id,
        u.employee_id,
        u.email,
        u.password_hash,
        u.role,
        u.failed_login_attempts,
        u.locked_until,
        u.refresh_token_hash,
        u.password_reset_otp_hash,
        u.password_reset_otp_expires_at,
        u.last_login_at,
        e.full_name,
        e.department,
        e.designation,
        e.monthly_salary,
        e.join_date,
        e.status,
        e.manager_id
      FROM users u
      JOIN employees e ON e.id = u.employee_id
      WHERE LOWER(u.email) = LOWER($1)
    `,
    [normalizedEmail]
  );

  return mapAuthRow(rows[0]);
}

export async function recordAuthEvent({ userId = null, email = null, eventType, success = false, details = "" }) {
  if (appConfig.dataMode !== "postgres") {
    demoStore.auditLogs.unshift({
      id: demoStore.nextIds.auditLog++,
      user_id: userId,
      email,
      event_type: eventType,
      success,
      details,
      created_at: new Date().toISOString(),
    });
    return;
  }

  const pool = getPool();
  await pool.query(
    `
      INSERT INTO auth_audit_logs (user_id, email, event_type, success, details)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [userId, email, eventType, success, details]
  );
}

export async function recordLoginFailure(account, reason = "Invalid credentials") {
  if (appConfig.dataMode !== "postgres") {
    const authState = getDemoAuthState(account.email);
    authState.failedLoginAttempts += 1;
    if (authState.failedLoginAttempts >= LOGIN_LOCK_THRESHOLD) {
      authState.lockedUntil = addMinutes(new Date(), LOGIN_LOCK_MINUTES).toISOString();
    }
    await recordAuthEvent({
      userId: account.id,
      email: account.email,
      eventType: "login_failed",
      success: false,
      details: reason,
    });
    return authState;
  }

  const pool = getPool();
  const shouldLock = Number(account.failed_login_attempts || 0) + 1 >= LOGIN_LOCK_THRESHOLD;
  const lockedUntil = shouldLock ? addMinutes(new Date(), LOGIN_LOCK_MINUTES) : null;

  await pool.query(
    `
      UPDATE users
      SET
        failed_login_attempts = failed_login_attempts + 1,
        locked_until = $2
      WHERE id = $1
    `,
    [account.id, lockedUntil]
  );

  await recordAuthEvent({
    userId: account.id,
    email: account.email,
    eventType: "login_failed",
    success: false,
    details: reason,
  });

  return {
    failedLoginAttempts: Number(account.failed_login_attempts || 0) + 1,
    lockedUntil,
  };
}

export async function recordLoginSuccess(account, refreshToken) {
  if (appConfig.dataMode !== "postgres") {
    const authState = getDemoAuthState(account.email);
    authState.failedLoginAttempts = 0;
    authState.lockedUntil = null;
    authState.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    authState.lastLoginAt = new Date().toISOString();
    await recordAuthEvent({
      userId: account.id,
      email: account.email,
      eventType: "login_success",
      success: true,
      details: "Access and refresh tokens issued",
    });
    return authState;
  }

  const pool = getPool();
  await pool.query(
    `
      UPDATE users
      SET
        failed_login_attempts = 0,
        locked_until = NULL,
        refresh_token_hash = $2,
        last_login_at = NOW()
      WHERE id = $1
    `,
    [account.id, await bcrypt.hash(refreshToken, 10)]
  );

  await recordAuthEvent({
    userId: account.id,
    email: account.email,
    eventType: "login_success",
    success: true,
    details: "Access and refresh tokens issued",
  });
}

export async function revokeSession(account) {
  if (!account) {
    return;
  }

  if (appConfig.dataMode !== "postgres") {
    const authState = getDemoAuthState(account.email);
    authState.refreshTokenHash = null;
    await recordAuthEvent({
      userId: account.id,
      email: account.email,
      eventType: "logout",
      success: true,
      details: "Session revoked",
    });
    return;
  }

  const pool = getPool();
  await pool.query(
    `
      UPDATE users
      SET refresh_token_hash = NULL
      WHERE id = $1
    `,
    [account.id]
  );

  await recordAuthEvent({
    userId: account.id,
    email: account.email,
    eventType: "logout",
    success: true,
    details: "Session revoked",
  });
}

export async function requestPasswordReset(email) {
  const account = await getLoginAccount(email);
  if (!account) {
    return null;
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = addMinutes(new Date(), OTP_EXPIRY_MINUTES);

  if (appConfig.dataMode !== "postgres") {
    const authState = getDemoAuthState(account.email);
    authState.passwordResetOtpHash = otpHash;
    authState.passwordResetOtpExpiresAt = expiresAt.toISOString();
    persistDemoStore();
    await recordAuthEvent({
      userId: account.id,
      email: account.email,
      eventType: "password_reset_requested",
      success: true,
      details: "OTP generated",
    });
    return { account, otp, expiresAt };
  }

  const pool = getPool();
  await pool.query(
    `
      UPDATE users
      SET
        password_reset_otp_hash = $2,
        password_reset_otp_expires_at = $3
      WHERE id = $1
    `,
    [account.id, otpHash, expiresAt]
  );

  await recordAuthEvent({
    userId: account.id,
    email: account.email,
    eventType: "password_reset_requested",
    success: true,
    details: "OTP generated",
  });

  return { account, otp, expiresAt };
}

export async function completePasswordReset(email, otp, newPassword) {
  const account = await getLoginAccount(email);
  if (!account) {
    return { ok: false, message: "Account not found" };
  }

  const otpHash = account.password_reset_otp_hash;
  const otpExpiresAt = account.password_reset_otp_expires_at;

  if (!otpHash || !otpExpiresAt || new Date(otpExpiresAt).getTime() < Date.now()) {
    return { ok: false, message: "OTP has expired" };
  }

  const isValidOtp = await bcrypt.compare(String(otp), otpHash);
  if (!isValidOtp) {
    return { ok: false, message: "Invalid OTP" };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  if (appConfig.dataMode !== "postgres") {
    const demoUser = getDemoUserByEmail(email);
    demoUser.password_hash = passwordHash;
    const authState = getDemoAuthState(email);
    authState.passwordResetOtpHash = null;
    authState.passwordResetOtpExpiresAt = null;
    persistDemoStore();
    await recordAuthEvent({
      userId: demoUser.id,
      email: demoUser.email,
      eventType: "password_reset_completed",
      success: true,
      details: "Password updated",
    });
    return { ok: true };
  }

  const pool = getPool();
  await pool.query(
    `
      UPDATE users
      SET
        password_hash = $2,
        password_reset_otp_hash = NULL,
        password_reset_otp_expires_at = NULL,
        failed_login_attempts = 0,
        locked_until = NULL
      WHERE id = $1
    `,
    [account.id, passwordHash]
  );

  await recordAuthEvent({
    userId: account.id,
    email: account.email,
    eventType: "password_reset_completed",
    success: true,
    details: "Password updated",
  });

  return { ok: true };
}

export async function refreshSession(refreshToken) {
  if (!refreshToken) {
    return null;
  }

  let payload;
  try {
    payload = jwt.verify(refreshToken, appConfig.jwtSecret);
  } catch {
    return null;
  }

  if (payload.tokenType !== "refresh") {
    return null;
  }

  if (appConfig.dataMode !== "postgres") {
    const account = demoStore.users.find((user) => Number(user.id) === Number(payload.userId));
    if (!account) {
      return null;
    }
    const authState = getDemoAuthState(account.email);
    if (!authState.refreshTokenHash) {
      return null;
    }
    const matches = await bcrypt.compare(refreshToken, authState.refreshTokenHash);
    if (!matches) {
      return null;
    }
    return account;
  }

  const pool = getPool();
  const { rows } = await pool.query(
    `
      SELECT u.*
      FROM users u
      WHERE u.id = $1
    `,
    [payload.userId]
  );

  const account = rows[0];
  if (!account || !account.refresh_token_hash) {
    return null;
  }

  const matches = await bcrypt.compare(refreshToken, account.refresh_token_hash);
  return matches ? account : null;
}

export async function sendOtpEmail(to, otp) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return {
      sent: false,
      preview: `OTP ${otp} would be sent to ${to}`,
    };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || user,
    to,
    subject: "Password reset OTP",
    text: `Your password reset code is ${otp}. It expires in 10 minutes.`,
  });

  return { sent: true };
}

async function getDefaultApproverId() {
  if (appConfig.dataMode !== "postgres") {
    const manager = demoStore.employees.find((employee) => employee.role === "manager" && employee.status === "active");
    if (manager) {
      return Number(manager.id);
    }

    const hr = demoStore.employees.find((employee) => employee.role === "hr" && employee.status === "active");
    return hr ? Number(hr.id) : null;
  }

  const pool = getPool();
  const managerResult = await pool.query(
    `SELECT id FROM employees WHERE role = 'manager' AND status = 'active' ORDER BY id ASC LIMIT 1`
  );
  if (managerResult.rows[0]) {
    return Number(managerResult.rows[0].id);
  }

  const hrResult = await pool.query(
    `SELECT id FROM employees WHERE role = 'hr' AND status = 'active' ORDER BY id ASC LIMIT 1`
  );
  return hrResult.rows[0] ? Number(hrResult.rows[0].id) : null;
}

export async function listSignupApprovers() {
  if (appConfig.dataMode !== "postgres") {
    return demoStore.employees
      .filter((employee) => ["manager", "hr"].includes(employee.role) && employee.status === "active")
      .map((employee) => ({
        employee_id: employee.id,
        full_name: employee.full_name,
        role: employee.role,
      }));
  }

  const pool = getPool();
  const { rows } = await pool.query(
    `
      SELECT id AS employee_id, full_name, role
      FROM employees
      WHERE status = 'active' AND role IN ('manager', 'hr')
      ORDER BY CASE WHEN role = 'manager' THEN 1 ELSE 2 END, full_name ASC
    `
  );
  return rows;
}

export async function registerAccount(payload) {
  const normalizedEmail = normalizeEmail(payload.email);
  if (!normalizedEmail || !payload.password || !payload.full_name) {
    return { ok: false, message: "Name, email, and password are required" };
  }

  const existing = await getLoginAccount(normalizedEmail);
  if (existing) {
    return { ok: false, message: "Email is already registered" };
  }

  const passwordHash = await bcrypt.hash(payload.password, 10);
  const role = payload.role && ["employee", "manager", "hr"].includes(payload.role)
    ? payload.role
    : "employee";
  const defaultApproverId = role === "employee" ? await getDefaultApproverId() : null;
  const managerId =
    payload.manager_id == null || payload.manager_id === ""
      ? defaultApproverId
      : Number(payload.manager_id);

  if (appConfig.dataMode !== "postgres") {
    const employeeId = demoStore.nextIds.employee++;
    const userId = demoStore.nextIds.user++;
    const joinDate = payload.join_date || new Date().toISOString().slice(0, 10);
    const employee = {
      id: employeeId,
      employee_code: formatEmployeeCode(employeeId, new Date(joinDate).getFullYear()),
      full_name: payload.full_name,
      email: normalizedEmail,
      role,
      department: payload.department || "General",
      designation: payload.designation || "Associate",
      monthly_salary: Number(payload.monthly_salary || 0),
      join_date: joinDate,
      status: "active",
      manager_id: managerId,
      pan: payload.pan || "",
      aadhaar: payload.aadhaar || "",
      esi_no: payload.esi_no || "",
      pf_uan: payload.pf_uan || "",
      bank_account_details: payload.bank_account_details || "",
      dob: payload.dob || null,
      employee_category: payload.employee_category || "General",
    };
    demoStore.employees.push(employee);
    demoStore.users.push({
      id: userId,
      employee_id: employeeId,
      full_name: employee.full_name,
      email: normalizedEmail,
      password_hash: passwordHash,
      role,
      department: employee.department,
      designation: employee.designation,
      monthly_salary: employee.monthly_salary,
      join_date: employee.join_date,
      status: "active",
      manager_id: employee.manager_id,
    });
    demoStore.leaveBalances.push({
      employee_id: employeeId,
      total_days: 24,
      used_days: 0,
      available_days: 24,
    });
    persistDemoStore();
    return { ok: true, account: { ...employee, id: userId, employee_id: employeeId } };
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const joinDate = payload.join_date || new Date().toISOString().slice(0, 10);
    const employeeIdSeed = Date.now().toString().slice(-4);
    const employeeResult = await client.query(
      `
        INSERT INTO employees (
          employee_code,
          full_name,
          email,
          role,
          department,
          designation,
          monthly_salary,
          join_date,
          status,
          manager_id,
          dob,
          pan,
          aadhaar,
          esi_no,
          pf_uan,
          bank_account_details,
          employee_category
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',$9,$10,$11,$12,$13,$14,$15,$16)
        RETURNING *
      `,
      [
        formatEmployeeCode(employeeIdSeed, new Date(joinDate).getFullYear()),
        payload.full_name,
        normalizedEmail,
        role,
        payload.department || "General",
        payload.designation || "Associate",
        Number(payload.monthly_salary || 0),
        joinDate,
        managerId,
        payload.dob || null,
        payload.pan || null,
        payload.aadhaar || null,
        payload.esi_no || null,
        payload.pf_uan || null,
        payload.bank_account_details || null,
        payload.employee_category || "General",
      ]
    );

    const userResult = await client.query(
      `
        INSERT INTO users (employee_id, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
      [employeeResult.rows[0].id, normalizedEmail, passwordHash, role]
    );

    await client.query(
      `INSERT INTO leave_balances (employee_id, total_days, used_days, available_days) VALUES ($1,24,0,24)`,
      [employeeResult.rows[0].id]
    );

    await client.query("COMMIT");
    return {
      ok: true,
      account: {
        ...userResult.rows[0],
        ...employeeResult.rows[0],
      },
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
