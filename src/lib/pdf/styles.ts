import { StyleSheet } from '@react-pdf/renderer';

// Company information
export const COMPANY = {
  name: 'JONES GENERAL CONTRACTING, LLC',
  tagline: 'Serving the Willamette Valley',
  license: 'CCB #247760',
  phone: '(971) 240-8071',
  email: 'jonesgcoregon@gmail.com',
};

// Colors
export const COLORS = {
  primary: '#FF6B35',
  secondary: '#4A4A4A',
  border: '#E0E0E0',
  lightGray: '#F5F5F5',
  white: '#FFFFFF',
};

// Common PDF styles
export const commonStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: COLORS.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  logo: {
    width: 60,
    height: 60,
  },
  companyInfo: {
    textAlign: 'right',
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  companyTagline: {
    fontSize: 10,
    color: COLORS.secondary,
    marginBottom: 2,
  },
  companyContact: {
    fontSize: 9,
    color: COLORS.secondary,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 20,
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  infoColumn: {
    width: '48%',
  },
  infoLabel: {
    fontSize: 8,
    color: '#757575',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 10,
    color: COLORS.secondary,
    marginBottom: 8,
  },
  table: {
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.secondary,
    padding: 8,
    color: COLORS.white,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    padding: 8,
    minHeight: 30,
  },
  tableRowAlt: {
    backgroundColor: COLORS.lightGray,
  },
  tableCell: {
    fontSize: 9,
  },
  colItemNo: {
    width: '8%',
  },
  colAction: {
    width: '15%',
  },
  colDescription: {
    width: '57%',
  },
  colAmount: {
    width: '20%',
    textAlign: 'right',
  },
  totalsSection: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
    width: 200,
  },
  totalsLabel: {
    fontSize: 10,
    width: 100,
    textAlign: 'right',
    paddingRight: 10,
  },
  totalsValue: {
    fontSize: 10,
    width: 100,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  totalFinal: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  termsSection: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  termsTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  termsText: {
    fontSize: 8,
    color: '#757575',
    lineHeight: 1.4,
    marginBottom: 4,
  },
  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
  },
  signatureBox: {
    width: '45%',
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.secondary,
    marginBottom: 4,
    height: 30,
  },
  signatureLabel: {
    fontSize: 8,
    color: '#757575',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#757575',
  },
});
