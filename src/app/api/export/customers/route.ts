import { NextResponse } from 'next/server';
import { getAllCustomers } from '@/lib/actions/customers';
import { exportToExcel, formatCustomersForExport } from '@/lib/utils/excel';

export async function GET() {
  try {
    const customers = await getAllCustomers();
    const formattedData = formatCustomersForExport(customers);
    const buffer = exportToExcel(formattedData, 'Customers');

    const dateStr = new Date().toISOString().split('T')[0];

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="customers_export_${dateStr}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Error exporting customers:', error);
    return NextResponse.json(
      { error: 'Failed to export customers' },
      { status: 500 }
    );
  }
}
