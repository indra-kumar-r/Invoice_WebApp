import Invoice from '../models/invoice.model.js';

// Get GST
export const getGst = async (_req: any, res: any) => {
    try {
        const { month, year } = _req.query;

        if (!month || !year) {
            return res.status(400).json({
                message: 'month and year are required',
            });
        }

        const monthParam = Number(month);
        const yearParam = Number(year);

        if (monthParam < 1 || monthParam > 12) {
            return res.status(400).json({ message: 'Invalid month' });
        }

        const startDate = new Date(yearParam, monthParam - 1, 1);
        const endDate = new Date(yearParam, monthParam, 1);

        const rawInvoices = await Invoice.find(
            {
                date: {
                    $gte: startDate,
                    $lt: endDate,
                },
            },
            {
                _id: 0,
                date: 1,
                company_name: 1,
                company_gst_no: 1,
                invoice_no: 1,
                igst: 1,
                cgst: 1,
                sgst: 1,
                grand_total: 1,
            }
        ).sort({ date: 1 });

        const invoices = rawInvoices.map((inv) => ({
            invoiceNo: inv.invoice_no,
            companyName: inv.company_name,
            companyGstNo: inv.company_gst_no,
            date: inv.date,
            igst: inv.igst ?? null,
            cgst: inv.cgst ?? null,
            sgst: inv.sgst ?? null,
            grandTotal: inv.grand_total,
        }));

        return res.json({
            month: monthParam,
            year: yearParam,
            count: invoices.length,
            data: invoices,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching invoices', error });
    }
};
