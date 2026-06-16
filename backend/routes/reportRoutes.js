import express from "express";
import { downloadReport, getReports } from "../controllers/reportController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, authorize("hr", "manager", "employee"), getReports);
router.get("/export", protect, authorize("hr", "manager", "employee"), downloadReport);

export default router;
