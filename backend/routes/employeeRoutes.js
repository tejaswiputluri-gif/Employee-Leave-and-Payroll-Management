import express from "express";
import {
  addEmployee,
  addBankChangeRequest,
  bulkImportEmployees,
  editEmployee,
  listBankChangeRequests,
  listEmployees,
  reviewBankChangeRequest,
  removeEmployee,
} from "../controllers/employeeController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, authorize("hr", "manager"), listEmployees);
router.post("/", protect, authorize("hr"), addEmployee);
router.post("/import", protect, authorize("hr"), bulkImportEmployees);
router.post("/bank-change-request", protect, authorize("employee", "manager", "hr"), addBankChangeRequest);
router.get("/bank-change-request", protect, authorize("hr"), listBankChangeRequests);
router.patch("/bank-change-request/:id", protect, authorize("hr"), reviewBankChangeRequest);
router.patch("/:id", protect, authorize("hr"), editEmployee);
router.patch("/:id/deactivate", protect, authorize("hr"), removeEmployee);

export default router;
