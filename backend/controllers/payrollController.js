import {
  getPayrollById,
  getPayrollConfig,
  getPayrolls,
  runPayroll,
  updatePayrollConfig,
} from "../models/repository.js";

export async function listPayrolls(req, res, next) {
  try {
    const payrolls = await getPayrolls(req.user);
    res.json({ success: true, payrolls });
  } catch (error) {
    next(error);
  }
}

export async function generatePayroll(req, res, next) {
  try {
    const { month, year } = req.body;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and year are required",
      });
    }

    const payrolls = await runPayroll(month, year, {
      allowRevision: Boolean(req.body.allow_revision),
    });
    res.json({
      success: true,
      message: req.body.allow_revision
        ? "Revision payroll processed successfully"
        : "Payroll processed successfully",
      payrolls,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPayslip(req, res, next) {
  try {
    const payroll = await getPayrollById(req.params.id, req.user);

    if (!payroll) {
      return res.status(404).json({
        success: false,
        message: "Payslip not found",
      });
    }

    res.json({
      success: true,
      payslip: {
        ...payroll,
        company_name: "PeopleFirst Systems",
        generated_for: payroll.employee_name,
        password_hint: "DOB in DDMMYYYY",
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function fetchPayrollConfig(_req, res, next) {
  try {
    const config = await getPayrollConfig();
    res.json({ success: true, config });
  } catch (error) {
    next(error);
  }
}

export async function savePayrollConfig(req, res, next) {
  try {
    const config = await updatePayrollConfig(req.body);
    res.json({
      success: true,
      message: "Payroll configuration updated",
      config,
    });
  } catch (error) {
    next(error);
  }
}
