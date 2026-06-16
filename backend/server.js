import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { appConfig } from "./config/env.js";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import leaveRoutes from "./routes/leaveRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import payrollRoutes from "./routes/payrollRoutes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorMiddleware.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: appConfig.clientUrl,
    credentials: true,
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Employee management backend is running",
    mode: appConfig.dataMode,
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reports", reportRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(appConfig.port, () => {
  console.log(
    `Server running on port ${appConfig.port} in ${appConfig.dataMode} mode`
  );
});
