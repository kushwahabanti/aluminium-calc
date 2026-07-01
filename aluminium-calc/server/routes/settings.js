import express from 'express';
import Settings from '../models/Settings.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware
router.use(auth);

// GET settings (one document per user)
router.get('/', async (req, res) => {
  try {
    let settings = await Settings.findOne({ userId: req.user.id });
    if (!settings) {
      settings = await Settings.create({ userId: req.user.id });
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update settings
router.put('/', async (req, res) => {
  try {
    let settings = await Settings.findOne({ userId: req.user.id });
    if (settings) {
      settings = await Settings.findByIdAndUpdate(settings._id, req.body, { new: true });
    } else {
      settings = await Settings.create({ ...req.body, userId: req.user.id });
    }
    res.json(settings);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
