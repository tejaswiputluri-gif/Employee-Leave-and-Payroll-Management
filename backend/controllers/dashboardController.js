import { getDashboardSummary } from "../models/repository.js";

export async function getSummary(req, res, next) {
  try {
    const summary = await getDashboardSummary(req.user);
    res.json({ success: true, summary });
  } catch (error) {
    next(error);
  }
}
