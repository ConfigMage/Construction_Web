import * as XLSX from 'xlsx';

/**
 * Export data to Excel format
 */
export function exportToExcel(data: any[], sheetName: string = 'Sheet1'): Buffer {
  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Create worksheet from data
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Auto-size columns
  const maxWidths: number[] = [];
  const headers = Object.keys(data[0] || {});

  headers.forEach((header, i) => {
    maxWidths[i] = header.length;
  });

  data.forEach((row) => {
    headers.forEach((header, i) => {
      const value = row[header];
      const length = value ? String(value).length : 0;
      if (length > maxWidths[i]) {
        maxWidths[i] = Math.min(length, 50); // Cap at 50 chars
      }
    });
  });

  worksheet['!cols'] = maxWidths.map((w) => ({ wch: w + 2 }));

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Generate buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return buffer;
}

/**
 * Format customer data for export
 */
export function formatCustomersForExport(customers: any[]) {
  return customers.map((c) => ({
    Name: c.name,
    Phone: c.phone,
    Email: c.email || '',
    Address: c.address || '',
    Notes: c.notes || '',
    'Date Added': c.createdAt
      ? new Date(c.createdAt).toLocaleDateString()
      : '',
  }));
}

/**
 * Format estimates for export
 */
export function formatEstimatesForExport(estimates: any[]) {
  return estimates.map((e) => ({
    'Estimate #': e.estimateNumber,
    Date: e.estimateDate,
    Customer: e.customer?.name || '',
    Phone: e.customer?.phone || '',
    'Total Amount': parseFloat(e.totalAmount || 0),
    Status: e.status,
    Notes: e.notes || '',
  }));
}

/**
 * Format invoices for export
 */
export function formatInvoicesForExport(invoices: any[]) {
  return invoices.map((inv) => ({
    'Invoice #': inv.invoiceNumber || inv.estimateNumber,
    'Invoice Date': inv.invoiceDate || '',
    Customer: inv.customer?.name || '',
    Phone: inv.customer?.phone || '',
    Amount: parseFloat(inv.totalAmount || 0),
    Status: inv.status,
    'Payment Date': inv.paymentDate || '',
  }));
}

/**
 * Format jobs for export
 */
export function formatJobsForExport(jobs: any[]) {
  return jobs.map((j) => ({
    'Job #': j.estimateNumber,
    Customer: j.customer?.name || '',
    'Estimate Date': j.estimateDate || '',
    'Approval Date': j.approvalDate || '',
    'Start Date': j.startDate || '',
    'Completion Date': j.completionDate || '',
    'Invoice Date': j.invoiceDate || '',
    'Payment Date': j.paymentDate || '',
    Status: j.status,
    Amount: parseFloat(j.totalAmount || 0),
    Notes: j.notes || '',
  }));
}
