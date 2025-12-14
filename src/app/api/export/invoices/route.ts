import { NextResponse } from 'next/server';
import { getAllInvoices } from '@/lib/actions/invoices';
import { exportToExcel, formatInvoicesForExport } from '@/lib/utils/excel';

export async function GET() {
  try {
    const invoices = await getAllInvoices();
    const formattedData = formatInvoicesForExport(invoices);
    const buffer = exportToExcel(formattedData, 'Invoices');

    const dateStr = new Date().toISOString().split('T')[0];

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="invoices_export_${dateStr}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Error exporting invoices:', error);
    return NextResponse.json(
      { error: 'Failed to export invoices' },
      { status: 500 }
    );
  }
}
