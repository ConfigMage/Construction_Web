# Jones General Contracting - Job Tracker

A modern web application for managing estimates, invoices, and job tracking for Jones General Contracting LLC. Built with Next.js 15, Neon PostgreSQL, and deployed on Vercel.

## Features

- **Customer Management**: Full CRUD operations with duplicate phone checking
- **Estimate Creation**: Auto-generated estimate numbers (format: YYMMDDTXXXL)
- **Job Tracking**: Visual workflow from estimate to payment
- **Invoice Generation**: Auto-generated invoice numbers with payment tracking
- **PDF Generation**: Professional estimates and invoices matching company templates
- **Excel Export**: Export customers, invoices, and reports to Excel
- **Dashboard**: Quick stats, recent activity, and action buttons
- **Authentication**: Secure login with NextAuth.js

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Neon PostgreSQL (Serverless)
- **ORM**: Drizzle ORM
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js v5
- **PDF Generation**: @react-pdf/renderer
- **Excel Export**: SheetJS (xlsx)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm or yarn
- A Neon PostgreSQL database ([Sign up free](https://neon.tech))

### Environment Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/ConfigMage/Construction_Web.git
   cd Construction_Web/jones-gc-web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file based on the example:
   ```bash
   cp .env.local.example .env.local
   ```

4. Update `.env.local` with your values:
   ```env
   DATABASE_URL=postgresql://user:password@host.neon.tech/jones_gc?sslmode=require
   NEXTAUTH_SECRET=your-generated-secret-key
   NEXTAUTH_URL=http://localhost:3000
   ADMIN_USERNAME=your-admin-username
   ADMIN_PASSWORD=your-secure-password
   ```

   Generate a secret key:
   ```bash
   openssl rand -base64 32
   ```

### Database Setup

1. Push the schema to your Neon database:
   ```bash
   npm run db:push
   ```

2. (Optional) If migrating from the Excel-based version:
   ```bash
   npx tsx scripts/migrate-data.ts
   ```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment to Vercel

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ConfigMage/Construction_Web)

### Manual Deployment

1. Push your code to GitHub

2. Import the project in [Vercel Dashboard](https://vercel.com/new)

3. Set the **Root Directory** to `jones-gc-web`

4. Add environment variables in Vercel:
   - `DATABASE_URL` - Your Neon connection string
   - `NEXTAUTH_SECRET` - Your secret key
   - `NEXTAUTH_URL` - Your production URL (e.g., https://your-app.vercel.app)
   - `ADMIN_USERNAME` - Admin login username
   - `ADMIN_PASSWORD` - Admin login password

5. Deploy!

## Project Structure

```
jones-gc-web/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/            # Authentication pages
│   │   │   └── login/         # Login page
│   │   ├── (dashboard)/       # Protected dashboard pages
│   │   │   ├── customers/     # Customer management
│   │   │   ├── estimates/     # Estimate management
│   │   │   ├── jobs/          # Job tracking
│   │   │   ├── invoices/      # Invoice management
│   │   │   └── reports/       # Search and reports
│   │   └── api/               # API routes
│   │       ├── auth/          # NextAuth API
│   │       ├── export/        # Excel export endpoints
│   │       └── pdf/           # PDF generation endpoints
│   ├── components/            # React components
│   │   ├── ui/               # Base UI components
│   │   ├── layout/           # Layout components
│   │   ├── forms/            # Form components
│   │   └── data-display/     # Data display components
│   └── lib/                  # Library code
│       ├── actions/          # Server Actions
│       ├── db/               # Database schema and connection
│       ├── pdf/              # PDF templates
│       └── utils/            # Utility functions
├── scripts/                  # Utility scripts
│   └── migrate-data.ts      # Data migration script
└── drizzle/                 # Database migrations
```

## Business Logic

### Estimate Number Format
Format: `YYMMDDTXXXL` (e.g., `250713T954B`)
- `YYMM DD` - Date (year, month, day)
- `T` - Type indicator
- `XXX` - Random 3-digit number
- `L` - Sequence letter (A, B, C...)

### Invoice Number Format
Format: `YYMMDDXXX` (e.g., `250713001`)
- `YYMMDD` - Date
- `XXX` - Sequential number for the day

### Job Status Workflow
```
Estimate Created → Estimate Sent → Approved → In Progress → Completed → Invoiced → Paid
```

### Business Rules
- Phone numbers auto-format to `(XXX) XXX-XXXX`
- Cannot delete customers with existing jobs
- Cannot edit estimates after approval
- Jobs must follow the status workflow in order

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Drizzle migrations
- `npm run db:push` - Push schema to database
- `npm run db:studio` - Open Drizzle Studio

## License

Private - Jones General Contracting LLC

## Support

For issues and feature requests, please open an issue on [GitHub](https://github.com/ConfigMage/Construction_Web/issues).
