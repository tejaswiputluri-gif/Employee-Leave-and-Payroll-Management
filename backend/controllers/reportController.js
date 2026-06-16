import { exportReportData, listReports } from "../models/reportRepository.js";

export async function getReports(req, res, next) {
  try {
    const reports = await listReports(req.user, req.query);
    res.json({ success: true, reports });
  } catch (error) {
    next(error);
  }
}

export async function downloadReport(req, res, next) {
  try {
    const report = await exportReportData(req.user, req.query);

    res.json({
      success: true,
      report,
    });
  } catch (error) {
    next(error);
  }
}
