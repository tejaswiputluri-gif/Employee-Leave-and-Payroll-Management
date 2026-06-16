import express from "express";
import {
	demoCredentials,
	forgotPassword,
	login,
	logout,
	me,
	refresh,
	resetPassword,
	signup,
	signupApprovers,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/login", login);
router.post("/signup", signup);
router.post("/refresh", refresh);
router.post("/logout", protect, logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", protect, me);
router.get("/demo-credentials", demoCredentials);
router.get("/signup-approvers", signupApprovers);

export default router;
