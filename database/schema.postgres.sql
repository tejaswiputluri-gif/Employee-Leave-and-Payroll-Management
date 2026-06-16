CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  employee_code VARCHAR(20) NOT NULL UNIQUE,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('employee', 'manager', 'hr')),
  dob DATE,
  department VARCHAR(80) NOT NULL,
  employee_category VARCHAR(40) NOT NULL DEFAULT 'General',
  designation VARCHAR(80) NOT NULL,
  monthly_salary NUMERIC(12, 2) NOT NULL,
  pan VARCHAR(20),
  aadhaar VARCHAR(20),
  esi_no VARCHAR(20),
  pf_uan VARCHAR(30),
  bank_account_details TEXT,
  join_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  manager_id INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('employee', 'manager', 'hr')),
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMP,
  refresh_token_hash TEXT,
  password_reset_otp_hash TEXT,
  password_reset_otp_expires_at TIMESTAMP,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  manager_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
  leave_type VARCHAR(30) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days NUMERIC(6, 2) NOT NULL,
  is_half_day BOOLEAN NOT NULL DEFAULT FALSE,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  validation_status VARCHAR(20) NOT NULL DEFAULT 'validated',
  manager_comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payrolls (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  basic_salary NUMERIC(12, 2) NOT NULL,
  hra NUMERIC(12, 2) NOT NULL,
  allowances NUMERIC(12, 2) NOT NULL,
  conveyance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  special_allowance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  medical_allowance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  gross_salary NUMERIC(12, 2) NOT NULL DEFAULT 0,
  working_days INTEGER NOT NULL DEFAULT 0,
  lop_days NUMERIC(8, 2) NOT NULL DEFAULT 0,
  lop_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  pf_employee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  pf_employer NUMERIC(12, 2) NOT NULL DEFAULT 0,
  esi_employee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  esi_employer NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tds NUMERIC(12, 2) NOT NULL DEFAULT 0,
  professional_tax NUMERIC(12, 2) NOT NULL DEFAULT 0,
  deductions NUMERIC(12, 2) NOT NULL,
  annualized_income NUMERIC(14, 2) NOT NULL DEFAULT 0,
  is_revision BOOLEAN NOT NULL DEFAULT FALSE,
  revised_at TIMESTAMP,
  net_salary NUMERIC(12, 2) NOT NULL,
  generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_employee_payroll UNIQUE (employee_id, month, year)
);

CREATE TABLE IF NOT EXISTS leave_balances (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
  total_days NUMERIC(6, 2) NOT NULL DEFAULT 24,
  used_days NUMERIC(6, 2) NOT NULL DEFAULT 0,
  available_days NUMERIC(6, 2) NOT NULL DEFAULT 24,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payroll_config (
  id SERIAL PRIMARY KEY,
  basic_pay NUMERIC(12, 2) NOT NULL DEFAULT 0,
  hra_rate NUMERIC(6, 4) NOT NULL DEFAULT 0.20,
  conveyance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  special_allowance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  medical_allowance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  allowance_fixed NUMERIC(12, 2) NOT NULL DEFAULT 5000,
  deduction_rate NUMERIC(6, 4) NOT NULL DEFAULT 0.05,
  professional_tax NUMERIC(12, 2) NOT NULL DEFAULT 200,
  pf_employee_rate NUMERIC(6, 4) NOT NULL DEFAULT 0.12,
  pf_employer_rate NUMERIC(6, 4) NOT NULL DEFAULT 0.1336,
  esi_employee_rate NUMERIC(6, 4) NOT NULL DEFAULT 0.0075,
  esi_employer_rate NUMERIC(6, 4) NOT NULL DEFAULT 0.0325,
  tax_slabs JSONB NOT NULL DEFAULT '[]'::jsonb,
  pay_day INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_policy_config (
  id SERIAL PRIMARY KEY,
  leave_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  entitlements_by_category JSONB NOT NULL DEFAULT '{}'::jsonb,
  holidays JSONB NOT NULL DEFAULT '[]'::jsonb,
  carry_forward_limit NUMERIC(6, 2) NOT NULL DEFAULT 0,
  max_entitlement_per_type JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  email VARCHAR(120),
  event_type VARCHAR(60) NOT NULL,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  details TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_event_type
  ON auth_audit_logs(event_type);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  role VARCHAR(20),
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(40) NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_account_change_requests (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  requested_account_details TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
  review_comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id
  ON leave_requests(employee_id);

CREATE INDEX IF NOT EXISTS idx_leave_requests_status
  ON leave_requests(status);

CREATE INDEX IF NOT EXISTS idx_payrolls_employee_id
  ON payrolls(employee_id);

CREATE INDEX IF NOT EXISTS idx_payrolls_period
  ON payrolls(year, month);
