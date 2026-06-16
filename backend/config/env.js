export const appConfig = {
  port: Number(process.env.PORT || 5000),
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET || "change-me-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  dataMode: process.env.DATA_MODE || "demo",
  databaseUrl: process.env.DATABASE_URL || "",
};
