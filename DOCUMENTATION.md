# Jones GC Tracker - Technical Documentation

This document provides detailed technical documentation for the Jones General Contracting job tracking application.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Server Actions](#server-actions)
4. [UI Components](#ui-components)
5. [Pages and Routes](#pages-and-routes)
6. [PDF Generation](#pdf-generation)
7. [Export Functionality](#export-functionality)
8. [Authentication](#authentication)
9. [Business Logic](#business-logic)
10. [Utility Functions](#utility-functions)

---

## Architecture Overview

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 15 App Router | React framework with server components |
| Styling | Tailwind CSS | Utility-first CSS framework |
| Database | Neon PostgreSQL | Serverless PostgreSQL |
| ORM | Drizzle ORM | Type-safe database queries |
| Auth | NextAuth.js v5 | Authentication with credentials provider |
| PDF | @react-pdf/renderer | React-based PDF generation |
| Excel | SheetJS (xlsx) | Excel file creation |
| Deployment | Vercel | Serverless hosting |

### Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth route group (unprotected)
│   │   └── login/page.tsx        # Login page
│   ├── (dashboard)/              # Dashboard route group (protected)
│   │   ├── layout.tsx            # Dashboard layout with sidebar
│   │   ├── page.tsx              # Dashboard home
│   │   ├── customers/            # Customer pages
│   │   ├── estimates/            # Estimate pages
│   │   ├── jobs/                 # Job pages
│   │   ├── invoices/             # Invoice pages
│   │   └── reports/              # Reports page
│   ├── api/                      # API routes
│   │   ├── auth/[...nextauth]/   # NextAuth handler
│   │   ├── export/               # Excel export endpoints
│   │   └── pdf/                  # PDF generation endpoints
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
├── components/
│   ├── ui/                       # Base UI components
│   │   ├── button.tsx            # Button variants
│   │   ├── card.tsx              # Card components
│   │   ├── input.tsx             # Input components
│   │   ├── table.tsx             # Table components
│   │   ├── modal.tsx             # Modal dialogs
│   │   ├── badge.tsx             # Status badges
│   │   ├── alert.tsx             # Alert messages
│   │   └── spinner.tsx           # Loading spinners
│   ├── layout/
│   │   ├── sidebar.tsx           # Navigation sidebar
│   │   └── header.tsx            # Company header
│   ├── forms/
│   │   └── line-item-editor.tsx  # Line item management
│   └── data-display/
│       └── status-badge.tsx      # Status display
└── lib/
    ├── actions/                  # Server Actions
    │   ├── customers.ts          # Customer CRUD
    │   ├── estimates.ts          # Estimate management
    │   ├── jobs.ts               # Job tracking
    │   ├── invoices.ts           # Invoice management
    │   ├── dashboard.ts          # Dashboard stats
    │   └── reports.ts            # Search and reports
    ├── db/
    │   ├── index.ts              # Database connection
    │   └── schema.ts             # Drizzle schema
    ├── pdf/
    │   ├── styles.ts             # PDF styles
    │   └── templates/
    │       ├── estimate.tsx      # Estimate PDF
    │       └── invoice.tsx       # Invoice PDF
    └── utils/
        ├── format.ts             # Formatting utilities
        ├── validation.ts         # Zod schemas
        ├── numbers.ts            # Number generation
        ├── workflow.ts           # Status workflow
        └── excel.ts              # Excel export
```

---

## Database Schema

### Tables

#### `customers`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-increment ID |
| name | varchar(255) | NOT NULL | Customer name |
| phone | varchar(20) | NOT NULL | Phone number |
| email | varchar(255) | | Email address |
| address | text | | Full address |
| notes | text | | Additional notes |
| created_at | timestamp | DEFAULT NOW() | Creation timestamp |
| updated_at | timestamp | DEFAULT NOW() | Update timestamp |

#### `jobs`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-increment ID |
| customer_id | integer | NOT NULL, FK | Reference to customers |
| estimate_number | varchar(20) | NOT NULL, UNIQUE | Format: YYMMDDTXXXL |
| invoice_number | varchar(20) | UNIQUE | Format: YYMMDDXXX |
| estimate_date | date | NOT NULL | Estimate creation date |
| approval_date | date | | When approved |
| start_date | date | | Work start date |
| completion_date | date | | Work completion date |
| invoice_date | date | | Invoice sent date |
| payment_date | date | | Payment received date |
| status | varchar(50) | DEFAULT 'Estimate Created' | Current status |
| total_amount | decimal(12,2) | DEFAULT 0 | Job total |
| notes | text | | Job notes |
| created_at | timestamp | DEFAULT NOW() | Creation timestamp |
| updated_at | timestamp | DEFAULT NOW() | Update timestamp |

#### `line_items`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | serial | PRIMARY KEY | Auto-increment ID |
| job_id | integer | NOT NULL, FK | Reference to jobs |
| item_number | integer | NOT NULL | Display order |
| action | varchar(100) | NOT NULL | Work category |
| amount | decimal(12,2) | NOT NULL | Line item cost |
| description | text | | Work description |

### Relationships

```
customers (1) ──────< (many) jobs
jobs (1) ──────< (many) line_items
```

### Status Values

```typescript
const JOB_STATUSES = [
  'Estimate Created',
  'Estimate Sent',
  'Approved',
  'In Progress',
  'Completed',
  'Invoiced',
  'Paid',
] as const;
```

---

## Server Actions

All server actions are located in `src/lib/actions/` and use the `'use server'` directive.

### Customer Actions (`customers.ts`)

```typescript
// Get all customers
getAllCustomers(): Promise<Customer[]>

// Get customer by ID with jobs
getCustomerById(id: number): Promise<CustomerWithJobs | null>

// Search customers by name, phone, or address
searchCustomers(query: string): Promise<Customer[]>

// Create customer (checks for duplicate phone)
createCustomer(data: CustomerInput): Promise<ActionResult<Customer>>

// Update customer
updateCustomer(id: number, data: CustomerInput): Promise<ActionResult<Customer>>

// Delete customer (fails if has jobs)
deleteCustomer(id: number): Promise<ActionResult>
```

### Estimate Actions (`estimates.ts`)

```typescript
// Get all estimates (status: Estimate Created or Estimate Sent)
getAllEstimates(): Promise<EstimateWithCustomer[]>

// Get estimate by ID with line items
getEstimateById(id: number): Promise<EstimateWithDetails | null>

// Create estimate with line items
createEstimate(data: EstimateInput): Promise<ActionResult<Job>>

// Update estimate (only if not approved)
updateEstimate(id: number, data: EstimateInput): Promise<ActionResult<Job>>

// Delete estimate (only if not approved)
deleteEstimate(id: number): Promise<ActionResult>

// Approve estimate (transitions to Approved status)
approveEstimate(id: number): Promise<ActionResult<Job>>

// Mark as sent
markEstimateSent(id: number): Promise<ActionResult<Job>>
```

### Job Actions (`jobs.ts`)

```typescript
// Get all jobs
getAllJobs(): Promise<JobWithCustomer[]>

// Get active jobs (In Progress or Completed)
getActiveJobs(): Promise<JobWithCustomer[]>

// Get job by ID
getJobById(id: number): Promise<JobWithDetails | null>

// Update job status
updateJobStatus(id: number, newStatus: JobStatus): Promise<ActionResult<Job>>

// Start job
startJob(id: number): Promise<ActionResult<Job>>

// Complete job
completeJob(id: number): Promise<ActionResult<Job>>

// Add/update line items
updateLineItems(jobId: number, items: LineItemInput[]): Promise<ActionResult>
```

### Invoice Actions (`invoices.ts`)

```typescript
// Get all invoices (status: Invoiced or Paid)
getAllInvoices(): Promise<InvoiceWithCustomer[]>

// Get unpaid invoices
getUnpaidInvoices(): Promise<InvoiceWithCustomer[]>

// Get overdue invoices (>30 days unpaid)
getOverdueInvoices(): Promise<InvoiceWithCustomer[]>

// Get invoice by ID
getInvoiceById(id: number): Promise<InvoiceWithDetails | null>

// Create invoice from completed job
createInvoice(jobId: number): Promise<ActionResult<Job>>

// Record payment
recordPayment(id: number): Promise<ActionResult<Job>>

// Get invoice stats
getInvoiceStats(): Promise<InvoiceStats>
```

### Dashboard Actions (`dashboard.ts`)

```typescript
// Get dashboard statistics
getDashboardStats(): Promise<DashboardStats>
// Returns: pendingEstimates, activeJobs, unpaidInvoices, unpaidTotal, monthlyRevenue

// Get recent activity
getRecentActivity(limit?: number): Promise<ActivityItem[]>
```

### Report Actions (`reports.ts`)

```typescript
// Global search across customers, jobs, and line items
globalSearch(query: string, filters?: SearchFilters): Promise<SearchResults>

// Monthly revenue report
getMonthlyRevenueReport(year: number): Promise<MonthlyRevenue[]>

// Outstanding invoices report
getOutstandingInvoicesReport(): Promise<OutstandingInvoice[]>

// Customer history report
getCustomerHistoryReport(customerId: number): Promise<CustomerHistory>
```

---

## UI Components

### Base Components (`src/components/ui/`)

#### Button (`button.tsx`)

```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}
```

#### Card (`card.tsx`)

Components: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`

#### Input (`input.tsx`)

- `Input` - Standard text input
- `PhoneInput` - Auto-formats to (XXX) XXX-XXXX
- `CurrencyInput` - Currency formatting

#### Table (`table.tsx`)

Components: `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`, `TableEmpty`

#### Modal (`modal.tsx`)

- `Modal` - Base modal with backdrop
- `ConfirmDialog` - Confirmation dialog with title, message, confirm/cancel buttons

#### Badge (`badge.tsx`)

```typescript
type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';
```

#### Alert (`alert.tsx`)

```typescript
type AlertVariant = 'success' | 'warning' | 'danger' | 'info';
```

### Layout Components (`src/components/layout/`)

#### Sidebar (`sidebar.tsx`)

Navigation links with active state:
- Dashboard
- Customers
- Estimates
- Jobs
- Invoices
- Reports

#### Header (`header.tsx`)

Company branding:
- Logo (if provided)
- "JONES GENERAL CONTRACTING, LLC"
- "Serving the Willamette Valley"
- CCB #247760

### Form Components (`src/components/forms/`)

#### LineItemEditor (`line-item-editor.tsx`)

Features:
- Add new line items
- Edit existing items inline
- Reorder items (move up/down)
- Delete items with confirmation
- Running total calculation

---

## Pages and Routes

### Authentication Routes

| Route | Page | Description |
|-------|------|-------------|
| `/login` | `(auth)/login/page.tsx` | Login form |

### Dashboard Routes (Protected)

| Route | Page | Description |
|-------|------|-------------|
| `/` | `(dashboard)/page.tsx` | Dashboard with stats |
| `/customers` | `(dashboard)/customers/page.tsx` | Customer list |
| `/customers/[id]` | `(dashboard)/customers/[id]/page.tsx` | Customer detail |
| `/estimates` | `(dashboard)/estimates/page.tsx` | Estimate list |
| `/estimates/new` | `(dashboard)/estimates/new/page.tsx` | New estimate form |
| `/estimates/[id]` | `(dashboard)/estimates/[id]/page.tsx` | View/edit estimate |
| `/jobs` | `(dashboard)/jobs/page.tsx` | Job list |
| `/jobs/[id]` | `(dashboard)/jobs/[id]/page.tsx` | Job detail |
| `/invoices` | `(dashboard)/invoices/page.tsx` | Invoice list |
| `/invoices/[id]` | `(dashboard)/invoices/[id]/page.tsx` | Invoice detail |
| `/reports` | `(dashboard)/reports/page.tsx` | Search and reports |

### API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth handler |
| `/api/pdf/estimate/[id]` | GET | Generate estimate PDF |
| `/api/pdf/invoice/[id]` | GET | Generate invoice PDF |
| `/api/export/customers` | GET | Export customers to Excel |
| `/api/export/invoices` | GET | Export invoices to Excel |

---

## PDF Generation

### Overview

PDFs are generated using `@react-pdf/renderer`, which allows creating PDFs using React components.

### Templates

#### Estimate PDF (`src/lib/pdf/templates/estimate.tsx`)

Structure:
1. **Header**: Logo, company name, tagline, contact info, CCB number
2. **Client Info**: Customer name, address, phone
3. **Estimate Info**: Estimate number, date
4. **Line Items Table**: Item #, Action, Description, Amount
5. **Total**: Sum of all line items
6. **Terms**: Payment terms, deposit info
7. **Signature Lines**: Client approval signature

#### Invoice PDF (`src/lib/pdf/templates/invoice.tsx`)

Structure:
1. **Header**: Same as estimate
2. **Invoice Info**: Invoice number, date, due date
3. **Client Info**: Customer details
4. **Line Items Table**: Same as estimate
5. **Payment Summary**: Total, deposit, amount due
6. **Payment Methods**: Check, Venmo, Zelle info
7. **Terms**: Late payment terms

### Styles (`src/lib/pdf/styles.ts`)

```typescript
// Company info constants
export const COMPANY_INFO = {
  name: 'JONES GENERAL CONTRACTING, LLC',
  tagline: 'Serving the Willamette Valley',
  license: 'CCB #247760',
  phone: '(971) 240-8071',
  email: 'jonesgcoregon@gmail.com',
};

// Color constants
export const COLORS = {
  primary: '#FF6B35',
  secondary: '#4A4A4A',
  text: '#333333',
  lightGray: '#f5f5f5',
  border: '#e0e0e0',
};
```

---

## Export Functionality

### Excel Export (`src/lib/utils/excel.ts`)

Uses SheetJS (xlsx) library to create Excel files.

```typescript
// Generic export function
exportToExcel(data: any[], sheetName: string): Buffer

// Formatters
formatCustomersForExport(customers: Customer[]): ExcelRow[]
formatEstimatesForExport(estimates: Estimate[]): ExcelRow[]
formatInvoicesForExport(invoices: Invoice[]): ExcelRow[]
formatJobsForExport(jobs: Job[]): ExcelRow[]
```

### Export Endpoints

- `GET /api/export/customers` - Downloads `customers_export_YYYY-MM-DD.xlsx`
- `GET /api/export/invoices` - Downloads `invoices_export_YYYY-MM-DD.xlsx`

---

## Authentication

### Configuration (`src/auth.ts`)

Uses NextAuth.js v5 with credentials provider:

```typescript
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Validates against ADMIN_USERNAME and ADMIN_PASSWORD env vars
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
});
```

### Middleware (`src/middleware.ts`)

Protects all routes except:
- `/login`
- `/api/auth/*`
- Static files

---

## Business Logic

### Phone Formatting (`src/lib/utils/format.ts`)

```typescript
formatPhone('9712408071') // Returns: (971) 240-8071
formatPhone('971-240-8071') // Returns: (971) 240-8071
```

### Estimate Number Generation (`src/lib/utils/numbers.ts`)

Format: `YYMMDDTXXXL`

```typescript
generateEstimateNumber()
// Example: 250713T954B
// - 250713: July 13, 2025
// - T: Type indicator
// - 954: Random 3-digit number
// - B: Second estimate of the day
```

### Invoice Number Generation (`src/lib/utils/numbers.ts`)

Format: `YYMMDDXXX`

```typescript
generateInvoiceNumber()
// Example: 250713001
// - 250713: July 13, 2025
// - 001: First invoice of the day
```

### Status Workflow (`src/lib/utils/workflow.ts`)

```typescript
// Valid transitions
const STATUS_TRANSITIONS = {
  'Estimate Created': ['Estimate Sent'],
  'Estimate Sent': ['Approved'],
  'Approved': ['In Progress'],
  'In Progress': ['Completed'],
  'Completed': ['Invoiced'],
  'Invoiced': ['Paid'],
  'Paid': [],
};

// Check if transition is valid
canTransitionTo(currentStatus: JobStatus, newStatus: JobStatus): boolean

// Check if job can be edited
canEditJob(status: JobStatus): boolean
// Returns true for: Estimate Created, Estimate Sent

// Get next status in workflow
getNextStatus(status: JobStatus): JobStatus | null
```

### Validation (`src/lib/utils/validation.ts`)

Uses Zod schemas:

```typescript
// Customer validation
customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
});

// Line item validation
lineItemSchema = z.object({
  itemNumber: z.number().min(1),
  action: z.string().min(1, 'Action is required'),
  amount: z.number().min(0),
  description: z.string().optional(),
});

// Estimate validation
estimateSchema = z.object({
  customerId: z.number().min(1, 'Customer is required'),
  estimateDate: z.string(),
  notes: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required'),
});
```

---

## Utility Functions

### Currency Formatting (`src/lib/utils/format.ts`)

```typescript
formatCurrency(1234.56) // Returns: $1,234.56
formatCurrency(1000) // Returns: $1,000.00
```

### Date Formatting (`src/lib/utils/format.ts`)

```typescript
formatDate('2025-07-13') // Returns: 07/13/2025
formatDate(new Date()) // Returns: MM/DD/YYYY
formatDateLong('2025-07-13') // Returns: July 13, 2025
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | Secret for session encryption |
| `NEXTAUTH_URL` | Yes | Application URL |
| `ADMIN_USERNAME` | Yes | Admin login username |
| `ADMIN_PASSWORD` | Yes | Admin login password |

---

## Data Migration

### From Excel to PostgreSQL

Run the migration script to transfer data from the original Excel-based system:

```bash
npx tsx scripts/migrate-data.ts
```

The script:
1. Reads Excel files from `jones-gc-tracker/data/`
2. Maps old IDs to new database IDs
3. Preserves all relationships
4. Validates data during migration

---

## Error Handling

### Server Actions

All server actions return a consistent result type:

```typescript
type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };
```

### Client Components

- Use try/catch around server action calls
- Display errors using Alert component
- Show loading states during operations

---

## Performance Considerations

1. **Server Components**: Most pages use Server Components for initial data fetching
2. **Streaming**: Layout shows immediately while data loads
3. **Revalidation**: Use `revalidatePath()` after mutations
4. **Connection Pooling**: Neon handles connection pooling automatically
5. **Edge Runtime**: PDF routes use Node.js runtime for @react-pdf/renderer compatibility
