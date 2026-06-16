import express from "express";
import {
  fetchPayrollConfig,
  generatePayroll,
  getPayslip,
  listPayrolls,
  savePayrollConfig,
} from "../controllers/payrollController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, listPayrolls);
router.get("/config", protect, authorize("hr"), fetchPayrollConfig);
router.put("/config", protect, authorize("hr"), savePayrollConfig);
router.post("/run", protect, authorize("hr"), generatePayroll);
router.post("/revision-run", protect, authorize("hr"), (req, _res, next) => {
  req.body.allow_revision = true;
  next();
}, generatePayroll);
router.get("/:id/payslip", protect, getPayslip);

export default router;
