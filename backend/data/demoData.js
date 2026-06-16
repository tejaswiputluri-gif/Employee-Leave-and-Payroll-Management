import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const demoStorePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "demoStore.runtime.json");

const passwordHash = bcrypt.hashSync("Password@123", 10);

function createDemoStore() {
  return {
  users: [
    {
      id: 1,
      employee_id: 1,
      full_name: "Asha Manager",
      email: "manager@company.com",
      password_hash: passwordHash,
      role: "manager",
      department: "Operations",
      designation: "Operations Manager",
      monthly_salary: 85000,
      join_date: "2022-02-15",
      status: "active",
      manager_id: 1,
    },
    {
      id: 2,
      employee_id: 2,
      full_name: "Ravi Employee",
      email: "employee@company.com",
      password_hash: passwordHash,
      role: "employee",
      department: "Engineering",
      designation: "Software Engineer",
      monthly_salary: 65000,
      join_date: "2023-04-01",
      status: "active",
      manager_id: 1,
    },
    {
      id: 3,
      employee_id: 3,
      full_name: "Neha HR",
      email: "hr@company.com",
      password_hash: passwordHash,
      role: "hr",
      department: "Human Resources",
      designation: "HR Executive",
      monthly_salary: 72000,
      join_date: "2021-09-10",
      status: "active",
      manager_id: 3,
    },
  ],
  employees: [
    {
      id: 1,
      employee_code: "EMP001",
      full_name: "Asha Manager",
      email: "manager@company.com",
      role: "manager",
      department: "Operations",
      designation: "Operations Manager",
      monthly_salary: 85000,
      join_date: "2022-02-15",
      status: "active",
      manager_id: 1,
    },
    {
      id: 2,
      employee_code: "EMP002",
      full_name: "Ravi Employee",
      email: "employee@company.com",
      role: "employee",
      department: "Engineering",
      designation: "Software Engineer",
      monthly_salary: 65000,
      join_date: "2023-04-01",
      status: "active",
      manager_id: 1,
    },
    {
      id: 3,
      employee_code: "EMP003",
      full_name: "Neha HR",
      email: "hr@company.com",
      role: "hr",
      department: "Human Resources",
      designation: "HR Executive",
      monthly_salary: 72000,
      join_date: "2021-09-10",
      status: "active",
      manager_id: 3,
    },
  ],
  leaveBalances: [
    { employee_id: 1, total_days: 24, used_days: 2, available_days: 22 },
    { employee_id: 2, total_days: 24, used_days: 0, available_days: 24 },
    { employee_id: 3, total_days: 24, used_days: 1, available_days: 23 },
  ],
  leaves: [
    {
      id: 1,
      employee_id: 2,
      employee_name: "Ravi Employee",
      manager_id: 1,
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
    {
      id: 2,
      employee_id: 1,
      employee_name: "Asha Manager",
      manager_id: 3,
      manager_name: "Neha HR",
      leave_type: "Sick",
      start_date: "2026-03-14",
      end_date: "2026-03-15",
      days: 2,
      reason: "Recovery",
      status: "approved",
      validation_status: "validated",
      manager_comment: "Take care",
      created_at: "2026-03-10T08:00:00.000Z",
    },
  ],
  payrolls: [
    {
      id: 1,
      employee_id: 2,
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
    {
      id: 2,
      employee_id: 1,
      employee_name: "Asha Manager",
      month: 3,
      year: 2026,
      basic_salary: 85000,
      hra: 17000,
      allowances: 5000,
      deductions: 4250,
      net_salary: 102750,
      generated_at: "2026-03-31T15:00:00.000Z",
    },
  ],
  notifications: [
    {
      id: 1,
      employee_id: 3,
      role: "hr",
      title: "Payroll control ready",
      message: "Review payroll configuration before running this month's salary process.",
      type: "payroll_config",
      is_read: false,
      created_at: "2026-04-01T09:00:00.000Z",
    },
    {
      id: 2,
      employee_id: 2,
      role: "employee",
      title: "Leave request submitted",
      message: "Your leave request was routed to Asha Manager for approval.",
      type: "leave_request",
      is_read: false,
      created_at: "2026-04-02T09:35:00.000Z",
    },
    {
      id: 3,
      employee_id: 1,
      role: "manager",
      title: "Pending leave approval",
      message: "Ravi Employee has submitted a leave request for 3 day(s).",
      type: "approval_queue",
      is_read: false,
      created_at: "2026-04-02T09:35:00.000Z",
    },
  ],
  bankAccountChangeRequests: [],
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
  leavePolicy: {
    leave_types: ["Casual", "Sick", "Earned"],
    entitlements_by_category: {
      General: 24,
      Contract: 12,
    },
    holidays: [],
    carry_forward_limit: 10,
    max_entitlement_per_type: {
      Casual: 12,
      Sick: 12,
      Earned: 18,
    },
  },
  authState: {},
  auditLogs: [],
  nextIds: {
    employee: 4,
    leave: 3,
    payroll: 3,
    user: 4,
    notification: 4,
    auditLog: 1,
    bankAccountChangeRequest: 1,
  },
  };
}

export const demoStore = createDemoStore();

function loadPersistedDemoStore() {
  if (!fs.existsSync(demoStorePath)) {
    return;
  }

  try {
    const persistedStore = JSON.parse(fs.readFileSync(demoStorePath, "utf8"));
    Object.assign(demoStore, persistedStore);
  } catch {
    // Ignore corrupted demo persistence files and fall back to defaults.
  }
}

export function persistDemoStore() {
  fs.writeFileSync(demoStorePath, JSON.stringify(demoStore, null, 2));
}

loadPersistedDemoStore();
