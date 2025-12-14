import { Document, Page, Text, View } from '@react-pdf/renderer';
import { commonStyles, COMPANY, COLORS } from '../styles';
import type { InvoiceWithDetails } from '@/lib/actions/invoices';

interface InvoicePDFProps {
  invoice: InvoiceWithDetails;
}

export function InvoicePDF({ invoice }: InvoicePDFProps) {
  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const dueDate = invoice.invoiceDate
    ? new Date(new Date(invoice.invoiceDate).getTime() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]
    : null;

  return (
    <Document>
      <Page size="A4" style={commonStyles.page}>
        {/* Header */}
        <View style={commonStyles.header}>
          <View>
            <Text style={commonStyles.companyName}>{COMPANY.name}</Text>
            <Text style={commonStyles.companyTagline}>{COMPANY.tagline}</Text>
            <Text style={commonStyles.companyContact}>{COMPANY.license}</Text>
          </View>
          <View style={commonStyles.companyInfo}>
            <Text style={commonStyles.companyContact}>{COMPANY.phone}</Text>
            <Text style={commonStyles.companyContact}>{COMPANY.email}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={commonStyles.title}>INVOICE</Text>

        {/* Info Section */}
        <View style={commonStyles.infoSection}>
          <View style={commonStyles.infoColumn}>
            <Text style={commonStyles.infoLabel}>THIS WORK WAS COMPLETED BY:</Text>
            <Text style={commonStyles.infoValue}>{COMPANY.name}</Text>
            <Text style={commonStyles.infoValue}>{COMPANY.phone}</Text>
            <Text style={commonStyles.infoValue}>{COMPANY.email}</Text>
            <View style={{ marginTop: 10 }}>
              <Text style={commonStyles.infoLabel}>BILL TO:</Text>
              <Text style={commonStyles.infoValue}>{invoice.customer?.name}</Text>
              <Text style={commonStyles.infoValue}>{invoice.customer?.phone}</Text>
              {invoice.customer?.address && (
                <Text style={commonStyles.infoValue}>{invoice.customer.address}</Text>
              )}
            </View>
          </View>
          <View style={commonStyles.infoColumn}>
            <Text style={commonStyles.infoLabel}>INVOICE NUMBER:</Text>
            <Text style={commonStyles.infoValue}>{invoice.invoiceNumber || invoice.estimateNumber}</Text>
            <Text style={commonStyles.infoLabel}>INVOICE DATE:</Text>
            <Text style={commonStyles.infoValue}>{formatDate(invoice.invoiceDate)}</Text>
            <Text style={commonStyles.infoLabel}>DUE DATE:</Text>
            <Text style={commonStyles.infoValue}>{formatDate(dueDate)}</Text>
            <Text style={commonStyles.infoLabel}>ORIGINAL ESTIMATE:</Text>
            <Text style={commonStyles.infoValue}>{invoice.estimateNumber}</Text>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={commonStyles.table}>
          {/* Table Header */}
          <View style={commonStyles.tableHeader}>
            <Text style={[commonStyles.tableHeaderCell, commonStyles.colItemNo]}>ITEM #</Text>
            <Text style={[commonStyles.tableHeaderCell, commonStyles.colAction]}>ACTION</Text>
            <Text style={[commonStyles.tableHeaderCell, commonStyles.colDescription]}>DESCRIPTION OF WORK</Text>
            <Text style={[commonStyles.tableHeaderCell, commonStyles.colAmount]}>AMOUNT</Text>
          </View>

          {/* Table Rows */}
          {invoice.lineItems.map((item, index) => (
            <View
              key={item.id}
              style={[
                commonStyles.tableRow,
                index % 2 === 1 ? commonStyles.tableRowAlt : {},
              ]}
            >
              <Text style={[commonStyles.tableCell, commonStyles.colItemNo]}>{index + 1}</Text>
              <Text style={[commonStyles.tableCell, commonStyles.colAction]}>{item.action}</Text>
              <Text style={[commonStyles.tableCell, commonStyles.colDescription]}>{item.description}</Text>
              <Text style={[commonStyles.tableCell, commonStyles.colAmount]}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={commonStyles.totalsSection}>
          <View style={commonStyles.totalsRow}>
            <Text style={commonStyles.totalsLabel}>Sub Total:</Text>
            <Text style={commonStyles.totalsValue}>{formatCurrency(invoice.totalAmount)}</Text>
          </View>
          <View style={[commonStyles.totalsRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border }]}>
            <Text style={[commonStyles.totalsLabel, commonStyles.totalFinal]}>AMOUNT DUE:</Text>
            <Text style={[commonStyles.totalsValue, commonStyles.totalFinal]}>
              {formatCurrency(invoice.totalAmount)}
            </Text>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={{ marginTop: 20 }}>
          <Text style={commonStyles.termsTitle}>PAYMENT METHODS</Text>
          <Text style={commonStyles.termsText}>&#x2022; Check (payable to Jones General Contracting)</Text>
          <Text style={commonStyles.termsText}>&#x2022; Venmo</Text>
          <Text style={commonStyles.termsText}>&#x2022; Cash</Text>
        </View>

        {/* Terms and Conditions */}
        <View style={commonStyles.termsSection}>
          <Text style={commonStyles.termsTitle}>TERMS AND CONDITIONS</Text>
          <Text style={commonStyles.termsText}>
            1. Payment is due within 30 days of invoice date.
          </Text>
          <Text style={commonStyles.termsText}>
            2. A late fee of 1.5% per month will be applied to overdue balances.
          </Text>
          <Text style={commonStyles.termsText}>
            3. Please include invoice number with payment.
          </Text>
          <Text style={commonStyles.termsText}>
            4. Questions? Contact us at {COMPANY.phone} or {COMPANY.email}
          </Text>
        </View>

        {/* Thank You */}
        <View style={{ marginTop: 20, textAlign: 'center' }}>
          <Text style={{ fontSize: 12, color: COLORS.primary, fontWeight: 'bold' }}>
            Thank you for your business!
          </Text>
        </View>

        {/* Footer */}
        <Text style={commonStyles.footer}>
          Licensed, Bonded & Insured | {COMPANY.license}
        </Text>
      </Page>
    </Document>
  );
}
