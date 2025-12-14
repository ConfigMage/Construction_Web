import { db, jobs } from '@/lib/db';
import { like, sql } from 'drizzle-orm';

/**
 * Generate estimate number in format: YYMMDDTXXXL
 * - YY: 2-digit year
 * - MM: month (01-12)
 * - DD: day (01-31)
 * - T: literal separator
 * - XXX: random 3-digit number (100-999)
 * - L: sequence letter (A, B, C...) for multiple estimates on same day
 *
 * Example: 2507T954B (July 5, 2025, random 954, letter B)
 */
export async function generateEstimateNumber(): Promise<string> {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  const datePrefix = `${year}${month}${day}`;

  // Count today's estimates to determine sequence letter
  const todayPattern = `${datePrefix}%`;
  const todayEstimates = await db
    .select({ count: sql<number>`count(*)` })
    .from(jobs)
    .where(like(jobs.estimateNumber, todayPattern));

  const count = Number(todayEstimates[0]?.count || 0);
  const sequenceLetter = String.fromCharCode(65 + count); // A=65, B=66, etc.

  // Generate random 3-digit number (100-999)
  const randomDigits = Math.floor(100 + Math.random() * 900).toString();

  return `${datePrefix}T${randomDigits}${sequenceLetter}`;
}

/**
 * Generate invoice number in format: YYMMDDXXX
 * - YY: 2-digit year
 * - MM: month (01-12)
 * - DD: day (01-31)
 * - XXX: 3-digit sequence number (001, 002, etc.)
 *
 * Example: 250714001 (July 14, 2025, sequence 001)
 */
export async function generateInvoiceNumber(): Promise<string> {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  const datePrefix = `${year}${month}${day}`;

  // Count today's invoices to determine sequence
  const todayPattern = `${datePrefix}%`;
  const todayInvoices = await db
    .select({ count: sql<number>`count(*)` })
    .from(jobs)
    .where(like(jobs.invoiceNumber, todayPattern));

  const count = Number(todayInvoices[0]?.count || 0);
  const sequenceNumber = (count + 1).toString().padStart(3, '0');

  return `${datePrefix}${sequenceNumber}`;
}

/**
 * Parse estimate number to extract date components
 */
export function parseEstimateNumber(estimateNumber: string): {
  year: number;
  month: number;
  day: number;
  random: string;
  sequence: string;
} | null {
  // Format: YYMMDDTXXXL
  const match = estimateNumber.match(/^(\d{2})(\d{2})(\d{2})T(\d{3})([A-Z])$/);

  if (!match) return null;

  return {
    year: 2000 + parseInt(match[1]),
    month: parseInt(match[2]),
    day: parseInt(match[3]),
    random: match[4],
    sequence: match[5],
  };
}

/**
 * Parse invoice number to extract date components
 */
export function parseInvoiceNumber(invoiceNumber: string): {
  year: number;
  month: number;
  day: number;
  sequence: number;
} | null {
  // Format: YYMMDDXXX
  const match = invoiceNumber.match(/^(\d{2})(\d{2})(\d{2})(\d{3})$/);

  if (!match) return null;

  return {
    year: 2000 + parseInt(match[1]),
    month: parseInt(match[2]),
    day: parseInt(match[3]),
    sequence: parseInt(match[4]),
  };
}
