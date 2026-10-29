# Commercial Dual-Restaurant Food Ordering Platform

A complete commercial food ordering platform serving two distinct restaurants owned by the same client on a single domain:
1. **Veg Restaurant** (Pure Vegetarian Gourmet Kitchen)
2. **Non-Veg Restaurant** (Authentic Charcoal & Tandoor Meat Grill)

Both restaurants operate with independent branding, menus, categories, pricing, inventory, orders, and reporting.

---

## Architecture Overview

The codebase is organized into dedicated **frontend** and **backend** directories:

```text
├── frontend/                       # Next.js 15 App Router Application
│   ├── src/
│   │   ├── app/                    # Next.js App Router (Home, Veg, Non-Veg)
│   │   ├── components/             # Reusable UI, Restaurant & Food Components
│   │   ├── data/                   # Sample restaurant and culinary food datasets
│   │   ├── lib/                    # Styling utilities & formatters
│   │   └── types/                  # Shared TypeScript interfaces
│   ├── tailwind.config.ts          # Warm cream, orange, veg-green & crimson theme
│   ├── next.config.ts
│   └── package.json
│
├── backend/                        # Node.js + Express + TypeScript API Server
│   ├── src/
│   │   ├── config/                 # MongoDB Atlas connection (Mongoose)
│   │   ├── models/                 # Restaurant, FoodItem, Order, User, Admin schemas
│   │   ├── routes/                 # Restaurant, Food, Order, Auth, Admin routes
│   │   ├── services/               # Razorpay payments, SMS OTP, TOTP MFA services
│   │   ├── middleware/             # JWT Authentication & role protection
│   │   └── server.ts               # Express entrypoint
│   ├── tsconfig.json
│   ├── .env.example
│   └── package.json
│
└── package.json                    # Root runner scripts
```

---

## Technology Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons.
- **Backend**: Node.js, Express, TypeScript, Mongoose (MongoDB Atlas).
- **Payments**: Razorpay Node SDK (Order creation & HMAC SHA256 signature verification).
- **Authentication**:
  - SMS OTP authentication for customers (10-minute expiry, numeric OTP generation).
  - Time-based One-Time Password (TOTP) Authenticator MFA for Admin portal via `otplib` & QR codes.

---

## Quick Start

### 1. Frontend Development Server
```bash
npm run dev:frontend
# or
cd frontend && npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Backend API Server
```bash
npm run dev:backend
# or
cd backend && npm run dev
```
Runs at [http://localhost:5000](http://localhost:5000).

### 3. Production Builds
```bash
# Build both frontend and backend
npm run build

# Build individually
npm run build:frontend
npm run build:backend
```

