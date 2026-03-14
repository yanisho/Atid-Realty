# ATID Property Management Platform

## Overview

A production-ready, mobile-first property management platform built for ATID Reality. The application provides a complete ecosystem for property managers and tenants, including public-facing pages for rent payments, maintenance requests, and rental applications, along with secure portals for both tenants and administrators.

The platform follows a monorepo structure with a React frontend, Express backend, and PostgreSQL database, designed for deployment on Replit with integrated authentication.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state, with custom hooks for authentication
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: TailwindCSS with CSS variables for theming (light/dark mode support)
- **Forms**: React Hook Form with Zod validation schemas

### Backend Architecture
- **Server**: Express.js running on Node.js with TypeScript
- **API Design**: RESTful API endpoints under `/api/*` prefix
- **Authentication**: Replit Auth integration using OpenID Connect with Passport.js
- **Session Management**: PostgreSQL-backed sessions via connect-pg-simple
- **Role-Based Access Control**: User roles include ADMIN, MANAGER, MAINTENANCE, ACCOUNTING, READ_ONLY, TENANT, and APPLICANT

### Data Layer
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all database table definitions
- **Migrations**: Drizzle Kit for database migrations stored in `/migrations`
- **Validation**: Drizzle-Zod for generating validation schemas from database tables

### Application Structure
- **Public Pages**: Home (`/`), Maintenance (`/maintenance`), Pay (`/pay`), Apply (`/apply`), Property lookup (`/property/:code`)
- **Tenant Portal**: Dashboard, Payments, Maintenance, Applications (under `/portal/*`)
- **Admin Portal**: Dashboard, Properties, Tenants, Maintenance, Messaging, Files, Users, Expenses, Rent Charges & Late Fees (under `/admin/*`)

### Build System
- **Development**: Vite dev server with HMR proxied through Express
- **Production**: esbuild bundles server code, Vite builds client assets to `dist/public`
- **Scripts**: `npm run dev` for development, `npm run build` for production build, `npm run db:push` for database migrations

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries and schema management

### Authentication
- **Replit Auth**: OpenID Connect integration for user authentication
- **Session Storage**: PostgreSQL sessions table for persistent sessions
- **Environment Variables**: `ISSUER_URL`, `REPL_ID`, `SESSION_SECRET`

### Payment Processing
- **Stripe Integration**: Full Stripe payment processing via Replit connector (stripe-replit-sync)
- **Server Files**: `server/stripeClient.ts` (credentials via Replit connection API), `server/webhookHandlers.ts` (webhook processing)
- **Payment Flow**: PaymentIntent-based with `automatic_payment_methods: { enabled: true }`; frontend renders Stripe Elements, confirms payment, then records in DB
- **Public Pay Page** (`/pay`): Card, ACH, and Zelle options with Stripe Elements embedded form
- **Portal Payments** (`/portal/payments`): Full payment only — no partial payments allowed. Amount auto-calculated from rent charges ledger (rent + late fees + processing fee). Server-side enforcement validates amount matches expected total. Supports Card, ACH, and Zelle (manual payment with confirmation ID).
- **Zelle Payments**: Portal Zelle tab shows QR code + email (atidrealtyllc@gmail.com); tenant submits transaction ID/confirmation number; stored as pending payment with `zelleConfirmationId` field for admin verification. Endpoint: `POST /api/portal/zelle-payment`.
- **Processing Fees**: Passed through to tenant — Card: 2.99% flat, ACH: 0.8% capped at $5.00. Server recalculates and rejects mismatched amounts.
- **Amount Due API**: `/api/portal/amount-due` endpoint calculates real balance from `rent_charges` table (open/late/partial charges)
- **Webhook**: `/api/stripe/webhook` registered BEFORE `express.json()` in `server/index.ts` for raw Buffer handling
- **Stripe Schema**: `stripe-replit-sync` auto-manages `stripe.*` tables in PostgreSQL; backfill runs on startup
- **Frontend Packages**: `@stripe/stripe-js`, `@stripe/react-stripe-js` for Elements integration
- **Legacy Fallback**: Old `/api/payments` and `/api/portal/payments` POST routes still exist for non-Stripe recording

### Late Fee System
- **Automatic Late Fees**: 5% late fee applied to unpaid rent after the 5th of each month (configurable per lease via `lateFeeRate` and `lateFeeGraceDays`)
- **Rent Charges Table**: Monthly ledger tracking base rent, late fees, total due, amount paid, and payment status per lease; supports manual entries (nullable leaseId/tenantId/propertyId with manualPropertyName/manualTenantName text fields)
- **Manual Invoices**: POST `/api/admin/rent-charges/manual` creates rent charges without a lease, using free-text property/tenant names; validated with regex (YYYY-MM format), positive number checks, and status enum
- **Suppression System**: `suppressed_rent_charges` table tracks deleted invoices and waived late fees by leaseId+chargeMonth+type; prevents scheduler, generate, and apply-late-fees from recreating them
- **Scheduler**: Hourly background job generates monthly charges and applies late fees after grace period; checks suppressions before creating
- **Admin UI**: `/admin/rent-charges` page for viewing charges, generating monthly charges, manually applying late fees, and recording payments

### Document Editing
- **Word Doc Editor**: Full rich-text editor (`client/src/components/doc-editor.tsx`) using mammoth.js to convert .docx/.doc files to HTML, then contentEditable with formatting toolbar (bold, italic, underline, fonts, sizes, colors, alignment, lists, headings, tables, links, highlight). Print/Export support. Available from both Files and Documents pages.
- **PDF Editor**: Uses pdfjs-dist to render PDF pages on canvas; click-to-place text annotations with pdf-lib for downloading modified PDFs
- **Component**: `client/src/components/pdf-editor.tsx` — reusable PDF editor dialog

### File Storage
- **S3-Compatible Storage**: AWS S3 or Cloudflare R2 for file uploads via signed URLs

### Email
- **Resend/Nodemailer**: For transactional emails (payment receipts, maintenance confirmations, application updates)

### UI Dependencies
- **Radix UI**: Accessible component primitives (dialogs, dropdowns, forms, etc.)
- **Lucide React**: Icon library
- **date-fns**: Date formatting and manipulation
- **embla-carousel-react**: Carousel component
- **recharts**: Charting library for dashboards