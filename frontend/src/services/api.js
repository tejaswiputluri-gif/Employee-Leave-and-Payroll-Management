import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

const ACCESS_TOKEN_KEY = "ems_access_token";
const REFRESH_TOKEN_KEY = "ems_refresh_token";
const LEGACY_ACCESS_TOKEN_KEY = "ems_token";

const STORAGE_KEY = "ems_mock_store_v2";

let refreshPromise = null;

function getStoredAccessToken() {
  return (
    localStorage.getItem(ACCESS_TOKEN_KEY) ||
    localStorage.getItem(LEGACY_ACCESS_TOKEN_KEY) ||
    ""
  );
}

function getStoredRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || "";
}

export function setAuthTokens(accessToken, refreshToken) {
  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(LEGACY_ACCESS_TOKEN_KEY, accessToken);
  }
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export function clearAuthTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function emitSessionExpired() {
  window.dispatchEvent(new CustomEvent("ems-session-expired"));
}

const defaultStore = {
  users: [
    {
      id: 1,
      employee_id: 1,
      full_name: "Neha HR",
      email: "hr@company.com",
      password: "Password@123",
      role: "hr",
      department: "Human Resources",
      designation: "HR Executive",
      monthly_salary: 72000,
      join_date: "2021-09-10",
      status: "active",
      manager_id: 3,
      leave_balance: { total_days: 24, used_days: 1, available_days: 23 },
    },
    {
      id: 2,
      employee_id: 2,
      full_name: "Asha Manager",
      email: "manager@company.com",
      password: "Password@123",
      role: "manager",
      department: "Operations",
      designation: "Operations Manager",
      monthly_salary: 85000,
      join_date: "2022-02-15",
      status: "active",
      manager_id: 1,
      leave_balance: { total_days: 24, used_days: 2, available_days: 22 },
    },
    {
      id: 3,
      employee_id: 3,
      full_name: "Ravi Employee",
      email: "employee@company.com",
      password: "Password@123",
      role: "employee",
      department: "Engineering",
      designation: "Software Engineer",
      monthly_salary: 65000,
      join_date: "2023-04-01",
      status: "active",
      manager_id: 2,
      leave_balance: { total_days: 24, used_days: 0, available_days: 24 },
    },
  ],
  employees: [
    {
      id: 1,
      employee_code: "EMP001",
      full_name: "Neha HR",
      email: "hr@company.com",
      role: "hr",
      department: "Human Resources",
      designation: "HR Executive",
      monthly_salary: 72000,
      join_date: "2021-09-10",
      status: "active",
      manager_id: 3,
      manager_name: "Neha HR",
      leave_balance: { total_days: 24, used_days: 1, available_days: 23 },
    },
    {
      id: 2,
      employee_code: "EMP002",
      full_name: "Asha Manager",
      email: "manager@company.com",
      role: "manager",
      department: "Operations",
      designation: "Operations Manager",
      monthly_salary: 85000,
      join_date: "2022-02-15",
      status: "active",
      manager_id: 1,
      manager_name: "Neha HR",
      leave_balance: { total_days: 24, used_days: 2, available_days: 22 },
    },
    {
      id: 3,
      employee_code: "EMP003",
      full_name: "Ravi Employee",
      email: "employee@company.com",
      role: "employee",
      department: "Engineering",
      designation: "Software Engineer",
      monthly_salary: 65000,
      join_date: "2023-04-01",
      status: "active",
      manager_id: 2,
      manager_name: "Asha Manager",
      leave_balance: { total_days: 24, used_days: 0, available_days: 24 },
    },
  ],
  leaves: [
    {
      id: 1,
      employee_id: 3,
      employee_name: "Ravi Employee",
      manager_id: 2,
      manager_name: "Asha Manager",
      leave_type: "Casual",
      start_date: "2026-04-10",
      end_date: "2026-04-12",
      days: 3,
      reason: "Family function",
      status: "pending",
      validation_status: "validated",
      manager_comment: "",
      created_at: "2026-04-02T09:30:00.000Z",
    },
  ],
  payrolls: [
    {
      id: 1,
      employee_id: 3,
      employee_name: "Ravi Employee",
      month: 3,
      year: 2026,
      basic_salary: 65000,
      hra: 13000,
      allowances: 5000,
      deductions: 3250,
      net_salary: 79750,
      generated_at: "2026-03-31T15:00:00.000Z",
    },
  ],
  notifications: [
    {
      id: 1,
      employee_id: 1,
      role: "hr",
      title: "Payroll control ready",
      message: "Review payroll configuration before running this month's payroll.",
      type: "payroll_config",
      is_read: false,
      created_at: "2026-04-01T09:00:00.000Z",
    },
    {
      id: 2,
      employee_id: 2,
      role: "manager",
      title: "Pending leave approval",
      message: "Ravi Employee has submitted a leave request for 3 day(s).",
      type: "approval_queue",
      is_read: false,
      created_at: "2026-04-02T09:35:00.000Z",
    },
    {
      id: 3,
      employee_id: 3,
      role: "employee",
      title: "Leave request submitted",
      message: "Your leave request was routed to Asha Manager.",
      type: "leave_request",
      is_read: false,
      created_at: "2026-04-02T09:35:00.000Z",
    },
  ],
  payrollConfig: {
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
  },
  nextIds: {
    employee: 4,
    leave: 2,
    payroll: 2,
    notification: 4,
    user: 4,
  },
};

function authConfig(token) {
  return {
    headers: {
      Authorization: `Bearer ${token || getStoredAccessToken()}`,
    },
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadStore() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultStore));
    return clone(defaultStore);
  }
  return JSON.parse(stored);
}

function saveStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (
      status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url?.includes("/auth/refresh") ||
      !originalRequest.headers?.Authorization
    ) {
      return Promise.reject(error);
    }

    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) {
      clearAuthTokens();
      emitSessionExpired();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = api.post("/auth/refresh", { refreshToken });
      }

      const response = await refreshPromise;
      refreshPromise = null;
      setAuthTokens(response.data.accessToken, response.data.refreshToken);
      originalRequest.headers = {
        ...(originalRequest.headers || {}),
        Authorization: `Bearer ${response.data.accessToken}`,
      };
      return api(originalRequest);
    } catch (refreshError) {
      refreshPromise = null;
      clearAuthTokens();
      emitSessionExpired();
      return Promise.reject(refreshError);
    }
  }
);

function isRecoverable(error) {
  return !error.response || error.response.status >= 500;
}

function getMockToken(user) {
  return `mock-token-${user.id}`;
}

function getUserFromToken(token, store) {
  const id = Number(String(token || "").replace("mock-token-", ""));
  return store.users.find((user) => user.id === id);
}

function syncEmployeeBalances(store) {
  for (const employee of store.employees) {
    const user = store.users.find((item) => item.employee_id === employee.id);
    if (user) {
      employee.leave_balance = clone(user.leave_balance);
    }
  }
}

function createNotification(store, payload) {
  store.notifications.unshift({
    id: store.nextIds.notification++,
    is_read: false,
    created_at: new Date().toISOString(),
    ...payload,
  });
}

function buildSummary(user, store) {
  const leaves =
    user.role === "employee"
      ? store.leaves.filter((leave) => leave.employee_id === user.employee_id)
      : user.role === "manager"
        ? store.leaves.filter(
            (leave) =>
              leave.manager_id === user.employee_id ||
              leave.employee_id === user.employee_id
          )
        : store.leaves;
  const payrolls =
    user.role === "employee"
      ? store.payrolls.filter((payroll) => payroll.employee_id === user.employee_id)
      : store.payrolls;
  const notifications = getMockNotifications(user, store);

  return {
    employeeCount: store.employees.length,
    pendingLeaves: leaves.filter((leave) => leave.status === "pending").length,
    approvedLeaves: leaves.filter((leave) => leave.status === "approved").length,
    totalPayroll:
      user.role === "employee"
        ? Number(payrolls[0]?.net_salary || user.monthly_salary)
        : payrolls.reduce((sum, payroll) => sum + Number(payroll.net_salary), 0),
    leaveBalance: Number(user.leave_balance?.available_days || 0),
    unreadNotifications: notifications.filter((item) => !item.is_read).length,
  };
}

function getMockNotifications(user, store) {
  if (user.role === "hr") {
    return store.notifications.filter(
      (item) =>
        item.role === "hr" || item.employee_id === user.employee_id || item.role == null
    );
  }
  return store.notifications.filter(
    (item) => item.employee_id === user.employee_id || item.role === user.role
  );
}

async function withFallback(remote, fallback) {
  try {
    return await remote();
  } catch (error) {
    if (!isRecoverable(error)) {
      throw error;
    }
    return fallback();
  }
}

export async function fetchDemoCredentials() {
  return withFallback(
    async () => {
      const { data } = await api.get("/auth/demo-credentials");
      return data;
    },
    async () => ({
      success: true,
      credentials: [
        { role: "Manager", email: "manager@company.com", password: "Password@123" },
        { role: "Employee", email: "employee@company.com", password: "Password@123" },
      ],
    })
  );
}

export async function fetchSignupApprovers() {
  return withFallback(
    async () => {
      const { data } = await api.get("/auth/signup-approvers");
      return data;
    },
    async () => {
      const store = loadStore();
      const approvers = store.employees
        .filter((employee) => ["manager", "hr"].includes(employee.role) && employee.status === "active")
        .map((employee) => ({
          employee_id: employee.id,
          full_name: employee.full_name,
          role: employee.role,
        }));
      return { success: true, approvers };
    }
  );
}

export async function loginUser(payload) {
  return withFallback(
    async () => {
      const { data } = await api.post("/auth/login", payload);
      return data;
    },
    async () => {
      const store = loadStore();
      const user = store.users.find(
        (item) =>
          item.email.toLowerCase() === payload.email.toLowerCase() &&
          item.password === payload.password
      );
      if (!user) {
        const error = new Error("Invalid credentials");
        error.response = { data: { message: "Invalid credentials" }, status: 401 };
        throw error;
      }
      return {
        success: true,
        token: getMockToken(user),
        accessToken: getMockToken(user),
        refreshToken: `mock-refresh-token-${user.id}`,
        sessionExpiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        user: clone(user),
      };
    }
  );
}

export async function signupUser(payload) {
  return withFallback(
    async () => {
      const { data } = await api.post("/auth/signup", payload);
      return data;
    },
    async () => {
      const store = loadStore();
      const existing = store.users.find(
        (item) => item.email.toLowerCase() === String(payload.email || "").toLowerCase()
      );
      if (existing) {
        const error = new Error("Email is already registered");
        error.response = { data: { message: "Email is already registered" }, status: 400 };
        throw error;
      }

      const employeeId = store.nextIds.employee++;
      const userId = store.nextIds.user++;
      const employee = {
        id: employeeId,
        employee_code: `EMP-${new Date().getFullYear()}-${String(employeeId).padStart(4, "0")}`,
        full_name: payload.full_name,
        email: payload.email,
        role: payload.role || "employee",
        department: payload.department || "General",
        designation: payload.designation || "Associate",
        monthly_salary: Number(payload.monthly_salary || 0),
        join_date: payload.join_date || new Date().toISOString().slice(0, 10),
        status: "active",
        manager_id: Number(payload.manager_id || 2),
        manager_name: "Asha Manager",
        leave_balance: { total_days: 24, used_days: 0, available_days: 24 },
      };
      store.employees.push(employee);
      store.users.push({
        id: userId,
        employee_id: employeeId,
        full_name: employee.full_name,
        email: employee.email,
        password: payload.password,
        role: employee.role,
        department: employee.department,
        designation: employee.designation,
        monthly_salary: employee.monthly_salary,
        join_date: employee.join_date,
        status: employee.status,
        manager_id: employee.manager_id,
        leave_balance: { total_days: 24, used_days: 0, available_days: 24 },
      });
      saveStore(store);
      return {
        success: true,
        message: "Account created successfully. Please sign in.",
        account: {
          email: payload.email,
          full_name: payload.full_name,
          role: payload.role || "employee",
        },
      };
    }
  );
}

export async function fetchDashboardSummary(token) {
  return withFallback(
    async () => {
      const { data } = await api.get("/dashboard/summary", authConfig(token));
      return data;
    },
    async () => {
      const store = loadStore();
      const user = getUserFromToken(token, store);
      return { success: true, summary: buildSummary(user, store) };
    }
  );
}

export async function fetchEmployees(token, filters = {}) {
  return withFallback(
    async () => {
      const { data } = await api.get("/employees", {
        ...authConfig(token),
        params: filters,
      });
      return data;
    },
    async () => {
      const store = loadStore();
      const search = String(filters.search || "").toLowerCase();
      const status = String(filters.status || "").toLowerCase();
      const department = String(filters.department || "").toLowerCase();
      const employees = store.employees.filter((employee) => {
        const matchesSearch =
          !search ||
          [employee.employee_code, employee.full_name, employee.email, employee.department, employee.designation]
            .join(" ")
            .toLowerCase()
            .includes(search);
        const matchesStatus = !status || String(employee.status || "").toLowerCase() === status;
        const matchesDepartment = !department || String(employee.department || "").toLowerCase() === department;
        return matchesSearch && matchesStatus && matchesDepartment;
      });
      return { success: true, employees: clone(employees) };
    }
  );
}

export async function updateEmployee(token, id, payload) {
  return withFallback(
    async () => {
      const { data } = await api.patch(`/employees/${id}`, payload, authConfig(token));
      return data;
    },
    async () => {
      const store = loadStore();
      const employee = store.employees.find((item) => item.id === Number(id));
      if (!employee) {
        const error = new Error("Employee not found");
        error.response = { data: { message: "Employee not found" }, status: 404 };
        throw error;
      }
      Object.assign(employee, payload);
      saveStore(store);
      return { success: true, employee: clone(employee) };
    }
  );
}

export async function deactivateEmployee(token, id) {
  return withFallback(
    async () => {
      const { data } = await api.patch(`/employees/${id}/deactivate`, {}, authConfig(token));
      return data;
    },
    async () => {
      const store = loadStore();
      const employee = store.employees.find((item) => item.id === Number(id));
      if (!employee) {
        const error = new Error("Employee not found");
        error.response = { data: { message: "Employee not found" }, status: 404 };
        throw error;
      }
      employee.status = "inactive";
      saveStore(store);
      return { success: true, employee: clone(employee) };
    }
  );
}

export async function submitEmployee(token, payload) {
  return withFallback(
    async () => {
      const { data } = await api.post("/employees", payload, authConfig(token));
      return data;
    },
    async () => {
      const store = loadStore();
      const employeeId = store.nextIds.employee++;
      const userId = store.nextIds.user++;
      const managerName =
        store.employees.find((item) => item.id === Number(payload.manager_id))?.full_name ||
        "Unassigned";
      const leave_balance = { total_days: 24, used_days: 0, available_days: 24 };
      const employee = {
        id: employeeId,
        employee_code: `EMP${String(employeeId).padStart(3, "0")}`,
        full_name: payload.full_name,
        email: payload.email,
        role: payload.role,
        department: payload.department,
        designation: payload.designation,
        monthly_salary: Number(payload.monthly_salary),
        join_date: payload.join_date,
        status: "active",
        manager_id: Number(payload.manager_id || 2),
        manager_name: managerName,
        leave_balance,
      };
      store.employees.push(employee);
      store.users.push({
        id: userId,
        employee_id: employeeId,
        full_name: payload.full_name,
        email: payload.email,
        password: payload.password,
        role: payload.role,
        department: payload.department,
        designation: payload.designation,
        monthly_salary: Number(payload.monthly_salary),
        join_date: payload.join_date,
        status: "active",
        manager_id: Number(payload.manager_id || 2),
        leave_balance,
      });
      createNotification(store, {
        employee_id: employeeId,
        role: payload.role,
        title: "Employee account created",
        message: "Your employee account is ready. Please sign in to continue.",
        type: "onboarding",
      });
      saveStore(store);
      return { success: true, employee };
    }
  );
}

export async function fetchLeaves(token) {
  return withFallback(
    async () => {
      const { data } = await api.get("/leaves", authConfig(token));
      return data;
    },
    async () => {
      const store = loadStore();
      const user = getUserFromToken(token, store);
      const leaves =
        user.role === "employee"
          ? store.leaves.filter((leave) => leave.employee_id === user.employee_id)
          : user.role === "manager"
            ? store.leaves.filter(
                (leave) =>
                  leave.manager_id === user.employee_id ||
                  leave.employee_id === user.employee_id
              )
            : store.leaves;
      return { success: true, leaves: clone(leaves) };
    }
  );
}

export async function submitLeave(token, payload) {
  return withFallback(
    async () => {
      const { data } = await api.post("/leaves", payload, authConfig(token));
      return data;
    },
    async () => {
      const store = loadStore();
      const user = getUserFromToken(token, store);
      const requestedDays = Number(payload.days);
      const managerId =
        String(payload.approver_target || "manager") === "hr"
          ? 3
          : Number(user.manager_id || 3);
      if (requestedDays > Number(user.leave_balance.available_days)) {
        const error = new Error("Requested days exceed available leave balance.");
        error.response = {
          data: { message: "Requested days exceed available leave balance." },
          status: 400,
        };
        throw error;
      }
      const manager = store.employees.find((item) => item.id === managerId);
      const leave = {
        id: store.nextIds.leave++,
        employee_id: user.employee_id,
        employee_name: user.full_name,
        manager_id: managerId,
        manager_name: manager?.full_name || "Assigned manager",
        leave_type: payload.leave_type,
        start_date: payload.start_date,
        end_date: payload.end_date,
        days: requestedDays,
        reason: payload.reason,
        status: "pending",
        validation_status: "validated",
        manager_comment: "",
        created_at: new Date().toISOString(),
      };
      store.leaves.unshift(leave);
      createNotification(store, {
        employee_id: user.employee_id,
        role: "employee",
        title: "Leave request submitted",
        message: `Your request was routed to ${leave.manager_name}.`,
        type: "leave_request",
      });
      createNotification(store, {
        employee_id: leave.manager_id,
        role: "manager",
        title: "Pending leave approval",
        message: `${leave.employee_name} submitted ${leave.days} day(s) of leave.`,
        type: "approval_queue",
      });
      saveStore(store);
      return { success: true, leave };
    }
  );
}

export async function updateLeaveStatus(token, id, payload) {
  return withFallback(
    async () => {
      const { data } = await api.patch(
        `/leaves/${id}/status`,
        payload,
        authConfig(token)
      );
      return data;
    },
    async () => {
      const store = loadStore();
      const actor = getUserFromToken(token, store);
      const leave = store.leaves.find((item) => item.id === Number(id));
      if (!leave) {
        const error = new Error("Leave request not found");
        error.response = { data: { message: "Leave request not found" }, status: 404 };
        throw error;
      }
      if (actor.role === "manager" && leave.manager_id !== actor.employee_id) {
        const error = new Error("This leave request is not routed to you.");
        error.response = {
          data: { message: "This leave request is not routed to you." },
          status: 403,
        };
        throw error;
      }
      leave.status = payload.status;
      leave.manager_comment = payload.manager_comment || "";
      if (payload.status === "approved") {
        const employeeUser = store.users.find((item) => item.employee_id === leave.employee_id);
        if (employeeUser) {
          employeeUser.leave_balance.used_days += Number(leave.days);
          employeeUser.leave_balance.available_days = Math.max(
            employeeUser.leave_balance.total_days - employeeUser.leave_balance.used_days,
            0
          );
        }
        syncEmployeeBalances(store);
      }
      createNotification(store, {
        employee_id: leave.employee_id,
        role: "employee",
        title: `Leave request ${payload.status}`,
        message: `Your leave request was ${payload.status} by ${actor.full_name}.`,
        type: "leave_status",
      });
      saveStore(store);
      return { success: true, leave: clone(leave) };
    }
  );
}

export async function cancelLeave(token, id) {
  return withFallback(
    async () => {
      const { data } = await api.patch(`/leaves/${id}/cancel`, {}, authConfig(token));
      return data;
    },
    async () => {
      const store = loadStore();
      const leave = store.leaves.find((item) => item.id === Number(id));
      if (!leave) {
        const error = new Error("Leave request not found");
        error.response = { data: { message: "Leave request not found" }, status: 404 };
        throw error;
      }
      leave.status = "cancelled";
      saveStore(store);
      return { success: true, leave: clone(leave) };
    }
  );
}

export async function fetchPayrolls(token) {
  return withFallback(
    async () => {
      const { data } = await api.get("/payroll", authConfig(token));
      return data;
    },
    async () => {
      const store = loadStore();
      const user = getUserFromToken(token, store);
      const payrolls =
        user.role === "employee"
          ? store.payrolls.filter((payroll) => payroll.employee_id === user.employee_id)
          : store.payrolls;
      return { success: true, payrolls: clone(payrolls) };
    }
  );
}

export async function fetchPayrollConfig(token) {
  return withFallback(
    async () => {
      const { data } = await api.get("/payroll/config", authConfig(token));
      return data;
    },
    async () => {
      const store = loadStore();
      return { success: true, config: clone(store.payrollConfig) };
    }
  );
}

export async function savePayrollConfig(token, payload) {
  return withFallback(
    async () => {
      const { data } = await api.put("/payroll/config", payload, authConfig(token));
      return data;
    },
    async () => {
      const store = loadStore();
      store.payrollConfig = {
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
        tax_slabs: typeof payload.tax_slabs === "string" ? JSON.parse(payload.tax_slabs) : payload.tax_slabs,
        pay_day: Number(payload.pay_day),
      };
      saveStore(store);
      return { success: true, config: clone(store.payrollConfig) };
    }
  );
}

export async function runPayroll(token, payload) {
  return withFallback(
    async () => {
      const { data } = await api.post("/payroll/run", payload, authConfig(token));
      return data;
    },
    async () => {
      const store = loadStore();
      const config = store.payrollConfig;
      const month = Number(payload.month);
      const year = Number(payload.year);

      for (const employee of store.employees) {
        const basicSalary = Number(employee.monthly_salary);
        const hra = Math.round(basicSalary * Number(config.hra_rate));
        const conveyance = Math.round(Number(config.conveyance || 0));
        const specialAllowance = Math.round(Number(config.special_allowance || config.allowance_fixed || 0));
        const medicalAllowance = Math.round(Number(config.medical_allowance || 0));
        const grossSalary = basicSalary + hra + conveyance + specialAllowance + medicalAllowance;
        const pfEmployee = Math.round(basicSalary * Number(config.pf_employee_rate || 0.12));
        const esiEmployee = grossSalary <= 21000 ? Math.round(grossSalary * Number(config.esi_employee_rate || 0.0075)) : 0;
        const professionalTax = Math.round(Number(config.professional_tax || 0));
        const tds = 0;
        const deductions = pfEmployee + esiEmployee + professionalTax + tds;
        const payroll = {
          id: store.nextIds.payroll++,
          employee_id: employee.id,
          employee_name: employee.full_name,
          month,
          year,
          basic_salary: basicSalary,
          hra,
          conveyance,
          special_allowance: specialAllowance,
          medical_allowance: medicalAllowance,
          allowances: conveyance + specialAllowance + medicalAllowance,
          gross_salary: grossSalary,
          working_days: 30,
          lop_days: 0,
          lop_amount: 0,
          pf_employee: pfEmployee,
          pf_employer: Math.round(basicSalary * Number(config.pf_employer_rate || 0.1336)),
          esi_employee: esiEmployee,
          esi_employer: grossSalary <= 21000 ? Math.round(grossSalary * Number(config.esi_employer_rate || 0.0325)) : 0,
          tds,
          professional_tax: professionalTax,
          deductions,
          net_salary: grossSalary - deductions,
          annualized_income: (grossSalary - deductions) * 12,
          generated_at: new Date().toISOString(),
        };
        const existingIndex = store.payrolls.findIndex(
          (item) =>
            item.employee_id === employee.id &&
            item.month === month &&
            item.year === year
        );
        if (existingIndex >= 0) {
          payroll.id = store.payrolls[existingIndex].id;
          store.payrolls[existingIndex] = payroll;
        } else {
          store.payrolls.unshift(payroll);
        }
        createNotification(store, {
          employee_id: employee.id,
          role: "employee",
          title: "Payslip generated",
          message: `Payroll is ready for ${month}/${year}.`,
          type: "payroll",
        });
      }

      saveStore(store);
      return { success: true, payrolls: clone(store.payrolls) };
    }
  );
}

export async function fetchPayslip(token, id) {
  return withFallback(
    async () => {
      const { data } = await api.get(`/payroll/${id}/payslip`, authConfig(token));
      return data;
    },
    async () => {
      const store = loadStore();
      const payslip = store.payrolls.find((item) => item.id === Number(id));
      if (!payslip) {
        const error = new Error("Payslip not found");
        error.response = { data: { message: "Payslip not found" }, status: 404 };
        throw error;
      }
      return {
        success: true,
        payslip: {
          ...clone(payslip),
          company_name: "PeopleFirst Systems",
          generated_for: payslip.employee_name,
        },
      };
    }
  );
}

export async function sendTestEmail(token, payload) {
  return withFallback(
    async () => {
      const { data } = await api.post(
        "/notifications/test-email",
        payload,
        authConfig(token)
      );
      return data;
    },
    async () => {
      const store = loadStore();
      const user = getUserFromToken(token, store);
      createNotification(store, {
        employee_id: user.employee_id,
        role: user.role,
        title: "Email preview saved",
        message: `Preview prepared for ${payload.to} with subject "${payload.subject}".`,
        type: "email_preview",
      });
      saveStore(store);
      return {
        success: true,
        message: "Email preview saved. SMTP is not configured yet, so no real email was sent.",
      };
    }
  );
}

export async function fetchNotifications(token) {
  return withFallback(
    async () => {
      const { data } = await api.get("/notifications", authConfig(token));
      return data;
    },
    async () => {
      const store = loadStore();
      const user = getUserFromToken(token, store);
      return { success: true, notifications: clone(getMockNotifications(user, store)) };
    }
  );
}

export async function fetchReports(token, query = {}) {
  return withFallback(
    async () => {
      const { data } = await api.get("/reports", { ...authConfig(token), params: query });
      return data;
    },
    async () => ({
      success: true,
      reports: {
        type: query.type || "payroll-summary",
        format: query.format || "csv",
        count: 0,
        rows: [],
        csv: "",
      },
    })
  );
}

export async function exportReport(token, query = {}) {
  return withFallback(
    async () => {
      const { data } = await api.get("/reports/export", { ...authConfig(token), params: query });
      return data;
    },
    async () => ({ success: true, report: { rows: [], csv: "" } })
  );
}

export async function logoutUser(token, refreshToken) {
  return withFallback(
    async () => {
      const { data } = await api.post("/auth/logout", { refreshToken }, authConfig(token));
      return data;
    },
    async () => ({ success: true, message: "Signed out successfully" })
  );
}

export async function forgotPassword(payload) {
  const { data } = await api.post("/auth/forgot-password", payload);
  return data;
}

export async function resetPassword(payload) {
  const { data } = await api.post("/auth/reset-password", payload);
  return data;
}
