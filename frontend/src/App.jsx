import { useEffect, useState } from "react";
import {
  cancelLeave,
  deactivateEmployee,
  fetchDashboardSummary,
  fetchEmployees,
  fetchLeaves,
  fetchReports,
  fetchNotifications,
  fetchPayrollConfig,
  fetchPayrolls,
  fetchPayslip,
  fetchSignupApprovers,
  forgotPassword,
  logoutUser,
  loginUser,
  runPayroll,
  resetPassword,
  savePayrollConfig,
  sendTestEmail,
  submitEmployee,
  submitLeave,
  updateEmployee,
  updateLeaveStatus,
  setAuthTokens,
  signupUser,
  clearAuthTokens,
} from "./services/api";

const employeeTemplate = {
  full_name: "",
  email: "",
  role: "employee",
  manager_id: "",
  dob: "",
  employee_category: "General",
  department: "",
  designation: "",
  monthly_salary: "",
  pan: "",
  aadhaar: "",
  esi_no: "",
  pf_uan: "",
  bank_account_details: "",
  join_date: "",
  password: "",
};

const leaveTemplate = {
  leave_type: "Casual",
  start_date: "",
  end_date: "",
  days: "",
  is_half_day: false,
  approver_target: "manager",
  reason: "",
};

const emailTemplate = {
  to: "",
  subject: "",
  message: "",
};

const payrollConfigTemplate = {
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
  tax_slabs: JSON.stringify(
    [
      { min: 0, max: 300000, rate: 0 },
      { min: 300000, max: 600000, rate: 0.05 },
      { min: 600000, max: 900000, rate: 0.1 },
      { min: 900000, max: 1200000, rate: 0.15 },
      { min: 1200000, max: null, rate: 0.2 },
    ],
    null,
    2
  ),
  pay_day: 30,
};

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function payrollLabel(month, year) {
  return new Date(Number(year), Number(month) - 1, 1).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function normalizePayslipData(raw) {
  if (!raw) {
    return null;
  }

  const basic = Number(raw.basic_salary || 0);
  const hra = Number(raw.hra || 0);
  const allowances =
    Number(raw.allowances || 0) ||
    Number(raw.conveyance || 0) + Number(raw.special_allowance || 0) + Number(raw.medical_allowance || 0);
  const gross = Number(raw.gross_salary || 0) || basic + hra + allowances;
  const pf = Number(raw.pf_employee || 0);
  const esi = Number(raw.esi_employee || 0);
  const lop = Number(raw.lop_amount || 0);
  const tds = Number(raw.tds || 0);
  const professionalTax = Number(raw.professional_tax || 0);
  const deductions = Number(raw.deductions || 0) || pf + esi + lop + tds + professionalTax;
  const netSalary = Number(raw.net_salary || 0) || gross - deductions;

  return {
    ...raw,
    basic_salary: basic,
    hra,
    allowances,
    gross_salary: gross,
    pf_employee: pf,
    esi_employee: esi,
    lop_amount: lop,
    tds,
    professional_tax: professionalTax,
    deductions,
    net_salary: netSalary,
  };
}

function getRoleInstructions(role) {
  if (role === "hr") {
    return [
      "Open Employees to add staff members and create their login accounts.",
      "Open Leaves to review requests and keep approvals moving.",
      "Open Payroll to run salary processing and preview payslips.",
      "Open Notifications to test email messages before SMTP is enabled.",
    ];
  }

  if (role === "manager") {
    return [
      "Start in Leaves to approve or reject team requests.",
      "Use Employees to review staff details in your workspace.",
      "Open Payroll to view generated salary records and payslips.",
      "Use Overview to monitor pending work at a glance.",
    ];
  }

  return [
    "Start in Leaves to submit a new leave request.",
    "Open Payroll to view your salary records and payslip preview.",
    "Use Overview to track your approved leaves and latest salary snapshot.",
    "Use the top tabs anytime to move between your self-service pages.",
  ];
}

function getRoleDashboardCards(role, data) {
  if (role === "hr") {
    return [
      {
        title: "Pending Leave Reviews",
        value: data.pendingLeaves,
        detail: "Approve or reject requests from the Leaves tab.",
        tab: "leaves",
      },
      {
        title: "Payroll Runs",
        value: data.payrolls,
        detail: "Run payroll and manage salary configuration.",
        tab: "payroll",
      },
      {
        title: "Reports",
        value: data.reports,
        detail: "Generate payroll, PF, ESI, and leave reports.",
        tab: "reports",
      },
      {
        title: "Employees",
        value: data.employees,
        detail: "Create employees, imports, and bank updates.",
        tab: "employees",
      },
    ];
  }

  if (role === "manager") {
    return [
      {
        title: "My Pending Leaves",
        value: data.pendingLeaves,
        detail: "Review team leave requests routed to you.",
        tab: "leaves",
      },
      {
        title: "Team Leaves",
        value: data.teamLeaves,
        detail: "Approve or reject the requests assigned to your team.",
        tab: "leaves",
      },
      {
        title: "Payroll Records",
        value: data.payrolls,
        detail: "Open payroll to view your team salary slips.",
        tab: "payroll",
      },
      {
        title: "Team Members",
        value: data.employees,
        detail: "Check employee details and leave balances.",
        tab: "employees",
      },
    ];
  }

  return [
    {
      title: "My Leave Balance",
      value: data.leaveBalance,
      detail: "Submit leave requests with a chosen approver.",
      tab: "leaves",
    },
    {
      title: "Latest Salary",
      value: data.totalPayroll,
      detail: "Open payroll to preview your payslip.",
      tab: "payroll",
    },
    {
      title: "Notifications",
      value: data.unreadNotifications,
      detail: "Check leave and payroll updates.",
      tab: "notifications",
    },
  ];
}

function App() {
  const [token, setToken] = useState(
    localStorage.getItem("ems_access_token") || localStorage.getItem("ems_token") || ""
  );
  const [refreshToken, setRefreshToken] = useState(
    localStorage.getItem("ems_refresh_token") || ""
  );
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("ems_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [authMode, setAuthMode] = useState("signin");
  const [activeTab, setActiveTab] = useState("overview");
  const [summary, setSummary] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [payslip, setPayslip] = useState(null);
  const [authForm, setAuthForm] = useState({
    email: "",
    password: "",
  });
  const [signupForm, setSignupForm] = useState({
    full_name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "employee",
    manager_id: "",
    department: "General",
    designation: "Associate",
  });
  const [employeeForm, setEmployeeForm] = useState(employeeTemplate);
  const [leaveForm, setLeaveForm] = useState(leaveTemplate);
  const [payrollForm, setPayrollForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [emailForm, setEmailForm] = useState(emailTemplate);
  const [payrollConfig, setPayrollConfig] = useState(payrollConfigTemplate);
  const [forgotForm, setForgotForm] = useState({ email: "", otp: "", newPassword: "", confirmPassword: "" });
  const [showForgotPanel, setShowForgotPanel] = useState(false);
  const [reportQuery, setReportQuery] = useState({ type: "payroll-summary", format: "csv" });
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [reportData, setReportData] = useState(null);
  const [signupApprovers, setSignupApprovers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isHr = user?.role === "hr";
  const isManager = user?.role === "manager";
  const isEmployee = user?.role === "employee";
  const roleInstructions = getRoleInstructions(user?.role);
  const previewPayslip = normalizePayslipData(payslip);
  const approverOptions = (isHr || isManager)
    ? employees.filter((employee) => ["manager", "hr"].includes(employee.role))
    : signupApprovers;
  const pendingManagerLeaves = leaves.filter(
    (leave) => leave.status === "pending" && Number(leave.manager_id) === Number(user?.employee_id)
  ).length;
  const teamLeaves = leaves.filter(
    (leave) => Number(leave.manager_id) === Number(user?.employee_id)
  ).length;
  const dashboardCards = getRoleDashboardCards(user?.role, {
    pendingLeaves: pendingManagerLeaves,
    payrolls: payrolls.length,
    employees: employees.length,
    reports: reportData?.count ?? 0,
    teamLeaves,
    leaveBalance: summary?.leaveBalance ?? 0,
    totalPayroll: summary ? money(summary.totalPayroll) : money(0),
    unreadNotifications: summary?.unreadNotifications ?? 0,
  });

  useEffect(() => {
    const handleSessionExpired = () => {
      handleLogout(false, "Session expired. Please log in again.");
    };

    window.addEventListener("ems-session-expired", handleSessionExpired);
    return () => window.removeEventListener("ems-session-expired", handleSessionExpired);
  }, []);

  useEffect(() => {
    if (token && user) {
      loadData();
    }
  }, [token, user]);

  useEffect(() => {
    if (token && user && (isHr || isManager)) {
      loadData();
    }
  }, [employeeSearch]);

  useEffect(() => {
    if (token && user && isHr) {
      loadData();
    }
  }, [reportQuery.type, reportQuery.format]);

  useEffect(() => {
    async function loadSignupApprovers() {
      if (token || authMode !== "signup") {
        return;
      }

      try {
        const response = await fetchSignupApprovers();
        setSignupApprovers(response.approvers || []);
      } catch {
        setSignupApprovers([]);
      }
    }

    loadSignupApprovers();
  }, [token, authMode]);

  useEffect(() => {
    if (signupForm.role !== "employee") {
      return;
    }

    if (signupForm.manager_id) {
      return;
    }

    const defaultApprover = signupApprovers[0];
    if (defaultApprover) {
      setSignupForm((current) => ({ ...current, manager_id: String(defaultApprover.employee_id) }));
    }
  }, [signupApprovers, signupForm.role, signupForm.manager_id]);

  useEffect(() => {
    if (!approverOptions.length) {
      return;
    }

    if (employeeForm.manager_id) {
      return;
    }

    const firstApprover = approverOptions[0];
    if (firstApprover) {
      setEmployeeForm((current) => ({
        ...current,
        manager_id: String(firstApprover.id || firstApprover.employee_id),
      }));
    }
  }, [approverOptions, employeeForm.manager_id]);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const requests = [
        fetchDashboardSummary(token),
        fetchLeaves(token),
        fetchPayrolls(token),
        fetchNotifications(token),
      ];

      if (isHr || isManager) {
        requests.push(fetchEmployees(token, employeeSearch ? { search: employeeSearch } : {}));
      }
      if (isHr) {
        requests.push(fetchPayrollConfig(token));
        requests.push(fetchReports(token, reportQuery));
      }

      const [
        summaryResponse,
        leaveResponse,
        payrollResponse,
        notificationResponse,
        employeeResponse,
        payrollConfigResponse,
        reportResponse,
      ] =
        await Promise.all(requests);

      setSummary(summaryResponse.summary);
      setLeaves(leaveResponse.leaves);
      setPayrolls(payrollResponse.payrolls);
      setNotifications(notificationResponse.notifications || []);
      setEmployees(employeeResponse?.employees || []);
      if (payrollConfigResponse?.config) {
        setPayrollConfig((current) => ({
          ...current,
          ...payrollConfigResponse.config,
          tax_slabs:
            typeof payrollConfigResponse.config.tax_slabs === "string"
              ? payrollConfigResponse.config.tax_slabs
              : JSON.stringify(payrollConfigResponse.config.tax_slabs || current.tax_slabs, null, 2),
        }));
      }
      if (reportResponse?.reports) {
        setReportData(reportResponse.reports);
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to load the dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await loginUser(authForm);
      const accessToken = response.accessToken || response.token;
      const nextRefreshToken = response.refreshToken || "";
      setToken(accessToken);
      setRefreshToken(nextRefreshToken);
      setUser(response.user);
      setAuthTokens(accessToken, nextRefreshToken);
      localStorage.setItem("ems_user", JSON.stringify(response.user));
      setMessage(`Welcome back, ${response.user.full_name}.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (signupForm.password !== signupForm.confirmPassword) {
      setError("Password and confirm password must match.");
      setLoading(false);
      return;
    }

    try {
      const response = await signupUser(signupForm);
      setMessage(response.message || "Account created. Please sign in.");
      setAuthMode("signin");
      setAuthForm({ email: signupForm.email, password: "" });
      setSignupForm({
        full_name: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "employee",
        manager_id: "",
        department: "General",
        designation: "Associate",
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to create account.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout(callServer = true, nextMessage = "Signed out successfully.") {
    if (callServer && token && refreshToken) {
      try {
        await logoutUser(token, refreshToken);
      } catch {
        // Ignore logout failures and clear the client session.
      }
    }
    clearAuthTokens();
    localStorage.removeItem("ems_user");
    setToken("");
    setRefreshToken("");
    setUser(null);
    setSummary(null);
    setEmployees([]);
    setLeaves([]);
    setPayrolls([]);
    setPayslip(null);
    setMessage(nextMessage);
    setError("");
  }

  async function handleCreateEmployee(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await submitEmployee(token, employeeForm);
      setEmployeeForm(employeeTemplate);
      setMessage("Employee created successfully.");
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to create employee.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateLeave(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await submitLeave(token, leaveForm);
      setLeaveForm(leaveTemplate);
      setMessage("Leave request submitted.");
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to submit leave.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLeaveAction(id, status) {
    setLoading(true);
    setError("");

    try {
      await updateLeaveStatus(token, id, {
        status,
        manager_comment:
          status === "approved" ? "Approved by team lead." : "Please revise dates.",
      });
      setMessage(`Leave request ${status}.`);
      await loadData();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to update leave status."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRunPayroll(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await runPayroll(token, payrollForm);
      setMessage(
        `Payroll generated for ${payrollLabel(payrollForm.month, payrollForm.year)}.`
      );
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to run payroll.");
    } finally {
      setLoading(false);
    }
  }

  async function handleViewPayslip(id) {
    setLoading(true);
    setError("");

    try {
      const response = await fetchPayslip(token, id);
      setPayslip(response.payslip);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load payslip.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendEmail(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await sendTestEmail(token, emailForm);
      setEmailForm(emailTemplate);
      setMessage(response.message);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to send email.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(event) {
    event.preventDefault();
    const email = forgotForm.email.trim();

    if (!email) {
      setError("Enter your registered email before requesting OTP.");
      setMessage("");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await forgotPassword({ email });
      setMessage(response.message + (response.previewOtp ? ` Preview OTP: ${response.previewOtp}` : ""));
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to request password reset.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault();

    const email = forgotForm.email.trim();
    const otp = forgotForm.otp.trim();

    if (!email) {
      setError("Enter your registered email first.");
      setMessage("");
      return;
    }

    if (!otp) {
      setError("Enter the OTP sent to your email.");
      setMessage("");
      return;
    }

    if (!forgotForm.newPassword || !forgotForm.confirmPassword) {
      setError("Enter and confirm your new password.");
      setMessage("");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    if (forgotForm.newPassword !== forgotForm.confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const response = await resetPassword({
        email,
        otp,
        newPassword: forgotForm.newPassword,
      });
      setMessage(response.message);
      setAuthMode("signin");
      setAuthForm((current) => ({ ...current, email, password: "" }));
      setShowForgotPanel(false);
      setForgotForm({ email: "", otp: "", newPassword: "", confirmPassword: "" });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSavePayrollConfig(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await savePayrollConfig(token, payrollConfig);
      setMessage("Payroll configuration updated.");
      await loadData();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to update payroll config."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDeactivateEmployee(id) {
    setLoading(true);
    setError("");

    try {
      await deactivateEmployee(token, id);
      setMessage("Employee deactivated.");
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to deactivate employee.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelLeaveRequest(id) {
    setLoading(true);
    setError("");

    try {
      await cancelLeave(token, id);
      setMessage("Leave request cancelled.");
      await loadData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to cancel leave request.");
    } finally {
      setLoading(false);
    }
  }

  async function handleExportReport() {
    setLoading(true);
    setError("");

    try {
      const response = await fetchReports(token, reportQuery);
      const report = response.reports;
      setReportData(report);
      setMessage(`Loaded ${report?.count ?? 0} report row(s).`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load reports.");
    } finally {
      setLoading(false);
    }
  }

  const tabs = [
    { id: "overview", label: "Overview", show: true },
    { id: "employees", label: "Employees", show: isHr || isManager },
    { id: "leaves", label: "Leaves", show: true },
    { id: "payroll", label: "Payroll", show: true },
    { id: "reports", label: "Reports", show: isHr },
    { id: "notifications", label: "Notifications", show: true },
  ].filter((tab) => tab.show);

  if (!user || !token) {
    return (
      <main className="shell auth-shell">
          <section className="panel login-panel">
            <p className="eyebrow">Employee Leave And Payroll System</p>
            <h2>{authMode === "signin" ? "Sign In" : "Sign Up"}</h2>
            <p className="muted form-note">
              {authMode === "signin"
                ? "Use your registered email and password to open the dashboard."
                : "Create a new account with your own email and password."}
            </p>
            <div className="tabs auth-tabs">
              <button
                type="button"
                className={authMode === "signin" ? "tab active" : "tab"}
                onClick={() => setAuthMode("signin")}
              >
                Sign In
              </button>
              <button
                type="button"
                className={authMode === "signup" ? "tab active" : "tab"}
                onClick={() => setAuthMode("signup")}
              >
                Sign Up
              </button>
            </div>

            {authMode === "signin" ? (
              <form className="form-grid single-col" onSubmit={handleLogin}>
                <label className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={authForm.email}
                    onChange={(event) =>
                      setAuthForm((current) => ({ ...current, email: event.target.value }))
                    }
                    required
                  />
                </label>
                <label className="field">
                  <span>Password</span>
                  <input
                    type="password"
                    value={authForm.password}
                    onChange={(event) =>
                      setAuthForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <button className="primary-button" type="submit" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </form>
            ) : (
              <form className="form-grid single-col" onSubmit={handleSignup}>
                <label className="field">
                  <span>Full Name</span>
                  <input type="text" value={signupForm.full_name} onChange={(event) => setSignupForm((current) => ({ ...current, full_name: event.target.value }))} required />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input type="email" value={signupForm.email} onChange={(event) => setSignupForm((current) => ({ ...current, email: event.target.value }))} required />
                </label>
                <label className="field">
                  <span>Password</span>
                  <input type="password" value={signupForm.password} onChange={(event) => setSignupForm((current) => ({ ...current, password: event.target.value }))} required />
                </label>
                <label className="field">
                  <span>Confirm Password</span>
                  <input type="password" value={signupForm.confirmPassword} onChange={(event) => setSignupForm((current) => ({ ...current, confirmPassword: event.target.value }))} required />
                </label>
                <label className="field">
                  <span>Role</span>
                  <select value={signupForm.role} onChange={(event) => setSignupForm((current) => ({ ...current, role: event.target.value }))}>
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="hr">HR</option>
                  </select>
                </label>
                {signupForm.role === "employee" ? (
                  <label className="field">
                    <span>Reporting Manager</span>
                    <select value={signupForm.manager_id} onChange={(event) => setSignupForm((current) => ({ ...current, manager_id: event.target.value }))}>
                      {signupApprovers.length === 0 ? (
                        <option value="">No approver available</option>
                      ) : signupApprovers.map((approver) => (
                        <option key={approver.employee_id} value={approver.employee_id}>
                          {approver.full_name} ({approver.role.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <button className="primary-button" type="submit" disabled={loading}>
                  {loading ? "Creating account..." : "Create Account"}
                </button>
              </form>
            )}

            <div className="inline-help">
              <button
                className="small-button"
                type="button"
                onClick={() => {
                  setShowForgotPanel((current) => !current);
                  setError("");
                  setMessage("");
                  setForgotForm((current) => ({
                    ...current,
                    email: current.email || authForm.email || signupForm.email || "",
                  }));
                }}
              >
                {showForgotPanel ? "Close Forgot Password" : "Forgot Password?"}
              </button>

              {showForgotPanel ? (
                <div className="stack compact-stack">
                  <strong>Forgot Password</strong>
                  <label className="field">
                    <span>Registered email</span>
                    <input
                      type="email"
                      value={forgotForm.email}
                      onChange={(event) => setForgotForm((current) => ({ ...current, email: event.target.value }))}
                      placeholder="name@company.com"
                    />
                  </label>
                  <button className="small-button" type="button" onClick={handleForgotPassword} disabled={loading}>
                    Send OTP
                  </button>
                  <label className="field">
                    <span>OTP</span>
                    <input type="text" value={forgotForm.otp} onChange={(event) => setForgotForm((current) => ({ ...current, otp: event.target.value }))} placeholder="6-digit code" />
                  </label>
                  <label className="field">
                    <span>New Password</span>
                    <input type="password" value={forgotForm.newPassword} onChange={(event) => setForgotForm((current) => ({ ...current, newPassword: event.target.value }))} />
                  </label>
                  <label className="field">
                    <span>Confirm New Password</span>
                    <input type="password" value={forgotForm.confirmPassword} onChange={(event) => setForgotForm((current) => ({ ...current, confirmPassword: event.target.value }))} />
                  </label>
                  <button className="small-button" type="button" onClick={handleResetPassword} disabled={loading}>
                    Reset Password
                  </button>
                </div>
              ) : null}
            </div>

            {error ? <p className="status error">{error}</p> : null}
            {message ? <p className="status success">{message}</p> : null}
          </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">Welcome</p>
          <h1 className="dashboard-title">{user.full_name}</h1>
          <p className="muted">
            {user.designation} in {user.department} as {user.role}
          </p>
        </div>
        <button type="button" className="ghost-button" onClick={handleLogout}>
          Logout
        </button>
      </section>

      <section className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? "tab active" : "tab"}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </section>

      {error ? <p className="status error">{error}</p> : null}
      {message ? <p className="status success">{message}</p> : null}

      {activeTab === "overview" && summary ? (
        <section className="stats">
          <article className="panel stat"><span>Employees</span><strong>{summary.employeeCount}</strong></article>
          <article className="panel stat"><span>Pending Leaves</span><strong>{summary.pendingLeaves}</strong></article>
          <article className="panel stat"><span>{isEmployee ? "Leave Balance" : "Approved Leaves"}</span><strong>{isEmployee ? summary.leaveBalance : summary.approvedLeaves}</strong></article>
          <article className="panel stat"><span>{isEmployee ? "Latest Salary" : "Payroll Total"}</span><strong>{money(summary.totalPayroll)}</strong></article>
        </section>
      ) : null}

      {activeTab === "overview" && summary ? (
        <section className="panel guide-panel">
          <p className="eyebrow">How To Use This App</p>
          <h2>{isHr ? "HR Control Center" : isManager ? "Manager Control Center" : "Your next steps"}</h2>
          <div className="dashboard-cards">
            {dashboardCards.map((card) => (
              <button type="button" className="dashboard-card" key={card.title} onClick={() => setActiveTab(card.tab)}>
                <span>{card.title}</span>
                <strong>{card.value}</strong>
                <p>{card.detail}</p>
              </button>
            ))}
          </div>
          <div className="guide-grid">
            {roleInstructions.map((instruction) => (
              <div className="guide-step" key={instruction}>
                <strong>Step</strong>
                <p className="muted">{instruction}</p>
              </div>
            ))}
          </div>
          <div className="overview-meta">
            <span>Unread Notifications: {summary.unreadNotifications}</span>
            <span>DFD Flow Active: Validate, Route, Decide, Update Balance</span>
          </div>
        </section>
      ) : null}

      {activeTab === "employees" ? (
        <section className="grid-two">
          <article className="panel">
            <h2>Employee Directory</h2>
            <label className="field search-field">
              <span>Search employees</span>
              <input
                type="search"
                value={employeeSearch}
                onChange={(event) => setEmployeeSearch(event.target.value)}
                placeholder="Search by name, code, email, or department"
              />
            </label>
            <div className="list">
              {employees.map((employee) => (
                <div className="row-card" key={employee.id}>
                  <div>
                    <strong>{employee.full_name}</strong>
                    <p className="muted">{employee.designation} • {employee.department}</p>
                    <p className="muted">
                      Manager: {employee.manager_name || "Unassigned"} • Balance:{" "}
                      {employee.leave_balance?.available_days ?? "-"}
                    </p>
                  </div>
                  <div className="right-text">
                    <span>{employee.employee_code}</span>
                    <span>{money(employee.monthly_salary)}</span>
                    {isHr ? (
                      <button
                        type="button"
                        className="small-button reject"
                        onClick={() => handleDeactivateEmployee(employee.id)}
                      >
                        Deactivate
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </article>

          {isHr ? (
            <article className="panel">
              <h2>Add Employee</h2>
              <form className="form-grid" onSubmit={handleCreateEmployee}>
                {Object.entries(employeeForm).map(([key, value]) => (
                  <label className={key === "password" ? "field wide" : "field"} key={key}>
                    <span>{key.replaceAll("_", " ")}</span>
                    {key === "role" ? (
                      <select
                        value={value}
                        onChange={(event) =>
                          setEmployeeForm((current) => ({
                            ...current,
                            role: event.target.value,
                          }))
                        }
                      >
                        <option value="employee">Employee</option>
                        <option value="manager">Manager</option>
                        <option value="hr">HR</option>
                      </select>
                    ) : key === "manager_id" ? (
                      <select
                        value={value}
                        onChange={(event) =>
                          setEmployeeForm((current) => ({
                            ...current,
                            manager_id: event.target.value,
                          }))
                        }
                      >
                        {approverOptions.length === 0 ? (
                          <option value="">No approver available</option>
                        ) : approverOptions.map((approver) => (
                          <option key={approver.id || approver.employee_id} value={approver.id || approver.employee_id}>
                            {approver.full_name} ({approver.role.toUpperCase()})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={
                          key === "email"
                            ? "email"
                            : key === "password"
                              ? "password"
                              : key.includes("date")
                                ? "date"
                                : key.includes("salary")
                                  ? "number"
                                  : "text"
                        }
                        value={value}
                        onChange={(event) =>
                          setEmployeeForm((current) => ({
                            ...current,
                            [key]: event.target.value,
                          }))
                        }
                        required
                      />
                    )}
                  </label>
                ))}
                <button className="primary-button" type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Create Employee"}
                </button>
              </form>
            </article>
          ) : null}
        </section>
      ) : null}

      {activeTab === "leaves" ? (
        <section className="grid-two">
          <article className="panel">
            <h2>{isEmployee ? "Apply for Leave" : "Leave Requests"}</h2>
            {isEmployee ? (
              <form className="form-grid" onSubmit={handleCreateLeave}>
                <label className="field">
                  <span>Leave Type</span>
                  <select
                    value={leaveForm.leave_type}
                    onChange={(event) =>
                      setLeaveForm((current) => ({
                        ...current,
                        leave_type: event.target.value,
                      }))
                    }
                  >
                    <option value="Casual">Casual</option>
                    <option value="Sick">Sick</option>
                    <option value="Earned">Earned</option>
                  </select>
                </label>
                <label className="field">
                  <span>Start Date</span>
                  <input type="date" value={leaveForm.start_date} onChange={(event) => setLeaveForm((current) => ({ ...current, start_date: event.target.value }))} required />
                </label>
                <label className="field">
                  <span>End Date</span>
                  <input type="date" value={leaveForm.end_date} onChange={(event) => setLeaveForm((current) => ({ ...current, end_date: event.target.value }))} required />
                </label>
                <label className="field">
                  <span>Days</span>
                  <input type="number" min="0.5" step="0.5" value={leaveForm.days} onChange={(event) => setLeaveForm((current) => ({ ...current, days: event.target.value }))} required />
                </label>
                <label className="field">
                  <span>Half Day</span>
                  <select value={leaveForm.is_half_day ? "true" : "false"} onChange={(event) => setLeaveForm((current) => ({ ...current, is_half_day: event.target.value === "true" }))}>
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </label>
                <label className="field">
                  <span>Request Approval From</span>
                  <select value={leaveForm.approver_target} onChange={(event) => setLeaveForm((current) => ({ ...current, approver_target: event.target.value }))}>
                    <option value="manager">Reporting Manager</option>
                    <option value="hr">HR</option>
                  </select>
                </label>
                <label className="field wide">
                  <span>Reason</span>
                  <textarea rows="4" value={leaveForm.reason} onChange={(event) => setLeaveForm((current) => ({ ...current, reason: event.target.value }))} required />
                </label>
                <p className="muted">Manager is the default approver. Choose HR when manager approval is unavailable.</p>
                <button className="primary-button" type="submit" disabled={loading}>
                  {loading ? "Submitting..." : "Submit Leave"}
                </button>
              </form>
            ) : (
              <div className="list">
                {leaves.map((leave) => (
                  <div className="row-card" key={leave.id}>
                    <div>
                      <strong>{leave.employee_name}</strong>
                      <p className="muted">{leave.leave_type} • {leave.days} day(s)</p>
                      <p className="muted">
                        Routed to: {leave.manager_name || "Assigned manager"} • Validation:{" "}
                        {leave.validation_status || "validated"}
                      </p>
                    </div>
                    <div className="actions">
                      <span className={`badge ${leave.status}`}>{leave.status}</span>
                      {leave.status === "pending" ? (
                        <>
                          <button type="button" className="small-button approve" onClick={() => handleLeaveAction(leave.id, "approved")}>Approve</button>
                          <button type="button" className="small-button reject" onClick={() => handleLeaveAction(leave.id, "rejected")}>Reject</button>
                        </>
                      ) : leave.status === "approved" && isEmployee ? (
                        <button type="button" className="small-button" onClick={() => handleCancelLeaveRequest(leave.id)}>Cancel</button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="panel">
            <h2>History</h2>
            <div className="list">
              {leaves.map((leave) => (
                <div className="row-card" key={`${leave.id}-history`}>
                  <div>
                    <strong>{leave.employee_name}</strong>
                    <p className="muted">{leave.start_date} to {leave.end_date}</p>
                    <p className="muted">
                      {leave.manager_comment || "Awaiting reviewer comment"}
                    </p>
                  </div>
                  <span className={`badge ${leave.status}`}>{leave.status}</span>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      {activeTab === "payroll" ? (
        <section className="grid-two">
          <article className="panel">
            <h2>Payroll Records</h2>
            <div className="list">
              {payrolls.map((payroll) => (
                <div className="row-card" key={payroll.id}>
                  <div>
                    <strong>{payroll.employee_name}</strong>
                    <p className="muted">{payrollLabel(payroll.month, payroll.year)}</p>
                  </div>
                  <div className="actions">
                    <span className="badge neutral">{money(payroll.net_salary)}</span>
                    <button type="button" className="small-button" onClick={() => handleViewPayslip(payroll.id)}>Payslip</button>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <h2>{isHr ? "Run Payroll" : "Payslip Preview"}</h2>
            {isHr ? (
              <>
                <form className="form-grid tight" onSubmit={handleRunPayroll}>
                  <label className="field">
                    <span>Month</span>
                    <input type="number" min="1" max="12" value={payrollForm.month} onChange={(event) => setPayrollForm((current) => ({ ...current, month: event.target.value }))} />
                  </label>
                  <label className="field">
                    <span>Year</span>
                    <input type="number" value={payrollForm.year} onChange={(event) => setPayrollForm((current) => ({ ...current, year: event.target.value }))} />
                  </label>
                  <button className="primary-button" type="submit" disabled={loading}>
                    {loading ? "Processing..." : "Run Payroll"}
                  </button>
                </form>

                <form className="form-grid tight" onSubmit={handleSavePayrollConfig}>
                  <label className="field">
                    <span>Basic Pay</span>
                    <input type="number" value={payrollConfig.basic_pay} onChange={(event) => setPayrollConfig((current) => ({ ...current, basic_pay: event.target.value }))} />
                  </label>
                  <label className="field">
                    <span>HRA Rate</span>
                    <input type="number" step="0.01" value={payrollConfig.hra_rate} onChange={(event) => setPayrollConfig((current) => ({ ...current, hra_rate: event.target.value }))} />
                  </label>
                  <label className="field">
                    <span>Conveyance</span>
                    <input type="number" value={payrollConfig.conveyance} onChange={(event) => setPayrollConfig((current) => ({ ...current, conveyance: event.target.value }))} />
                  </label>
                  <label className="field">
                    <span>Special Allowance</span>
                    <input type="number" value={payrollConfig.special_allowance} onChange={(event) => setPayrollConfig((current) => ({ ...current, special_allowance: event.target.value }))} />
                  </label>
                  <label className="field">
                    <span>Medical Allowance</span>
                    <input type="number" value={payrollConfig.medical_allowance} onChange={(event) => setPayrollConfig((current) => ({ ...current, medical_allowance: event.target.value }))} />
                  </label>
                  <label className="field">
                    <span>Allowance Fixed</span>
                    <input type="number" value={payrollConfig.allowance_fixed} onChange={(event) => setPayrollConfig((current) => ({ ...current, allowance_fixed: event.target.value }))} />
                  </label>
                  <label className="field">
                    <span>Deduction Rate</span>
                    <input type="number" step="0.01" value={payrollConfig.deduction_rate} onChange={(event) => setPayrollConfig((current) => ({ ...current, deduction_rate: event.target.value }))} />
                  </label>
                  <label className="field">
                    <span>Professional Tax</span>
                    <input type="number" value={payrollConfig.professional_tax} onChange={(event) => setPayrollConfig((current) => ({ ...current, professional_tax: event.target.value }))} />
                  </label>
                  <label className="field">
                    <span>PF Employee Rate</span>
                    <input type="number" step="0.0001" value={payrollConfig.pf_employee_rate} onChange={(event) => setPayrollConfig((current) => ({ ...current, pf_employee_rate: event.target.value }))} />
                  </label>
                  <label className="field">
                    <span>PF Employer Rate</span>
                    <input type="number" step="0.0001" value={payrollConfig.pf_employer_rate} onChange={(event) => setPayrollConfig((current) => ({ ...current, pf_employer_rate: event.target.value }))} />
                  </label>
                  <label className="field">
                    <span>ESI Employee Rate</span>
                    <input type="number" step="0.0001" value={payrollConfig.esi_employee_rate} onChange={(event) => setPayrollConfig((current) => ({ ...current, esi_employee_rate: event.target.value }))} />
                  </label>
                  <label className="field">
                    <span>ESI Employer Rate</span>
                    <input type="number" step="0.0001" value={payrollConfig.esi_employer_rate} onChange={(event) => setPayrollConfig((current) => ({ ...current, esi_employer_rate: event.target.value }))} />
                  </label>
                  <label className="field wide">
                    <span>Tax Slabs JSON</span>
                    <textarea rows="4" value={payrollConfig.tax_slabs} onChange={(event) => setPayrollConfig((current) => ({ ...current, tax_slabs: event.target.value }))} />
                  </label>
                  <label className="field">
                    <span>Pay Day</span>
                    <input type="number" value={payrollConfig.pay_day} onChange={(event) => setPayrollConfig((current) => ({ ...current, pay_day: event.target.value }))} />
                  </label>
                  <button className="primary-button" type="submit" disabled={loading}>
                    {loading ? "Saving..." : "Save Payroll Config"}
                  </button>
                </form>
              </>
            ) : null}

            {previewPayslip ? (
              <div className="payslip">
                <p className="eyebrow">Payslip</p>
                <h2>{previewPayslip.generated_for}</h2>
                <div className="payslip-grid">
                  <span>Basic</span><strong>{money(previewPayslip.basic_salary)}</strong>
                  <span>HRA</span><strong>{money(previewPayslip.hra)}</strong>
                  <span>Allowances</span><strong>{money(previewPayslip.allowances)}</strong>
                  <span>Gross</span><strong>{money(previewPayslip.gross_salary)}</strong>
                  <span>PF</span><strong>{money(previewPayslip.pf_employee)}</strong>
                  <span>ESI</span><strong>{money(previewPayslip.esi_employee)}</strong>
                  <span>LOP</span><strong>{money(previewPayslip.lop_amount)}</strong>
                  <span>TDS</span><strong>{money(previewPayslip.tds)}</strong>
                  <span>Professional Tax</span><strong>{money(previewPayslip.professional_tax)}</strong>
                  <span>Deductions</span><strong>{money(previewPayslip.deductions)}</strong>
                  <span>Net Salary</span><strong>{money(previewPayslip.net_salary)}</strong>
                </div>
              </div>
            ) : (
              <p className="muted">Select a payroll entry to preview salary details.</p>
            )}
          </article>
        </section>
      ) : null}

      {activeTab === "reports" ? (
        <section className="grid-two">
          <article className="panel">
            <h2>Report Builder</h2>
            <div className="form-grid tight">
              <label className="field">
                <span>Report Type</span>
                <select value={reportQuery.type} onChange={(event) => setReportQuery((current) => ({ ...current, type: event.target.value }))}>
                  <option value="payroll-summary">Monthly Payroll Summary</option>
                  <option value="pf-ecr">PF ECR</option>
                  <option value="esi-challan">ESI Challan</option>
                  <option value="form-16">Form 16</option>
                  <option value="leave-utilisation">Leave Utilisation</option>
                </select>
              </label>
              <label className="field">
                <span>Format</span>
                <select value={reportQuery.format} onChange={(event) => setReportQuery((current) => ({ ...current, format: event.target.value }))}>
                  <option value="csv">CSV</option>
                  <option value="pdf">PDF Preview</option>
                </select>
              </label>
              <button className="primary-button" type="button" onClick={handleExportReport} disabled={loading}>
                {loading ? "Loading..." : "Generate Report"}
              </button>
            </div>
            {reportData ? (
              <div className="payslip">
                <p className="eyebrow">{reportData.type}</p>
                <h2>{reportData.count} rows</h2>
                <p className="muted">Export format: {reportData.format}</p>
                <pre className="report-pre">{reportData.csv || JSON.stringify(reportData.rows, null, 2)}</pre>
              </div>
            ) : (
              <p className="muted">Select a report type and generate the export preview.</p>
            )}
          </article>

          <article className="panel">
            <h2>Supported Reports</h2>
            <ul className="note-list">
              <li>Monthly Payroll Summary</li>
              <li>PF ECR</li>
              <li>ESI Challan</li>
              <li>TDS Form 24Q / Form 16 export preview</li>
              <li>Leave Utilisation by employee and department</li>
            </ul>
          </article>
        </section>
      ) : null}

      {activeTab === "notifications" ? (
        <section className="grid-two">
          <article className="panel">
            <h2>Notification Center</h2>
            {notifications.length > 0 ? (
              <div className="list">
                {notifications.map((notification) => (
                  <div className="row-card" key={notification.id}>
                    <div>
                      <strong>{notification.title}</strong>
                      <p className="muted">{notification.message}</p>
                    </div>
                    <div className="actions">
                      <span className="badge neutral">{notification.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-panel">
                <strong>No notifications yet</strong>
                <p className="muted">
                  New alerts will appear here when leave requests are routed,
                  approvals are recorded, or payroll events are triggered.
                </p>
              </div>
            )}
          </article>

          <article className="panel">
            <h2>{isHr ? "Send Test Email" : "Notification Flow"}</h2>
            {isHr ? (
              <>
                <p className="muted form-note">
                  Use this to verify notification content. If SMTP is not configured,
                  the system will save a safe preview instead of sending a real email.
                </p>
                <form className="form-grid" onSubmit={handleSendEmail}>
                  <label className="field">
                    <span>To</span>
                    <input type="email" value={emailForm.to} onChange={(event) => setEmailForm((current) => ({ ...current, to: event.target.value }))} required />
                  </label>
                  <label className="field">
                    <span>Subject</span>
                    <input type="text" value={emailForm.subject} onChange={(event) => setEmailForm((current) => ({ ...current, subject: event.target.value }))} required />
                  </label>
                  <label className="field wide">
                    <span>Message</span>
                    <textarea rows="5" value={emailForm.message} onChange={(event) => setEmailForm((current) => ({ ...current, message: event.target.value }))} required />
                  </label>
                  <button className="primary-button" type="submit" disabled={loading}>
                    {loading ? "Sending..." : "Send Test Email"}
                  </button>
                </form>
              </>
            ) : (
              <ul className="note-list">
                <li>Leave request validation and routing alerts</li>
                <li>Manager approval and rejection updates</li>
                <li>Payslip generation notifications</li>
                <li>Onboarding and payroll workflow messages</li>
              </ul>
            )}
          </article>
        </section>
      ) : null}
    </main>
  );
}

export default App;
