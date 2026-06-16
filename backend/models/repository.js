import bcrypt from "bcryptjs";
import { getPool } from "../config/db.js";
import { appConfig } from "../config/env.js";
import { demoStore } from "../data/demoData.js";
import { addDays, calculateTds, countWorkingDays, daysInMonth, formatEmployeeCode, normalizeEmail, parseJson } from "./workflowUtils.js";

const isDemoMode = appConfig.dataMode !== "postgres";

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

function getDefaultPayrollConfig() {
  return {
    basic_pay: 0,
    hra_rate: 0.2,
    conveyance: 0,
    special_allowance: 0,
    medical_allowance: 0,
    allowance_fixed: 5000,
    deduction_rate: 0.05,
    professional_tax: 200,
    pf_employee_rate: 0.12,
    pf_employer_rate: 0.1336,
    esi_employee_rate: 0.0075,
    esi_employer_rate: 0.0325,
    tax_slabs: [
      { min: 0, max: 300000, rate: 0 },
      { min: 300000, max: 600000, rate: 0.05 },
      { min: 600000, max: 900000, rate: 0.1 },
      { min: 900000, max: 1200000, rate: 0.15 },
      { min: 1200000, max: null, rate: 0.2 },
    ],
    pay_day: 30,
  };
}

function getDemoPayrollConfig() {
  return {
    ...getDefaultPayrollConfig(),
    ...demoStore.payrollConfig,
  };
}

function getDefaultLeavePolicy() {
  return {
    leave_types: ["Casual", "Sick", "Earned"],
    entitlements_by_category: { General: 24, Contract: 12 },
    holidays: [],
    carry_forward_limit: 10,
    max_entitlement_per_type: { Casual: 12, Sick: 12, Earned: 18 },
  };
}

function getDemoEmployeeById(id) {
  return demoStore.employees.find((employee) => employee.id === Number(id));
}

function getDemoManagerName(managerId) {
  return getDemoEmployeeById(managerId)?.full_name || "Unassigned";
}

function getDemoBalance(employeeId) {
  return demoStore.leaveBalances.find(
    (balance) => balance.employee_id === Number(employeeId)
  );
}

function createNotification({ employeeId = null, role = null, title, message, type }) {
  demoStore.notifications.unshift({
    id: demoStore.nextIds.notification++,
    employee_id: employeeId,
    role,
    title,
    message,
    type,
    is_read: false,
    created_at: new Date().toISOString(),
  });
}

function sanitizeEmployee(employee) {
  const balance = getDemoBalance(employee.id);
  return {
    id: Number(employee.id),
    employee_code: employee.employee_code,
    full_name: employee.full_name,
    email: employee.email,
    role: employee.role,
    dob: employee.dob || null,
    employee_category: employee.employee_category || "General",
    department: employee.department,
    designation: employee.designation,
    monthly_salary: Number(employee.monthly_salary),
    pan: employee.pan || "",
    aadhaar: employee.aadhaar || "",
    esi_no: employee.esi_no || "",
    pf_uan: employee.pf_uan || "",
    bank_account_details: employee.bank_account_details || "",
    join_date: employee.join_date,
    status: employee.status,
    manager_id: Number(employee.manager_id || 0),
    manager_name: getDemoManagerName(employee.manager_id),
    leave_balance: balance
      ? {
          total_days: Number(balance.total_days),
          used_days: Number(balance.used_days),
          available_days: Number(balance.available_days),
        }
      : null,
  };
}

export async function getPayrollConfig() {
  if (isDemoMode) {
    return getDemoPayrollConfig();
  }

  const pool = getPool();
  const { rows } = await pool.query(
    "SELECT * FROM payroll_config ORDER BY id DESC LIMIT 1"
  );

  return (
    rows[0]
      ? {
          ...rows[0],
          tax_slabs: parseJson(rows[0].tax_slabs, getDefaultPayrollConfig().tax_slabs),
        }
      : getDefaultPayrollConfig()
  );
}

export async function getLeavePolicyConfig() {
  if (isDemoMode) {
    return {
      ...getDefaultLeavePolicy(),
      ...demoStore.leavePolicy,
    };
  }

  const pool = getPool();
  const { rows } = await pool.query("SELECT * FROM leave_policy_config ORDER BY id DESC LIMIT 1");
  if (!rows[0]) {
    return getDefaultLeavePolicy();
  }

  return {
    leave_types: parseJson(rows[0].leave_types, getDefaultLeavePolicy().leave_types),
    entitlements_by_category: parseJson(rows[0].entitlements_by_category, getDefaultLeavePolicy().entitlements_by_category),
    holidays: parseJson(rows[0].holidays, []),
    carry_forward_limit: Number(rows[0].carry_forward_limit || 0),
    max_entitlement_per_type: parseJson(rows[0].max_entitlement_per_type, getDefaultLeavePolicy().max_entitlement_per_type),
  };
}

export async function updateLeavePolicyConfig(payload) {
  if (isDemoMode) {
    demoStore.leavePolicy = {
      leave_types: parseJson(payload.leave_types, demoStore.leavePolicy.leave_types),
      entitlements_by_category: parseJson(payload.entitlements_by_category, demoStore.leavePolicy.entitlements_by_category),
      holidays: parseJson(payload.holidays, demoStore.leavePolicy.holidays),
      carry_forward_limit: Number(payload.carry_forward_limit || demoStore.leavePolicy.carry_forward_limit || 0),
      max_entitlement_per_type: parseJson(payload.max_entitlement_per_type, demoStore.leavePolicy.max_entitlement_per_type),
    };
    return demoStore.leavePolicy;
  }

  const pool = getPool();
  const { rows } = await pool.query(
    `
      INSERT INTO leave_policy_config (
        leave_types,
        entitlements_by_category,
        holidays,
        carry_forward_limit,
        max_entitlement_per_type
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    [
      JSON.stringify(parseJson(payload.leave_types, getDefaultLeavePolicy().leave_types)),
      JSON.stringify(parseJson(payload.entitlements_by_category, getDefaultLeavePolicy().entitlements_by_category)),
      JSON.stringify(parseJson(payload.holidays, [])),
      Number(payload.carry_forward_limit || 0),
      JSON.stringify(parseJson(payload.max_entitlement_per_type, getDefaultLeavePolicy().max_entitlement_per_type)),
    ]
  );

  return {
    leave_types: parseJson(rows[0].leave_types, getDefaultLeavePolicy().leave_types),
    entitlements_by_category: parseJson(rows[0].entitlements_by_category, getDefaultLeavePolicy().entitlements_by_category),
    holidays: parseJson(rows[0].holidays, []),
    carry_forward_limit: Number(rows[0].carry_forward_limit || 0),
    max_entitlement_per_type: parseJson(rows[0].max_entitlement_per_type, getDefaultLeavePolicy().max_entitlement_per_type),
  };
}

async function getHrFallbackManagerId() {
  if (isDemoMode) {
    return demoStore.users.find((user) => user.role === "hr")?.employee_id || 3;
  }

  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT employee_id FROM users WHERE role = 'hr' ORDER BY id LIMIT 1`
  );
  return rows[0]?.employee_id || null;
}

async function buildPayroll(baseSalary, month, year, employeeId, employeeName) {
  const config = await getPayrollConfig();
  const grossBasic = Number(baseSalary || config.basic_pay || 0);
  const hra = Math.round(grossBasic * Number(config.hra_rate || 0));
  const conveyance = Math.round(Number(config.conveyance || 0));
  const specialAllowance = Math.round(Number(config.special_allowance || config.allowance_fixed || 0));
  const medicalAllowance = Math.round(Number(config.medical_allowance || 0));
  const grossSalary = grossBasic + hra + conveyance + specialAllowance + medicalAllowance;
  const workingDays = countWorkingDays(
    new Date(Number(year), Number(month) - 1, 1),
    new Date(Number(year), Number(month), 0)
  );
  const approvedLeaves = await getLeaves({ role: "hr" });
  const lopDays = approvedLeaves
    .filter((leave) => Number(leave.employee_id) === Number(employeeId) && leave.status === "approved" && Number(leave.month || new Date(leave.start_date).getMonth() + 1) === Number(month) && Number(leave.year || new Date(leave.start_date).getFullYear()) === Number(year))
    .reduce((sum, leave) => sum + Number(leave.days || 0), 0);
  const lopAmount = Math.round((grossSalary / Math.max(workingDays, 1)) * lopDays);
  const pfEmployee = Math.round(grossBasic * Number(config.pf_employee_rate || 0.12));
  const pfEmployer = Math.round(grossBasic * Number(config.pf_employer_rate || 0.1336));
  const esiEmployee = grossSalary <= 21000 ? Math.round(grossSalary * Number(config.esi_employee_rate || 0.0075)) : 0;
  const esiEmployer = grossSalary <= 21000 ? Math.round(grossSalary * Number(config.esi_employer_rate || 0.0325)) : 0;
  const annualizedIncome = (grossSalary - lopAmount - pfEmployee - esiEmployee - Number(config.professional_tax || 0)) * 12;
  const tds = calculateTds(annualizedIncome, config.tax_slabs || []);
  const professionalTax = Math.round(Number(config.professional_tax || 0));
  const deductions = lopAmount + pfEmployee + esiEmployee + tds + professionalTax;

  return {
    id: isDemoMode ? demoStore.nextIds.payroll++ : null,
    employee_id: employeeId,
    employee_name: employeeName,
    month: Number(month),
    year: Number(year),
    basic_salary: grossBasic,
    hra,
    conveyance,
    special_allowance: specialAllowance,
    medical_allowance: medicalAllowance,
    allowances: conveyance + specialAllowance + medicalAllowance,
    gross_salary: grossSalary,
    working_days: workingDays,
    lop_days: lopDays,
    lop_amount: lopAmount,
    pf_employee: pfEmployee,
    pf_employer: pfEmployer,
    esi_employee: esiEmployee,
    esi_employer: esiEmployer,
    tds,
    professional_tax: professionalTax,
    deductions,
    net_salary: grossSalary - deductions,
    annualized_income: annualizedIncome,
    generated_at: new Date().toISOString(),
  };
}

async function demoAuthenticate(email, password) {
  const user = demoStore.users.find((item) => item.email === email);
  if (!user) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  return isValid ? user : null;
}

async function dbAuthenticate(email, password) {
  const pool = getPool();
  const { rows } = await pool.query(
    `
      SELECT
        u.id,
        u.employee_id,
        u.email,
        u.password_hash,
        u.role,
        e.full_name,
        e.department,
        e.designation,
        e.monthly_salary,
        e.join_date,
        e.status,
        e.manager_id
      FROM users u
      JOIN employees e ON e.id = u.employee_id
      WHERE u.email = $1
    `,
    [email]
  );

  const user = rows[0];
  if (!user) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  return isValid ? user : null;
}

export async function authenticateUser(email, password) {
  return isDemoMode
    ? demoAuthenticate(email, password)
    : dbAuthenticate(email, password);
}

export async function getUserProfile(userId) {
  if (isDemoMode) {
    const user = demoStore.users.find((item) => item.id === Number(userId));
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      employee_id: user.employee_id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      department: user.department,
      designation: user.designation,
      monthly_salary: user.monthly_salary,
      join_date: user.join_date,
      status: user.status,
      manager_id: user.manager_id,
      leave_balance: getDemoBalance(user.employee_id),
    };
  }

  const pool = getPool();
  const { rows } = await pool.query(
    `
      SELECT
        u.id,
        u.employee_id,
        u.email,
        u.role,
        e.full_name,
        e.department,
        e.designation,
        e.monthly_salary,
        e.join_date,
        e.status,
        e.manager_id
      FROM users u
      JOIN employees e ON e.id = u.employee_id
      WHERE u.id = $1
    `,
    [userId]
  );

  return rows[0]
    ? {
        ...rows[0],
        leave_balance: await getLeaveBalance(rows[0].employee_id),
      }
    : null;
}

export async function getEmployees(filters = {}) {
  if (isDemoMode) {
    return demoStore.employees
      .filter((employee) => {
        const searchTerm = normalizeEmail(filters.search || "");
        const statusFilter = normalizeEmail(filters.status || "");
        const departmentFilter = normalizeEmail(filters.department || "");

        const matchesSearch = !searchTerm ||
          [employee.employee_code, employee.full_name, employee.email, employee.department, employee.designation]
            .join(" ")
            .toLowerCase()
            .includes(searchTerm);
        const matchesStatus = !statusFilter || normalizeEmail(employee.status) === statusFilter;
        const matchesDepartment = !departmentFilter || normalizeEmail(employee.department) === departmentFilter;

        return matchesSearch && matchesStatus && matchesDepartment;
      })
      .map(sanitizeEmployee);
  }

  const pool = getPool();
  const params = [];
  const where = [];
  if (filters.search) {
    params.push(`%${filters.search}%`);
    where.push(`(employee_code ILIKE $${params.length} OR full_name ILIKE $${params.length} OR email ILIKE $${params.length} OR department ILIKE $${params.length} OR designation ILIKE $${params.length})`);
  }
  if (filters.status) {
    params.push(filters.status);
    where.push(`status = $${params.length}`);
  }
  if (filters.department) {
    params.push(filters.department);
    where.push(`department = $${params.length}`);
  }

  const { rows } = await pool.query(
    `
      SELECT
        id,
        employee_code,
        full_name,
        email,
        role,
        dob,
        employee_category,
        department,
        designation,
        monthly_salary,
        pan,
        aadhaar,
        esi_no,
        pf_uan,
        bank_account_details,
        join_date,
        status,
        manager_id
      FROM employees
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY id
    `,
    params
  );

  return rows.map((row) => ({
    ...sanitizeEmployee(row),
    manager_name: "",
    leave_balance: null,
  }));
}

export async function createEmployee(payload) {
  const passwordHash = await bcrypt.hash(payload.password, 10);
  const managerId =
    payload.role === "hr"
      ? 3
      : Number(payload.manager_id || (payload.role === "manager" ? 3 : 1));

  if (isDemoMode) {
    const employeeId = demoStore.nextIds.employee++;
    const userId = demoStore.nextIds.user++;
    const joinYear = new Date(payload.join_date).getFullYear();
    const employee = {
      id: employeeId,
      employee_code: formatEmployeeCode(employeeId, joinYear),
      full_name: payload.full_name,
      email: payload.email,
      role: payload.role,
      dob: payload.dob || null,
      employee_category: payload.employee_category || "General",
      department: payload.department,
      designation: payload.designation,
      monthly_salary: Number(payload.monthly_salary),
      pan: payload.pan || "",
      aadhaar: payload.aadhaar || "",
      esi_no: payload.esi_no || "",
      pf_uan: payload.pf_uan || "",
      bank_account_details: payload.bank_account_details || "",
      join_date: payload.join_date,
      status: "active",
      manager_id: managerId,
    };

    demoStore.employees.push(employee);
    demoStore.users.push({
      id: userId,
      employee_id: employeeId,
      full_name: payload.full_name,
      email: payload.email,
      password_hash: passwordHash,
      role: payload.role,
      department: payload.department,
      designation: payload.designation,
      monthly_salary: Number(payload.monthly_salary),
      join_date: payload.join_date,
      status: "active",
      manager_id: managerId,
      failed_login_attempts: 0,
      locked_until: null,
    });
    demoStore.leaveBalances.push({
      employee_id: employeeId,
      total_days: 24,
      used_days: 0,
      available_days: 24,
    });

    createNotification({
      employeeId,
      role: payload.role,
      title: "Employee account created",
      message: "Your employee account is ready. Please sign in to continue.",
      type: "onboarding",
    });

    return sanitizeEmployee(employee);
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const employeeCode = formatEmployeeCode(Date.now().toString().slice(-4), new Date(payload.join_date).getFullYear());
    const employeeResult = await client.query(
      `
        INSERT INTO employees (
          employee_code,
          full_name,
          email,
          role,
          dob,
          employee_category,
          department,
          designation,
          monthly_salary,
          pan,
          aadhaar,
          esi_no,
          pf_uan,
          bank_account_details,
          join_date,
          status,
          manager_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'active', $15)
        RETURNING *
      `,
      [
        employeeCode,
        payload.full_name,
        payload.email,
        payload.role,
        payload.dob || null,
        payload.employee_category || "General",
        payload.department,
        payload.designation,
        payload.monthly_salary,
        payload.pan || null,
        payload.aadhaar || null,
        payload.esi_no || null,
        payload.pf_uan || null,
        payload.bank_account_details || null,
        payload.join_date,
        managerId,
      ]
    );

    await client.query(
      `
        INSERT INTO users (employee_id, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
      `,
      [
        employeeResult.rows[0].id,
        payload.email,
        passwordHash,
        payload.role,
      ]
    );

    await client.query(
      `
        INSERT INTO leave_balances (employee_id, total_days, used_days, available_days)
        VALUES ($1, 24, 0, 24)
      `,
      [employeeResult.rows[0].id]
    );

    await client.query("COMMIT");
    return sanitizeEmployee(employeeResult.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateEmployee(employeeId, payload) {
  if (isDemoMode) {
    const employee = demoStore.employees.find((item) => item.id === Number(employeeId));
    if (!employee) {
      return null;
    }

    Object.assign(employee, {
      full_name: payload.full_name ?? employee.full_name,
      dob: payload.dob ?? employee.dob,
      employee_category: payload.employee_category ?? employee.employee_category,
      department: payload.department ?? employee.department,
      designation: payload.designation ?? employee.designation,
      monthly_salary: payload.monthly_salary == null ? employee.monthly_salary : Number(payload.monthly_salary),
      pan: payload.pan ?? employee.pan,
      aadhaar: payload.aadhaar ?? employee.aadhaar,
      esi_no: payload.esi_no ?? employee.esi_no,
      pf_uan: payload.pf_uan ?? employee.pf_uan,
      bank_account_details: payload.bank_account_details ?? employee.bank_account_details,
      manager_id: payload.manager_id == null ? employee.manager_id : Number(payload.manager_id),
      status: payload.status ?? employee.status,
    });

    const user = demoStore.users.find((item) => item.employee_id === employee.id);
    if (user) {
      Object.assign(user, {
        full_name: employee.full_name,
        dob: employee.dob,
        employee_category: employee.employee_category,
        department: employee.department,
        designation: employee.designation,
        monthly_salary: employee.monthly_salary,
        pan: employee.pan,
        aadhaar: employee.aadhaar,
        esi_no: employee.esi_no,
        pf_uan: employee.pf_uan,
        bank_account_details: employee.bank_account_details,
        manager_id: employee.manager_id,
        status: employee.status,
      });
    }

    return sanitizeEmployee(employee);
  }

  const pool = getPool();
  const { rows } = await pool.query(
    `
      UPDATE employees
      SET
        full_name = COALESCE($2, full_name),
        dob = COALESCE($3, dob),
        employee_category = COALESCE($4, employee_category),
        department = COALESCE($5, department),
        designation = COALESCE($6, designation),
        monthly_salary = COALESCE($7, monthly_salary),
        pan = COALESCE($8, pan),
        aadhaar = COALESCE($9, aadhaar),
        esi_no = COALESCE($10, esi_no),
        pf_uan = COALESCE($11, pf_uan),
        bank_account_details = COALESCE($12, bank_account_details),
        manager_id = COALESCE($13, manager_id),
        status = COALESCE($14, status),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [
      employeeId,
      payload.full_name ?? null,
      payload.dob ?? null,
      payload.employee_category ?? null,
      payload.department ?? null,
      payload.designation ?? null,
      payload.monthly_salary ?? null,
      payload.pan ?? null,
      payload.aadhaar ?? null,
      payload.esi_no ?? null,
      payload.pf_uan ?? null,
      payload.bank_account_details ?? null,
      payload.manager_id ?? null,
      payload.status ?? null,
    ]
  );

  if (!rows[0]) {
    return null;
  }

  return sanitizeEmployee(rows[0]);
}

export async function deactivateEmployee(employeeId) {
  return updateEmployee(employeeId, { status: "inactive" });
}

export async function importEmployeesFromCsv(csvText) {
  const lines = String(csvText || "").trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    return { imported: 0, failed: 0, failures: [] };
  }

  const headers = lines[0].split(",").map((header) => header.trim());
  const failures = [];
  let imported = 0;

  for (let index = 1; index < lines.length; index += 1) {
    const rowValues = lines[index].split(",").map((value) => value.trim());
    const row = Object.fromEntries(headers.map((header, headerIndex) => [header, rowValues[headerIndex] || ""]));
    try {
      await createEmployee({
        full_name: row.full_name,
        email: row.email,
        role: row.role || "employee",
        manager_id: row.manager_id || undefined,
        dob: row.dob || null,
        employee_category: row.employee_category || "General",
        department: row.department || "General",
        designation: row.designation || "Associate",
        monthly_salary: Number(row.monthly_salary || 0),
        pan: row.pan || "",
        aadhaar: row.aadhaar || "",
        esi_no: row.esi_no || "",
        pf_uan: row.pf_uan || "",
        bank_account_details: row.bank_account_details || "",
        join_date: row.join_date || new Date().toISOString().slice(0, 10),
        password: row.password || "Password@123",
      });
      imported += 1;
    } catch (error) {
      failures.push({ line: index + 1, message: error.message });
    }
  }

  return { imported, failed: failures.length, failures };
}

export async function requestBankAccountChange(employeeId, requestedAccountDetails) {
  if (isDemoMode) {
    const request = {
      id: demoStore.nextIds.bankAccountChangeRequest++,
      employee_id: Number(employeeId),
      requested_account_details: requestedAccountDetails,
      status: "pending",
      reviewed_by: null,
      review_comment: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    demoStore.bankAccountChangeRequests.unshift(request);
    return request;
  }

  const pool = getPool();
  const { rows } = await pool.query(
    `
      INSERT INTO bank_account_change_requests (employee_id, requested_account_details)
      VALUES ($1, $2)
      RETURNING *
    `,
    [employeeId, requestedAccountDetails]
  );
  return rows[0];
}

export async function getBankAccountChangeRequests() {
  if (isDemoMode) {
    return demoStore.bankAccountChangeRequests;
  }

  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT * FROM bank_account_change_requests ORDER BY created_at DESC`
  );
  return rows;
}

export async function reviewBankAccountChangeRequest(id, status, reviewedBy, reviewComment = "") {
  if (isDemoMode) {
    const request = demoStore.bankAccountChangeRequests.find((item) => item.id === Number(id));
    if (!request) {
      return null;
    }
    request.status = status;
    request.reviewed_by = Number(reviewedBy);
    request.review_comment = reviewComment;
    request.updated_at = new Date().toISOString();

    if (status === "approved") {
      const employee = demoStore.employees.find((item) => item.id === Number(request.employee_id));
      if (employee) {
        employee.bank_account_details = request.requested_account_details;
      }
    }

    return request;
  }

  const pool = getPool();
  const { rows } = await pool.query(
    `
      UPDATE bank_account_change_requests
      SET status = $2, reviewed_by = $3, review_comment = $4, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [id, status, reviewedBy, reviewComment]
  );

  const request = rows[0];
  if (!request) {
    return null;
  }

  if (status === "approved") {
    await pool.query(
      `UPDATE employees SET bank_account_details = $2, updated_at = NOW() WHERE id = $1`,
      [request.employee_id, request.requested_account_details]
    );
  }

  return request;
}

export async function getLeaves(user) {
  if (isDemoMode) {
    return demoStore.leaves.filter((leave) => {
      if (user.role === "employee") {
        return leave.employee_id === user.employee_id;
      }
      if (user.role === "manager") {
        return leave.manager_id === user.employee_id || leave.employee_id === user.employee_id;
      }
      return true;
    });
  }

  const pool = getPool();
  const params = [];
  let query = `
    SELECT
      l.id,
      l.employee_id,
      e.full_name AS employee_name,
      l.manager_id,
      l.leave_type,
      l.start_date,
      l.end_date,
      l.days,
      l.is_half_day,
      l.reason,
      l.status,
      l.validation_status,
      l.manager_comment,
      l.created_at
    FROM leave_requests l
    JOIN employees e ON e.id = l.employee_id
  `;

  if (user.role === "employee") {
    params.push(user.employee_id);
    query += ` WHERE l.employee_id = $${params.length}`;
  }

  query += " ORDER BY l.created_at DESC";

  const { rows } = await pool.query(query, params);
  return rows;
}

export async function getLeaveBalance(employeeId) {
  if (isDemoMode) {
    return getDemoBalance(employeeId);
  }

  const pool = getPool();
  const { rows } = await pool.query(
    "SELECT * FROM leave_balances WHERE employee_id = $1",
    [employeeId]
  );
  return rows[0] || null;
}

export async function validateLeaveRequest(user, payload) {
  const start = new Date(payload.start_date);
  const end = new Date(payload.end_date);
  const isHalfDay =
    String(payload.is_half_day || payload.half_day || "false") === "true" ||
    payload.is_half_day === true ||
    payload.half_day === true;
  const requestedDays = isHalfDay
    ? 0.5
    : payload.days
      ? Number(payload.days)
      : countWorkingDays(start, end);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return { valid: false, message: "Please provide a valid leave date range." };
  }

  if (requestedDays <= 0 || Number.isNaN(requestedDays)) {
    return { valid: false, message: "Leave days must be greater than zero." };
  }

  const leavePolicy = await getLeavePolicyConfig();
  if (!leavePolicy.leave_types.includes(payload.leave_type)) {
    return { valid: false, message: "Selected leave type is not configured." };
  }

  const balance = await getLeaveBalance(user.employee_id);
  if (!balance) {
    return { valid: false, message: "Leave balance record not found." };
  }

  if (requestedDays > Number(balance.available_days)) {
    return {
      valid: false,
      message: `Requested days exceed available balance of ${balance.available_days}.`,
    };
  }

  return { valid: true, balance };
}

export async function createLeaveRequest(user, payload) {
  const validation = await validateLeaveRequest(user, payload);
  if (!validation.valid) {
    const error = new Error(validation.message);
    error.statusCode = 400;
    throw error;
  }

  const hrFallbackManagerId = await getHrFallbackManagerId();
  const managerId =
    String(payload.approver_target || "manager") === "hr"
      ? Number(hrFallbackManagerId)
      : Number(user.manager_id || hrFallbackManagerId);
  const isHalfDay =
    String(payload.is_half_day || payload.half_day || "false") === "true" ||
    payload.is_half_day === true ||
    payload.half_day === true;
  const requestedDays = isHalfDay
    ? 0.5
    : payload.days
      ? Number(payload.days)
      : countWorkingDays(payload.start_date, payload.end_date);
  const leave = {
    employee_id: user.employee_id,
    employee_name: user.full_name,
    manager_id: managerId,
    manager_name: getDemoManagerName(managerId),
    leave_type: payload.leave_type,
    start_date: payload.start_date,
    end_date: payload.end_date,
    days: requestedDays,
    is_half_day: isHalfDay,
    reason: payload.reason,
    status: "pending",
    validation_status: "validated",
    manager_comment: "",
    created_at: new Date().toISOString(),
  };

  if (isDemoMode) {
    const record = { id: demoStore.nextIds.leave++, ...leave };
    demoStore.leaves.unshift(record);

    createNotification({
      employeeId: user.employee_id,
      role: "employee",
      title: "Leave request submitted",
      message: `Your request was validated and routed to ${leave.manager_name}.`,
      type: "leave_request",
    });
    createNotification({
      employeeId: managerId,
      role: "manager",
      title: "Pending leave approval",
      message: `${user.full_name} submitted ${leave.days} day(s) of leave.`,
      type: "approval_queue",
    });

    return record;
  }

  const pool = getPool();
  const { rows } = await pool.query(
    `
      INSERT INTO leave_requests (
        employee_id,
        manager_id,
        leave_type,
        start_date,
        end_date,
        days,
        is_half_day,
        reason,
        status,
        validation_status,
        manager_comment
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', 'validated', '')
      RETURNING id, employee_id, manager_id, leave_type, start_date, end_date, days, reason, status, validation_status, manager_comment, created_at
    `,
    [
      leave.employee_id,
      leave.manager_id,
      leave.leave_type,
      leave.start_date,
      leave.end_date,
      leave.days,
      leave.is_half_day,
      leave.reason,
    ]
  );

  return {
    ...rows[0],
    employee_name: user.full_name,
  };
}

async function updateBalanceAfterApproval(employeeId, days) {
  if (isDemoMode) {
    const balance = getDemoBalance(employeeId);
    if (balance) {
      balance.used_days += Number(days);
      balance.available_days = Math.max(balance.total_days - balance.used_days, 0);
    }
    return;
  }

  const pool = getPool();
  await pool.query(
    `
      UPDATE leave_balances
      SET
        used_days = used_days + $2,
        available_days = GREATEST(total_days - (used_days + $2), 0),
        updated_at = NOW()
      WHERE employee_id = $1
    `,
    [employeeId, Number(days)]
  );
}

export async function updateLeaveStatus(id, status, managerComment, actor) {
  if (isDemoMode) {
    const leave = demoStore.leaves.find((item) => item.id === Number(id));
    if (!leave) {
      return null;
    }
    if (actor?.role === "manager" && leave.manager_id !== actor.employee_id) {
      const error = new Error("This leave request is not routed to you.");
      error.statusCode = 403;
      throw error;
    }
    leave.status = status;
    leave.manager_comment = managerComment;
    if (status === "approved") {
      await updateBalanceAfterApproval(leave.employee_id, leave.days);
    }
    createNotification({
      employeeId: leave.employee_id,
      role: "employee",
      title: `Leave request ${status}`,
      message: `Your leave request was ${status} by ${actor?.full_name || "the approver"}.`,
      type: "leave_status",
    });
    return leave;
  }

  const pool = getPool();
  const existing = await pool.query(
    "SELECT * FROM leave_requests WHERE id = $1",
    [id]
  );
  if (!existing.rows[0]) {
    return null;
  }
  if (
    actor?.role === "manager" &&
    Number(existing.rows[0].manager_id) !== Number(actor.employee_id)
  ) {
    const error = new Error("This leave request is not routed to you.");
    error.statusCode = 403;
    throw error;
  }
  const { rows } = await pool.query(
    `
      UPDATE leave_requests
      SET status = $2, manager_comment = $3, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [id, status, managerComment]
  );

  if (!rows[0]) {
    return null;
  }

  if (status === "approved") {
    await updateBalanceAfterApproval(rows[0].employee_id, rows[0].days);
  }

  const employeeResult = await pool.query(
    "SELECT full_name FROM employees WHERE id = $1",
    [rows[0].employee_id]
  );

  return {
    ...rows[0],
    employee_name: employeeResult.rows[0]?.full_name || "Employee",
  };
}

export async function cancelLeaveRequest(id, actor) {
  if (isDemoMode) {
    const leave = demoStore.leaves.find((item) => item.id === Number(id));
    if (!leave) {
      return null;
    }
    if (actor?.role === "employee" && leave.employee_id !== actor.employee_id) {
      const error = new Error("You can only cancel your own leave.");
      error.statusCode = 403;
      throw error;
    }
    if (leave.status !== "approved") {
      const error = new Error("Only approved future leaves can be cancelled.");
      error.statusCode = 400;
      throw error;
    }
    if (new Date(leave.end_date).getTime() < Date.now()) {
      const error = new Error("Past leave cannot be cancelled.");
      error.statusCode = 400;
      throw error;
    }

    leave.status = "cancelled";
    const balance = getDemoBalance(leave.employee_id);
    if (balance) {
      balance.used_days = Math.max(Number(balance.used_days) - Number(leave.days), 0);
      balance.available_days = Math.min(balance.total_days, Number(balance.available_days) + Number(leave.days));
    }

    createNotification({
      employeeId: leave.employee_id,
      role: "employee",
      title: "Leave request cancelled",
      message: `Your approved leave was cancelled and ${leave.days} day(s) were restored.`,
      type: "leave_status",
    });

    return leave;
  }

  const pool = getPool();
  const existing = await pool.query("SELECT * FROM leave_requests WHERE id = $1", [id]);
  if (!existing.rows[0]) {
    return null;
  }
  if (actor?.role === "employee" && Number(existing.rows[0].employee_id) !== Number(actor.employee_id)) {
    const error = new Error("You can only cancel your own leave.");
    error.statusCode = 403;
    throw error;
  }
  if (existing.rows[0].status !== "approved") {
    const error = new Error("Only approved future leaves can be cancelled.");
    error.statusCode = 400;
    throw error;
  }
  if (new Date(existing.rows[0].end_date).getTime() < Date.now()) {
    const error = new Error("Past leave cannot be cancelled.");
    error.statusCode = 400;
    throw error;
  }

  await pool.query(
    `
      UPDATE leave_requests
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = $1
    `,
    [id]
  );

  await pool.query(
    `
      UPDATE leave_balances
      SET
        used_days = GREATEST(used_days - $2, 0),
        available_days = LEAST(total_days, available_days + $2),
        updated_at = NOW()
      WHERE employee_id = $1
    `,
    [existing.rows[0].employee_id, Number(existing.rows[0].days)]
  );

  return { ...existing.rows[0], status: "cancelled" };
}

export async function getTeamCalendar(user) {
  const leaves = await getLeaves(user.role === "manager" ? { role: "manager", employee_id: user.employee_id } : { role: "hr" });
  return leaves.filter((leave) => leave.status === "approved");
}

export async function getPayrolls(user) {
  if (isDemoMode) {
    return demoStore.payrolls.filter((payroll) =>
      user.role === "employee" ? payroll.employee_id === user.employee_id : true
    );
  }

  const pool = getPool();
  const params = [];
  let query = `
    SELECT
      p.*,
      e.full_name AS employee_name
    FROM payrolls p
    JOIN employees e ON e.id = p.employee_id
  `;

  if (user.role === "employee") {
    params.push(user.employee_id);
    query += ` WHERE p.employee_id = $${params.length}`;
  }

  query += " ORDER BY p.year DESC, p.month DESC, p.id DESC";

  const { rows } = await pool.query(query, params);
  return rows.map((row) => ({
    ...row,
    basic_salary: Number(row.basic_salary),
    hra: Number(row.hra),
    conveyance: Number(row.conveyance || 0),
    special_allowance: Number(row.special_allowance || 0),
    medical_allowance: Number(row.medical_allowance || 0),
    allowances: Number(row.allowances || 0),
    gross_salary: Number(row.gross_salary || 0),
    working_days: Number(row.working_days || 0),
    lop_days: Number(row.lop_days || 0),
    lop_amount: Number(row.lop_amount || 0),
    pf_employee: Number(row.pf_employee || 0),
    pf_employer: Number(row.pf_employer || 0),
    esi_employee: Number(row.esi_employee || 0),
    esi_employer: Number(row.esi_employer || 0),
    tds: Number(row.tds || 0),
    professional_tax: Number(row.professional_tax || 0),
    deductions: Number(row.deductions),
    net_salary: Number(row.net_salary),
  }));
}

export async function runPayroll(month, year, options = {}) {
  const employees = await getEmployees();
  const allowRevision = Boolean(options.allowRevision);
  const payrollBatch = await Promise.all(
    employees.map((employee) =>
      buildPayroll(
        employee.monthly_salary,
        month,
        year,
        employee.id,
        employee.full_name
      )
    )
  );

  if (isDemoMode) {
    for (const payroll of payrollBatch) {
      const existingIndex = demoStore.payrolls.findIndex(
        (item) =>
          item.employee_id === payroll.employee_id &&
          item.month === payroll.month &&
          item.year === payroll.year
      );

      if (existingIndex >= 0) {
        if (!allowRevision) {
          const error = new Error("Payroll run is locked for this period. Start a revision run to modify it.");
          error.statusCode = 409;
          throw error;
        }
        payroll.id = demoStore.payrolls[existingIndex].id;
        payroll.is_revision = true;
        payroll.revised_at = new Date().toISOString();
        demoStore.payrolls[existingIndex] = payroll;
      } else {
        payroll.is_revision = false;
        demoStore.payrolls.unshift(payroll);
      }

      createNotification({
        employeeId: payroll.employee_id,
        role: "employee",
        title: "Payslip generated",
        message: `Payroll is ready for ${payroll.month}/${payroll.year}.`,
        type: "payroll",
      });
    }

    return payrollBatch;
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (!allowRevision) {
      const lockCheck = await client.query(
        `SELECT 1 FROM payrolls WHERE month = $1 AND year = $2 LIMIT 1`,
        [month, year]
      );
      if (lockCheck.rows.length > 0) {
        const error = new Error("Payroll run is locked for this period. Start a revision run to modify it.");
        error.statusCode = 409;
        throw error;
      }
    }

    for (const payroll of payrollBatch) {
      await client.query(
        `
          INSERT INTO payrolls (
            employee_id,
            month,
            year,
            basic_salary,
            hra,
            allowances,
            conveyance,
            special_allowance,
            medical_allowance,
            gross_salary,
            working_days,
            lop_days,
            lop_amount,
            pf_employee,
            pf_employer,
            esi_employee,
            esi_employer,
            tds,
            professional_tax,
            deductions,
            annualized_income,
            is_revision,
            revised_at,
            net_salary
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
          ON CONFLICT (employee_id, month, year)
          DO UPDATE SET
            basic_salary = EXCLUDED.basic_salary,
            hra = EXCLUDED.hra,
            allowances = EXCLUDED.allowances,
            conveyance = EXCLUDED.conveyance,
            special_allowance = EXCLUDED.special_allowance,
            medical_allowance = EXCLUDED.medical_allowance,
            gross_salary = EXCLUDED.gross_salary,
            working_days = EXCLUDED.working_days,
            lop_days = EXCLUDED.lop_days,
            lop_amount = EXCLUDED.lop_amount,
            pf_employee = EXCLUDED.pf_employee,
            pf_employer = EXCLUDED.pf_employer,
            esi_employee = EXCLUDED.esi_employee,
            esi_employer = EXCLUDED.esi_employer,
            tds = EXCLUDED.tds,
            professional_tax = EXCLUDED.professional_tax,
            deductions = EXCLUDED.deductions,
            annualized_income = EXCLUDED.annualized_income,
            is_revision = EXCLUDED.is_revision,
            revised_at = EXCLUDED.revised_at,
            net_salary = EXCLUDED.net_salary,
            generated_at = NOW()
        `,
        [
          payroll.employee_id,
          payroll.month,
          payroll.year,
          payroll.basic_salary,
          payroll.hra,
          payroll.allowances,
          payroll.conveyance,
          payroll.special_allowance,
          payroll.medical_allowance,
          payroll.gross_salary,
          payroll.working_days,
          payroll.lop_days,
          payroll.lop_amount,
          payroll.pf_employee,
          payroll.pf_employer,
          payroll.esi_employee,
          payroll.esi_employer,
          payroll.tds,
          payroll.professional_tax,
          payroll.deductions,
          payroll.annualized_income,
          allowRevision,
          allowRevision ? new Date() : null,
          payroll.net_salary,
        ]
      );
    }

    await client.query("COMMIT");
    return getPayrolls({ role: "hr" });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getPayrollById(id, user) {
  const payrolls = await getPayrolls(user);
  return payrolls.find((item) => Number(item.id) === Number(id)) || null;
}

export async function updatePayrollConfig(payload) {
  if (isDemoMode) {
    demoStore.payrollConfig = {
      basic_pay: Number(payload.basic_pay || 0),
      hra_rate: Number(payload.hra_rate),
      conveyance: Number(payload.conveyance || 0),
      special_allowance: Number(payload.special_allowance || 0),
      medical_allowance: Number(payload.medical_allowance || 0),
      allowance_fixed: Number(payload.allowance_fixed),
      deduction_rate: Number(payload.deduction_rate),
      professional_tax: Number(payload.professional_tax || 0),
      pf_employee_rate: Number(payload.pf_employee_rate || 0.12),
      pf_employer_rate: Number(payload.pf_employer_rate || 0.1336),
      esi_employee_rate: Number(payload.esi_employee_rate || 0.0075),
      esi_employer_rate: Number(payload.esi_employer_rate || 0.0325),
      tax_slabs: parseJson(payload.tax_slabs, getDefaultPayrollConfig().tax_slabs),
      pay_day: Number(payload.pay_day),
    };
    return demoStore.payrollConfig;
  }

  const pool = getPool();
  const { rows } = await pool.query(
    `
      INSERT INTO payroll_config (
        basic_pay,
        hra_rate,
        conveyance,
        special_allowance,
        medical_allowance,
        allowance_fixed,
        deduction_rate,
        professional_tax,
        pf_employee_rate,
        pf_employer_rate,
        esi_employee_rate,
        esi_employer_rate,
        tax_slabs,
        pay_day
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `,
    [
      payload.basic_pay || 0,
      payload.hra_rate,
      payload.conveyance || 0,
      payload.special_allowance || 0,
      payload.medical_allowance || 0,
      payload.allowance_fixed,
      payload.deduction_rate,
      payload.professional_tax || 0,
      payload.pf_employee_rate || 0.12,
      payload.pf_employer_rate || 0.1336,
      payload.esi_employee_rate || 0.0075,
      payload.esi_employer_rate || 0.0325,
      JSON.stringify(parseJson(payload.tax_slabs, getDefaultPayrollConfig().tax_slabs)),
      payload.pay_day,
    ]
  );
  return rows[0];
}

export async function getNotifications(user) {
  if (isDemoMode) {
    return demoStore.notifications.filter((item) => {
      if (user.role === "hr") {
        return item.role === "hr" || item.role === null || item.employee_id === user.employee_id;
      }
      return item.employee_id === user.employee_id || item.role === user.role;
    });
  }

  const pool = getPool();
  const { rows } = await pool.query(
    `
      SELECT *
      FROM notifications
      WHERE employee_id = $1 OR role = $2 OR role IS NULL
      ORDER BY created_at DESC
    `,
    [user.employee_id, user.role]
  );
  return rows;
}

export async function getDashboardSummary(user) {
  const employees = await getEmployees();
  const allLeaves =
    user.role === "employee"
      ? await getLeaves(user)
      : await getLeaves({ role: "hr" });
  const allPayrolls =
    user.role === "employee"
      ? await getPayrolls(user)
      : await getPayrolls({ role: "hr" });

  const pendingLeaves = allLeaves.filter((leave) => leave.status === "pending").length;
  const approvedLeaves = allLeaves.filter((leave) => leave.status === "approved").length;
  const totalPayroll = allPayrolls.reduce(
    (sum, item) => sum + Number(item.net_salary || 0),
    0
  );
  const notifications = await getNotifications(user);
  const leaveBalance = await getLeaveBalance(user.employee_id);

  if (user.role === "employee") {
    return {
      employeeCount: employees.length,
      pendingLeaves,
      approvedLeaves,
      totalPayroll:
        allPayrolls.length > 0 ? Number(allPayrolls[0].net_salary) : Number(user.monthly_salary),
      leaveBalance: Number(leaveBalance?.available_days || 0),
      unreadNotifications: notifications.filter((item) => !item.is_read).length,
    };
  }

  return {
    employeeCount: employees.length,
    pendingLeaves,
    approvedLeaves,
    totalPayroll,
    leaveBalance: leaveBalance ? Number(leaveBalance.available_days) : null,
    unreadNotifications: notifications.filter((item) => !item.is_read).length,
  };
}

export function getDemoCredentials() {
  return [
    { role: "HR", email: "hr@company.com", password: "Password@123" },
    { role: "Manager", email: "manager@company.com", password: "Password@123" },
    { role: "Employee", email: "employee@company.com", password: "Password@123" },
  ];
}
