import nodemailer from "nodemailer";
import { getNotifications } from "../models/repository.js";

export async function listNotifications(req, res, next) {
  try {
    const notifications = await getNotifications(req.user);
    res.json({ success: true, notifications });
  } catch (error) {
    next(error);
  }
}

export async function sendTestEmail(req, res, next) {
  try {
    const { to, subject, message } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "to, subject, and message are required",
      });
    }

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      return res.json({
        success: true,
        message:
          "Email preview saved. SMTP is not configured yet, so no real email was sent.",
        preview: { to, subject, message },
      });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || user,
      to,
      subject,
      text: message,
    });

    res.json({
      success: true,
      message: "Email sent successfully",
    });
  } catch (error) {
    next(error);
  }
}
