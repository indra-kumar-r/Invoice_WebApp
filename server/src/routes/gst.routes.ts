import express from 'express';
import { getGst } from '../controllers/gst.controller.js';

const router = express.Router();

router.get('/', getGst);

export default router;
