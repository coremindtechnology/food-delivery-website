# Commercial Dual-Restaurant Food Ordering Platform

A complete commercial food ordering platform serving two distinct restaurants owned by the same client on a single domain:
1. **Veg Restaurant** (Pure Vegetarian Gourmet Kitchen)
2. **Non-Veg Restaurant** (Authentic Charcoal & Tandoor Meat Grill)

Both restaurants operate with independent branding, menus, categories, pricing, inventory, orders, and reporting.

## Delivery coverage

Home delivery is limited to a 5 km radius from the selected kitchen: Sai Baba Dhaba and Family Restaurant (vegetarian) or Hotel Shyam Inn (non-vegetarian), both in Bhanpur, Bhopal. Checkout asks customers to share their current location at the delivery address, shows whether it is in range, and the order APIs enforce the same limit. Takeaway pickup is not affected.

## Google restaurant ratings

Restaurant cards load ratings and review counts from Google Places when the page opens and link to each restaurant's Google Maps listing. To enable this, add `GOOGLE_PLACES_API_KEY` to `frontend/.env.local` for local development and to the frontend server environment in production. Enable Places API (New) and billing for the Google Cloud project, and keep the key server-only (never use a `NEXT_PUBLIC_` prefix). Ratings are shown as unavailable until the key is configured.

## Admin menu and inventory

Administrators with an active session can open `/admin/menu` to manage restaurant menus, categories, item ordering, availability, pricing, images, variants, add-ons, stock counts, and low-stock thresholds. Uploaded food images are limited to 2 MB and stored in MongoDB; image URLs are also supported.

The manual customer-availability switch is independent of inventory quantity. Customer menus, search, item details, and checkout require an active category, an available item, and positive stock. Checkout revalidates each item and conditionally decrements its stock in MongoDB, so competing orders cannot oversell the same quantity. Adjustments and order deductions/releases are recorded in inventory history. Archiving items is a soft delete; order records retain their item snapshots.

## Order, payment, and delivery operations

The admin order screen is available at `/admin/orders`. It supports restaurant-scoped order status changes, cancellation/rejection inventory release, and rider assignment. The server validates every state transition; Razorpay orders remain `pending_payment` and are not sent to the restaurant until a captured payment is verified. Order, payment, and refund status are stored separately.

Supported order states are `pending_payment`, `new`, `accepted`, `preparing`, `ready`, `dispatched`, `ready_for_pickup`, `delivered`, `rejected`, and `cancelled`. Unpaid online orders reserve inventory for 15 minutes; the expiry cron below releases the reservation if payment is not completed.

### Razorpay setup

Set these variables in the frontend server environment (never expose the secret in a `NEXT_PUBLIC_*` variable):

```text
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
DELIVERY_CODE_SECRET=<random secret of at least 32 characters>
ORDER_EXPIRY_CRON_SECRET=<random secret of at least 32 characters>
SMS_API_KEY=...
SMS_SENDER_ID=...
SMS_TEMPLATE_ID=...
```

Configure the Razorpay webhook URL as `/api/payments/razorpay/webhook` and subscribe to `payment.authorized`, `payment.captured`, `payment.failed`, and refund events. The browser callback is only a payment claim: the server checks its HMAC signature and fetches the payment from Razorpay before updating local state. Webhooks are signature-checked and idempotently recorded. Admins can reconcile payments and refunds from `/admin/payments`; refunds are limited to verified Razorpay captures and reserved against concurrent refund requests.

Schedule a `POST /api/cron/expire-pending-orders` request with `Authorization: Bearer <ORDER_EXPIRY_CRON_SECRET>` to expire unpaid Razorpay reservations after 15 minutes and release their stock.

### Production deployment (Vercel + MongoDB Atlas)

The customer, admin, delivery, payment, and database API routes are part of the Next.js application in `frontend/`. Deploy that app as one Vercel project; the separate Express service in `backend/` is not used by the current frontend flows.

1. Import this repository into Vercel and set **Root Directory** to `frontend`. Keep the framework preset as Next.js, with install command `npm install` and build command `npm run build`.
2. In MongoDB Atlas, create a production database user with only the permissions the app needs, set Network Access to the egress IP/range used by your hosting plan, and add the resulting connection string as `MONGODB_URI`. The database deployment must support replica-set transactions (Atlas does).
3. Add these server-only variables to Vercel's Production environment, then redeploy:

  ```text
  MONGODB_URI
  JWT_SECRET
  ADMIN_JWT_SECRET
  DELIVERY_CODE_SECRET
  ORDER_EXPIRY_CRON_SECRET
  GOOGLE_PLACES_API_KEY
  ```

  Generate each secret independently with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Never use a `NEXT_PUBLIC_` prefix for secrets. The app rejects missing customer/admin signing secrets in production.
4. Add `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` when enabling online payments. Configure the Razorpay webhook to `https://<your-domain>/api/payments/razorpay/webhook` and subscribe to the payment and refund events listed above. Use live credentials only after testing with Razorpay test credentials.
5. Add `SMS_API_KEY` and, if required by the provider, `SMS_SENDER_ID` and `SMS_TEMPLATE_ID` to enable OTP delivery. Production OTP sign-in intentionally fails until a real SMS key is configured.
6. Point your domain to Vercel, verify HTTPS, then check `https://<your-domain>/api/restaurants` and test sign-in, ordering, payment, admin, and delivery flows with production credentials.
7. Schedule a hosting cron or external scheduler to `POST https://<your-domain>/api/cron/expire-pending-orders` with `Authorization: Bearer <ORDER_EXPIRY_CRON_SECRET>`. This route is not scheduled automatically.

Keep Preview deployments on a separate test database and test payment credentials. Do not copy production Atlas, payment, or SMS secrets into Preview. The local `.env` is ignored by Git; set production values in the hosting provider's environment settings.

### COD and delivery personnel

COD collection and outstanding balances are recorded on both the order and payment records. An assigned rider must confirm pickup, mark the delivery en route (which sends a short-lived delivery code to the customer's verified phone), then verify the code and enter the cash actually collected. Partial COD collection leaves an outstanding balance; it does not mark the payment captured. Delivery completion and COD settlement are committed in one MongoDB transaction, so the MongoDB deployment must support transactions (a replica set, including MongoDB Atlas).

Administrators can create delivery logins at `/admin/delivery`. Riders sign in at `/delivery/login`; their HTTP-only session grants access only to their own active assignments and delivery history at `/delivery`. The panel exposes only the assigned order's delivery/pickup details and required contact numbers.

No call-masking provider is configured. Until a client-selected masking provider is integrated, the rider panel uses direct telephone links to the restaurant and assigned customer. Phone numbers are only returned to the authenticated rider for that rider's assignments.

## Finance and business reports

The admin finance workspace is available at `/admin/finance`. It reports actual order, payment, refund, and expense records, filtered by restaurant and by Today, Yesterday, Last 7 Days, Last 30 Days, Current Month, Previous Month, or a custom range of up to 10 years. All date boundaries and displayed transaction dates use `Asia/Kolkata`, with inclusive local start/end days and an exclusive database end boundary. New Razorpay captures and COD collections carry their own timestamps; legacy online attempts without a capture timestamp use their recorded payment creation time.

Only delivered orders contribute to gross order value, discounts, net sales, delivery charges, or taxes. Gross order value is the stored food subtotal; net sales subtract discounts and processed refunds. Delivery charges and taxes are displayed separately and excluded from net-sales/profit revenue, avoiding adding them twice; taxes are treated as pass-through. Razorpay captures and COD collections are collection figures, not additional sales. COD outstanding is the current balance of non-cancelled COD orders placed in the selected order period. Refunds are attributed to their processing date.

Finance admins can record immutable expenses by restaurant in food/raw-material, packaging, delivery, staff, rent, utilities, gateway fees, maintenance, and other categories. Each expense, corresponding ledger debit, and audit-log entry is committed in one MongoDB transaction. Legacy `raw_materials` expenses remain included as food cost. Estimated operating profit is net sales plus delivery charges less recorded operating expenses; taxes are excluded. It is explicitly marked incomplete when no food cost is recorded and otherwise remains an estimate based on entered expenses. CSV export includes report summaries and transaction rows; Print report uses the browser print dialog.

Finance calculation tests use known sample sales, discounts, refunds, collections, COD balances, taxes, and expenses. Recording expenses requires MongoDB transactions, so use a replica-set deployment such as MongoDB Atlas.

### Tests and integration validation

Run the local state-machine, COD calculation, and Razorpay HMAC tests with:

```bash
npm --prefix frontend test
```

Run the production frontend type-check/build with `npm --prefix frontend run build`. End-to-end COD, stock-concurrency, sandbox-payment, and webhook-delivery tests require an isolated test MongoDB database plus Razorpay sandbox credentials and a configured webhook sender. Do not run these flows against a production or shared database.

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
- **Payments**: Server-side Razorpay REST APIs, HMAC SHA-256 callback and webhook verification.
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
The frontend development server uses `.next-dev` so it can run alongside production builds without sharing Webpack chunks.

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
