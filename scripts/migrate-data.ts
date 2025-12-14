/**
 * Data Migration Script
 *
 * This script migrates data from the existing Excel files to the Neon PostgreSQL database.
 *
 * Usage:
 * 1. Set up your .env.local with DATABASE_URL
 * 2. Run: npx tsx scripts/migrate-data.ts
 *
 * Note: Run this script only once after setting up the database.
 */

import * as XLSX from 'xlsx';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as path from 'path';
import * as fs from 'fs';

// Schema imports would go here
// import { customers, jobs, lineItems } from '../src/lib/db/schema';

async function migrateData() {
  console.log('Starting data migration...\n');

  // Check for environment variable
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is not set');
    console.log('Please create a .env.local file with your Neon database URL');
    process.exit(1);
  }

  // Define paths to Excel files (adjust paths as needed)
  const dataDir = path.join(__dirname, '../../jones-gc-tracker/data');
  const customersFile = path.join(dataDir, 'Customers.xlsx');
  const jobsFile = path.join(dataDir, 'Jobs.xlsx');
  const lineItemsFile = path.join(dataDir, 'LineItems.xlsx');

  // Check if files exist
  if (!fs.existsSync(customersFile)) {
    console.log('No existing data files found. Skipping migration.');
    console.log('Expected path:', customersFile);
    return;
  }

  try {
    // Connect to database
    const sql = neon(process.env.DATABASE_URL);
    const db = drizzle(sql);

    console.log('Connected to database.\n');

    // Read Excel files
    console.log('Reading Excel files...');

    const customersWb = XLSX.readFile(customersFile);
    const customersSheet = customersWb.Sheets[customersWb.SheetNames[0]];
    const customersData: any[] = XLSX.utils.sheet_to_json(customersSheet);
    console.log(`Found ${customersData.length} customers`);

    const jobsWb = XLSX.readFile(jobsFile);
    const jobsSheet = jobsWb.Sheets[jobsWb.SheetNames[0]];
    const jobsData: any[] = XLSX.utils.sheet_to_json(jobsSheet);
    console.log(`Found ${jobsData.length} jobs`);

    const lineItemsWb = XLSX.readFile(lineItemsFile);
    const lineItemsSheet = lineItemsWb.Sheets[lineItemsWb.SheetNames[0]];
    const lineItemsData: any[] = XLSX.utils.sheet_to_json(lineItemsSheet);
    console.log(`Found ${lineItemsData.length} line items\n`);

    // Create ID mapping
    const customerIdMap = new Map<number, number>();
    const jobIdMap = new Map<number, number>();

    // Migrate customers
    console.log('Migrating customers...');
    for (const c of customersData) {
      const result = await sql`
        INSERT INTO customers (name, phone, email, address, notes, created_at)
        VALUES (
          ${c.Name || ''},
          ${c.Phone || ''},
          ${c.Email || null},
          ${c.Address || null},
          ${c.Notes || null},
          ${c.DateAdded ? new Date(c.DateAdded) : new Date()}
        )
        RETURNING id
      `;
      customerIdMap.set(c.CustomerID, result[0].id);
    }
    console.log(`Migrated ${customersData.length} customers\n`);

    // Migrate jobs
    console.log('Migrating jobs...');
    for (const j of jobsData) {
      const newCustomerId = customerIdMap.get(j.CustomerID);
      if (!newCustomerId) {
        console.warn(`Warning: Customer ID ${j.CustomerID} not found, skipping job ${j.JobID}`);
        continue;
      }

      const result = await sql`
        INSERT INTO jobs (
          customer_id, estimate_number, invoice_number,
          estimate_date, approval_date, start_date, completion_date,
          invoice_date, payment_date, status, total_amount, notes
        )
        VALUES (
          ${newCustomerId},
          ${j.EstimateNumber || ''},
          ${j.InvoiceNumber || null},
          ${j.EstimateDate || new Date().toISOString().split('T')[0]},
          ${j.ApprovalDate || null},
          ${j.StartDate || null},
          ${j.CompletionDate || null},
          ${j.InvoiceDate || null},
          ${j.PaymentDate || null},
          ${j.Status || 'Estimate Created'},
          ${j.TotalAmount || '0'},
          ${j.Notes || null}
        )
        RETURNING id
      `;
      jobIdMap.set(j.JobID, result[0].id);
    }
    console.log(`Migrated ${jobsData.length} jobs\n`);

    // Migrate line items
    console.log('Migrating line items...');
    let lineItemCount = 0;
    for (const li of lineItemsData) {
      const newJobId = jobIdMap.get(li.JobID);
      if (!newJobId) {
        console.warn(`Warning: Job ID ${li.JobID} not found, skipping line item ${li.ItemID}`);
        continue;
      }

      await sql`
        INSERT INTO line_items (job_id, item_number, action, amount, description)
        VALUES (
          ${newJobId},
          ${li.ItemNumber || 1},
          ${li.Action || ''},
          ${li.Amount || '0'},
          ${li.Description || ''}
        )
      `;
      lineItemCount++;
    }
    console.log(`Migrated ${lineItemCount} line items\n`);

    console.log('='.repeat(50));
    console.log('Migration completed successfully!');
    console.log('='.repeat(50));
    console.log(`\nSummary:`);
    console.log(`- Customers: ${customersData.length}`);
    console.log(`- Jobs: ${jobsData.length}`);
    console.log(`- Line Items: ${lineItemCount}`);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateData();
