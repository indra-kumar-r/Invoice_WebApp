export interface GstInvoice {
  invoiceNo: string;
  companyName: string;
  companyGstNo: string;
  date: string;
  igst: number | null;
  cgst: number | null;
  sgst: number | null;
  grandTotal: number;
}

export interface GstDetails {
  month: number;
  year: number;
  count: number;
  data: GstInvoice[];
}
