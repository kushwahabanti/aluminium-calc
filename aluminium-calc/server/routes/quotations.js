import express from 'express';
import Quotation from '../models/Quotation.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware
router.use(auth);

// GET all quotations
router.get('/', async (req, res) => {
  try {
    const quotations = await Quotation.find({ userId: req.user.id }).populate('customer').populate('projects').sort({ createdAt: -1 });
    res.json(quotations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET quotations by customer ID
router.get('/customer/:customerId', async (req, res) => {
  try {
    const quotations = await Quotation.find({ customer: req.params.customerId, userId: req.user.id }).populate('projects').sort({ createdAt: -1 });
    res.json(quotations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST generate new quotation
router.post('/', async (req, res) => {
  const quotation = new Quotation({ ...req.body, userId: req.user.id });
  try {
    const newQuotation = await quotation.save();
    res.status(201).json(newQuotation);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE quotation
router.delete('/:id', async (req, res) => {
  try {
    const quotation = await Quotation.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!quotation) return res.status(404).json({ message: 'Quotation not found' });
    res.json({ message: 'Quotation deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
