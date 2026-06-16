import { getEmployees, getLeaves, getPayrolls, getPayrollConfig } from "./repository.js";
import { buildCsv, parseJson } from "./workflowUtils.js";

function buildReportRows(type, context) {
  if (type === "payroll-summary") {
    return context.payrolls.map((payroll) => ({
      employee: payroll.employee_name,
      month: payroll.month,
      year: payroll.year,
      gross: Number(payroll.gross_salary || payroll.basic_salary || 0),
      net: Number(payroll.net_salary || 0),
      pf: Number(payroll.pf_employee || 0),
      esi: Number(payroll.esi_employee || 0),
      tds: Number(payroll.tds || 0),
      lop: Number(payroll.lop_amount || 0),
    }));
  }

  if (type === "pf-ecr") {
    return context.payrolls.map((payroll) => ({
      uan: payroll.employee_id,
      employee: payroll.employee_name,
      employee_pf: Number(payroll.pf_employee || 0),
      employer_pf: Number(payroll.pf_employer || 0),
      month: payroll.month,
      year: payroll.year,
    }));
  }

  if (type === "esi-challan") {
    return context.payrolls.map((payroll) => ({
      employee: payroll.employee_name,
      employee_esi: Number(payroll.esi_employee || 0),
      employer_esi: Number(payroll.esi_employer || 0),
      month: payroll.month,
      year: payroll.year,
    }));
  }

  if (type === "form-16") {
    return context.payrolls.map((payroll) => ({
      employee: payroll.employee_name,
      annual_income: Number(payroll.annualized_income || 0),
      tds: Number(payroll.tds || 0),
      month: payroll.month,
      year: payroll.year,
    }));
  }

  if (type === "leave-utilisation") {
    return context.leaves.map((leave) => ({
      employee: leave.employee_name,
      department: context.employeeById[leave.employee_id]?.department || "",
      status: leave.status,
      leave_type: leave.leave_type,
      days: leave.days,
      start_date: leave.start_date,
      end_date: leave.end_date,
    }));
  }

  return [];
}

export async function listReports(user, query = {}) {
  const type = query.type || "payroll-summary";
  const employees = await getEmployees();
  const leaves = await getLeaves(user.role === "employee" ? user : { role: "hr" });
  const payrolls = await getPayrolls(user.role === "employee" ? user : { role: "hr" });
  const config = await getPayrollConfig();
  const employeeById = Object.fromEntries(employees.map((employee) => [employee.id, employee]));

  const rows = buildReportRows(type, { employees, leaves, payrolls, config, employeeById });
  return {
    type,
    format: query.format || "csv",
    count: rows.length,
    rows,
    config,
  };
}

export async function exportReportData(user, query = {}) {
  const report = await listReports(user, query);
  return {
    ...report,
    csv: buildCsv(report.rows),
    payload: parseJson(query.payload, null),
  };
}
