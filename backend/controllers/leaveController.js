import {
  createLeaveRequest,
  cancelLeaveRequest,
  getLeaves,
  getLeavePolicyConfig,
  getTeamCalendar,
  updateLeavePolicyConfig,
  updateLeaveStatus,
} from "../models/repository.js";

export async function listLeaves(req, res, next) {
  try {
    const leaves = await getLeaves(req.user);
    res.json({ success: true, leaves });
  } catch (error) {
    next(error);
  }
}

export async function addLeave(req, res, next) {
  try {
    const requiredFields = ["leave_type", "start_date", "end_date", "days", "reason"];
    const missingField = requiredFields.find((field) => !req.body[field]);

    if (missingField) {
      return res.status(400).json({
        success: false,
        message: `${missingField} is required`,
      });
    }

    const leave = await createLeaveRequest(req.user, req.body);
    res.status(201).json({
      success: true,
      message: "Leave request submitted",
      leave,
    });
  } catch (error) {
    next(error);
  }
}

export async function changeLeaveStatus(req, res, next) {
  try {
    const { status, manager_comment = "" } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be approved or rejected",
      });
    }

    const leave = await updateLeaveStatus(
      req.params.id,
      status,
      manager_comment,
      req.user
    );
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found",
      });
    }

    res.json({
      success: true,
      message: `Leave request ${status}`,
      leave,
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelLeave(req, res, next) {
  try {
    const leave = await cancelLeaveRequest(req.params.id, req.user);
    if (!leave) {
      return res.status(404).json({ success: false, message: "Leave request not found" });
    }

    res.json({ success: true, message: "Leave request cancelled", leave });
  } catch (error) {
    next(error);
  }
}

export async function calendarLeaves(req, res, next) {
  try {
    const calendar = await getTeamCalendar(req.user);
    res.json({ success: true, calendar });
  } catch (error) {
    next(error);
  }
}

export async function getLeavePolicy(req, res, next) {
  try {
    const policy = await getLeavePolicyConfig();
    res.json({ success: true, policy });
  } catch (error) {
    next(error);
  }
}

export async function saveLeavePolicy(req, res, next) {
  try {
    const policy = await updateLeavePolicyConfig(req.body);
    res.json({ success: true, policy });
  } catch (error) {
    next(error);
  }
}
