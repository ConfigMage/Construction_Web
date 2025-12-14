import { pgTable, serial, text, varchar, decimal, date, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Customers table
export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Jobs table (handles estimates, jobs, and invoices)
export const jobs = pgTable('jobs', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id').references(() => customers.id).notNull(),
  estimateNumber: varchar('estimate_number', { length: 20 }).notNull().unique(),
  invoiceNumber: varchar('invoice_number', { length: 20 }),
  estimateDate: date('estimate_date').notNull(),
  approvalDate: date('approval_date'),
  startDate: date('start_date'),
  completionDate: date('completion_date'),
  invoiceDate: date('invoice_date'),
  paymentDate: date('payment_date'),
  status: varchar('status', { length: 50 }).notNull().default('Estimate Created'),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull().default('0'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('jobs_customer_id_idx').on(table.customerId),
  index('jobs_status_idx').on(table.status),
]);

// Line Items table
export const lineItems = pgTable('line_items', {
  id: serial('id').primaryKey(),
  jobId: integer('job_id').references(() => jobs.id, { onDelete: 'cascade' }).notNull(),
  itemNumber: integer('item_number').notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  description: text('description'),
}, (table) => [
  index('line_items_job_id_idx').on(table.jobId),
]);

// Relations
export const customersRelations = relations(customers, ({ many }) => ({
  jobs: many(jobs),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  customer: one(customers, {
    fields: [jobs.customerId],
    references: [customers.id],
  }),
  lineItems: many(lineItems),
}));

export const lineItemsRelations = relations(lineItems, ({ one }) => ({
  job: one(jobs, {
    fields: [lineItems.jobId],
    references: [jobs.id],
  }),
}));

// Type exports
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type LineItem = typeof lineItems.$inferSelect;
export type NewLineItem = typeof lineItems.$inferInsert;

// Status type
export const JOB_STATUSES = [
  'Estimate Created',
  'Estimate Sent',
  'Approved',
  'In Progress',
  'Completed',
  'Invoiced',
  'Paid',
] as const;

export type JobStatus = typeof JOB_STATUSES[number];
