import {
  createEmployee,
  deactivateEmployee,
  getBankAccountChangeRequests,
  getEmployees,
  importEmployeesFromCsv,
  requestBankAccountChange,
  reviewBankAccountChangeRequest,
  updateEmployee,
} from "../models/repository.js";

export async function listEmployees(_req, res, next) {
  try {
    const employees = await getEmployees(_req.query);
    res.json({ success: true, employees });
  } catch (error) {
    next(error);
  }
}

export async function addEmployee(req, res, next) {
  try {
    const requiredFields = [
      "full_name",
      "email",
      "role",
      "department",
      "designation",
      "monthly_salary",
      "join_date",
      "password",
    ];
    const missingField = requiredFields.find((field) => !req.body[field]);

    if (missingField) {
      return res.status(400).json({
        success: false,
        message: `${missingField} is required`,
      });
    }

    const employee = await createEmployee(req.body);
    res.status(201).json({
      success: true,
      message: "Employee created successfully",
      employee,
    });
  } catch (error) {
    next(error);
  }
}

export async function editEmployee(req, res, next) {
  try {
    const employee = await updateEmployee(req.params.id, req.body);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    res.json({ success: true, message: "Employee updated successfully", employee });
  } catch (error) {
    next(error);
  }
}

export async function removeEmployee(req, res, next) {
  try {
    const employee = await deactivateEmployee(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    res.json({ success: true, message: "Employee deactivated", employee });
  } catch (error) {
    next(error);
  }
}

export async function bulkImportEmployees(req, res, next) {
  try {
    const { csv } = req.body;
    if (!csv) {
      return res.status(400).json({ success: false, message: "csv is required" });
    }

    const result = await importEmployeesFromCsv(csv);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function addBankChangeRequest(req, res, next) {
  try {
    const { requested_account_details } = req.body;
    if (!requested_account_details) {
      return res.status(400).json({ success: false, message: "requested_account_details is required" });
    }

    const request = await requestBankAccountChange(req.user.employee_id, requested_account_details);
    res.status(201).json({ success: true, request });
  } catch (error) {
    next(error);
  }
}

export async function listBankChangeRequests(_req, res, next) {
  try {
    const requests = await getBankAccountChangeRequests();
    res.json({ success: true, requests });
  } catch (error) {
    next(error);
  }
}

export async function reviewBankChangeRequest(req, res, next) {
  try {
    const { status, review_comment = "" } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "status must be approved or rejected" });
    }

    const request = await reviewBankAccountChangeRequest(
      req.params.id,
      status,
      req.user.employee_id,
      review_comment
    );
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    res.json({ success: true, request });
  } catch (error) {
    next(error);
  }
}
