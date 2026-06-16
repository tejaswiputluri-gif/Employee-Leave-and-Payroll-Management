import express from "express";
import {
  listNotifications,
  sendTestEmail,
} from "../controllers/notificationController.js";
import { authorize, protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, listNotifications);
router.post("/test-email", protect, authorize("hr"), sendTestEmail);

export default router;
