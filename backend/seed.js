import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to run the seed script");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

const users = [
  {
    code: "EMP001",
    fullName: "Neha HR",
    email: "hr@company.com",
    role: "hr",
    department: "Human Resources",
    designation: "HR Executive",
    monthlySalary: 72000,
    joinDate: "2021-09-10",
    managerId: null,
  },
  {
    code: "EMP002",
    fullName: "Asha Manager",
    email: "manager@company.com",
    role: "manager",
    department: "Operations",
    designation: "Operations Manager",
    monthlySalary: 85000,
    joinDate: "2022-02-15",
    managerId: 1,
  },
  {
    code: "EMP003",
    fullName: "Ravi Employee",
    email: "employee@company.com",
    role: "employee",
    department: "Engineering",
    designation: "Software Engineer",
    monthlySalary: 65000,
    joinDate: "2023-04-01",
    managerId: 2,
  },
];

async function seed() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const passwordHash = await bcrypt.hash("Password@123", 10);

    for (const user of users) {
      const employeeResult = await client.query(
        `
          INSERT INTO employees (
            employee_code,
            full_name,
            email,
            role,
            department,
            designation,
            monthly_salary,
            join_date,
            status,
            manager_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9)
          ON CONFLICT (email)
          DO UPDATE SET
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            department = EXCLUDED.department,
            designation = EXCLUDED.designation,
            monthly_salary = EXCLUDED.monthly_salary,
            manager_id = EXCLUDED.manager_id
          RETURNING id
        `,
        [
          user.code,
          user.fullName,
          user.email,
          user.role,
          user.department,
          user.designation,
          user.monthlySalary,
          user.joinDate,
          user.managerId,
        ]
      );

      await client.query(
        `
          INSERT INTO users (employee_id, email, password_hash, role)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (email)
          DO UPDATE SET
            employee_id = EXCLUDED.employee_id,
            password_hash = EXCLUDED.password_hash,
            role = EXCLUDED.role
        `,
        [employeeResult.rows[0].id, user.email, passwordHash, user.role]
      );

      await client.query(
        `
          INSERT INTO leave_balances (employee_id, total_days, used_days, available_days)
          VALUES ($1, 24, 0, 24)
          ON CONFLICT (employee_id)
          DO NOTHING
        `,
        [employeeResult.rows[0].id]
      );
    }

    await client.query(
      `
        INSERT INTO payroll_config (hra_rate, allowance_fixed, deduction_rate, pay_day)
        VALUES (0.20, 5000, 0.05, 30)
      `
    );

    await client.query("COMMIT");
    console.log("Database seeded successfully");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
