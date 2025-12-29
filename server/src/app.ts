import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import companyRoutes from './routes/company.routes.js';
import invoiceRoutes from './routes/invoice.routes.js';
import gstRoutes from './routes/gst.routes.js';

dotenv.config();

const app = express();

app.use(
    cors({
        origin: 'http://localhost:4800',
        credentials: true,
    })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/companies', companyRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/gst', gstRoutes);

export default app;
