import express from "express";
import {
  addLeave,
  calendarLeaves,
  cancelLeave,
  changeLeaveStatus,
  getLeavePolicy,
  listLeaves,
  saveLeavePolicy,
} from "../controllers/leaveController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, listLeaves);
router.get("/policy", protect, authorize("hr", "manager"), getLeavePolicy);
router.get("/calendar", protect, authorize("manager", "hr"), calendarLeaves);
router.post("/", protect, authorize("employee", "manager", "hr"), addLeave);
router.put("/policy", protect, authorize("hr"), saveLeavePolicy);
router.patch("/:id/status", protect, authorize("manager", "hr"), changeLeaveStatus);
router.patch("/:id/cancel", protect, cancelLeave);

export default router;
