# Employee System

A full-stack employee management application with JWT authentication, leave tracking, payroll processing, and email notifications.

**Tech Stack:** React + Vite (Frontend) | Node.js + Express (Backend) | PostgreSQL (Database) | JWT Auth

---

## 🎯 Features

✅ **Authentication**: JWT-based login with role-based access (HR, Manager, Employee)  
✅ **Employee Management**: Directory, onboarding forms, profile management  
✅ **Leave Management**: Submit requests, balance checking, manager routing, approval flow  
✅ **Payroll Processing**: Generate salary slips with configurable deductions and allowances  
✅ **Notification Center**: System alerts and email notifications (with SMTP preview)  
✅ **Demo Mode**: Run without PostgreSQL - all data in memory  
✅ **Dashboard**: Role-specific dashboards with analytics  

---

## 📂 Project Structure

```
employee-system/
├── backend/              # Express API server
│   ├── config/          # Database & environment config
│   ├── controllers/      # Route handlers
│   ├── models/          # Data access layer
│   ├── routes/          # API endpoints
│   ├── middleware/       # Auth, error handling
│   ├── data/            # Demo data
│   ├── server.js        # Entry point
│   └── package.json
├── frontend/            # React + Vite application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/    # API client
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── vite.config.js
│   └── package.json
├── database/
│   └── schema.postgres.sql       # PostgreSQL schema
└── README.md
```

---

## 🔑 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| HR | hr@company.com | Password@123 |
| Manager | manager@company.com | Password@123 |
| Employee | employee@company.com | Password@123 |

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- npm or yarn
- PostgreSQL (optional - demo mode works without it)

### Backend Setup

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Server runs on `http://localhost:5000`

### Frontend Setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

App runs on `http://localhost:5173`

---

## ⚙️ Configuration

### Environment Variables

**Backend (.env)**
- `PORT` - Server port (default: 5000)
- `CLIENT_URL` - Frontend URL for CORS
- `JWT_SECRET` - Secret key for signing tokens (CHANGE IN PRODUCTION!)
- `DATA_MODE` - `demo` (in-memory) or `postgres` (database)
- `DATABASE_URL` - PostgreSQL connection string
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - Email configuration

**Frontend (.env)**
- `VITE_API_URL` - Backend API URL (default: http://localhost:5000/api)

### Running with PostgreSQL

1. Create database:
	```bash
	createdb employee_system
	```

2. Import schema:
	```bash
	psql -d employee_system -f database/schema.postgres.sql
	```

3. Update `.env`:
	```
	DATA_MODE=postgres
	DATABASE_URL=postgresql://postgres:password@localhost:5432/employee_system
	```

4. Seed data (optional):
	```bash
	cd backend
	npm run seed
	```

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/signup` - Register new account
- `POST /api/auth/request-password-reset` - Request password reset
- `POST /api/auth/reset-password` - Reset password with OTP

### Employees
- `GET /api/employees` - List all employees
- `GET /api/employees/:id` - Get employee details
- `POST /api/employees` - Create employee
- `PUT /api/employees/:id` - Update employee

### Leaves
- `GET /api/leaves` - Get leave requests
- `POST /api/leaves` - Create leave request
- `PUT /api/leaves/:id/approve` - Approve leave (manager/HR only)
- `PUT /api/leaves/:id/reject` - Reject leave (manager/HR only)

### Payroll
- `GET /api/payroll` - Get payroll records
- `POST /api/payroll/generate` - Generate salary slips (HR only)
- `GET /api/payroll/:id/download` - Download payslip as CSV

### Dashboard
- `GET /api/dashboard/overview` - Dashboard summary

### Notifications
- `GET /api/notifications` - Get user notifications
- `POST /api/notifications/send-test-email` - Send test email

---

## 🔐 Authentication & Security

- **JWT Tokens**: Access tokens (8-hour expiry) + Refresh tokens (7-day expiry)
- **Password Hashing**: bcryptjs with salt rounds
- **Role-Based Access**: Middleware enforces HR, Manager, Employee roles
- **Account Lockout**: 5 failed login attempts = 30-minute lockout
- **CORS**: Restricted to frontend origin

---

## 🛠️ Development

### Available Scripts

**Backend:**
```bash
npm run dev    # Start with nodemon (auto-reload)
npm start      # Start production server
npm run seed   # Seed demo data
```

**Frontend:**
```bash
npm run dev    # Vite dev server
npm run build  # Production build
npm run preview # Preview production build
```

---

## 📊 Data Modes

### Demo Mode (`DATA_MODE=demo`)
- In-memory data storage
- Persisted to `demoStore.runtime.json`
- Perfect for development and testing
- No PostgreSQL required

### PostgreSQL Mode (`DATA_MODE=postgres`)
- Production-ready database
- Full data persistence
- Requires PostgreSQL setup

---

## 📧 Email Configuration

### With SMTP (Production)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@company.com
```

### Preview Mode (Development)
When SMTP is not configured, emails are saved as safe previews in the notification center.

---

## 🐛 Troubleshooting

**"Account not found" after restart?**
- Make sure `DATA_MODE=demo` and check `demoStore.runtime.json` exists

**CORS errors?**
- Verify `CLIENT_URL` in backend `.env` matches frontend URL

**JWT token expired?**
- Use the refresh token endpoint to get a new access token

**PostgreSQL connection failed?**
- Verify database exists: `createdb employee_system`
- Check connection string in `.env`

---

## 📝 License

MIT

---

## 👥 Author

Employee System - Demo Application

---

## 🤝 Contributing

Feel free to submit issues and enhancement requests!
