import { Document, Page, Text, View } from '@react-pdf/renderer';
import { commonStyles, COMPANY, COLORS } from '../styles';
import type { EstimateWithDetails } from '@/lib/actions/estimates';

interface EstimatePDFProps {
  estimate: EstimateWithDetails;
}

export function EstimatePDF({ estimate }: EstimatePDFProps) {
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
        <Text style={commonStyles.title}>ESTIMATE</Text>

        {/* Info Section */}
        <View style={commonStyles.infoSection}>
          <View style={commonStyles.infoColumn}>
            <Text style={commonStyles.infoLabel}>PREPARED FOR:</Text>
            <Text style={commonStyles.infoValue}>{estimate.customer?.name}</Text>
            <Text style={commonStyles.infoValue}>{estimate.customer?.phone}</Text>
            {estimate.customer?.email && (
              <Text style={commonStyles.infoValue}>{estimate.customer.email}</Text>
            )}
            {estimate.customer?.address && (
              <Text style={commonStyles.infoValue}>{estimate.customer.address}</Text>
            )}
          </View>
          <View style={commonStyles.infoColumn}>
            <Text style={commonStyles.infoLabel}>ESTIMATE NUMBER:</Text>
            <Text style={commonStyles.infoValue}>{estimate.estimateNumber}</Text>
            <Text style={commonStyles.infoLabel}>DATE:</Text>
            <Text style={commonStyles.infoValue}>{formatDate(estimate.estimateDate)}</Text>
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
          {estimate.lineItems.map((item, index) => (
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
            <Text style={[commonStyles.totalsLabel, commonStyles.totalFinal]}>TOTAL:</Text>
            <Text style={[commonStyles.totalsValue, commonStyles.totalFinal]}>
              {formatCurrency(estimate.totalAmount)}
            </Text>
          </View>
        </View>

        {/* Terms and Conditions */}
        <View style={commonStyles.termsSection}>
          <Text style={commonStyles.termsTitle}>TERMS AND CONDITIONS</Text>
          <Text style={commonStyles.termsText}>
            1. This estimate is valid for 30 days from the date above.
          </Text>
          <Text style={commonStyles.termsText}>
            2. A 50% deposit is required to begin work.
          </Text>
          <Text style={commonStyles.termsText}>
            3. Balance is due upon completion of work.
          </Text>
          <Text style={commonStyles.termsText}>
            4. Any changes to the scope of work may result in additional charges.
          </Text>
          <Text style={commonStyles.termsText}>
            5. All materials remain property of Jones General Contracting until final payment is received.
          </Text>
        </View>

        {/* Signature Section */}
        <View style={commonStyles.signatureSection}>
          <View style={commonStyles.signatureBox}>
            <View style={commonStyles.signatureLine} />
            <Text style={commonStyles.signatureLabel}>Customer Signature</Text>
          </View>
          <View style={commonStyles.signatureBox}>
            <View style={commonStyles.signatureLine} />
            <Text style={commonStyles.signatureLabel}>Date</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={commonStyles.footer}>
          Licensed, Bonded & Insured | {COMPANY.license}
        </Text>
      </Page>
    </Document>
  );
}
