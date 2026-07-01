import express from 'express';
import Project from '../models/Project.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware to all project routes
router.use(auth);

// GET all projects
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find({ userId: req.user.id }).populate('customer').sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET projects by customer ID
router.get('/customer/:customerId', async (req, res) => {
  try {
    const projects = await Project.find({ customer: req.params.customerId, userId: req.user.id }).sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST new project
router.post('/', async (req, res) => {
  const project = new Project({ ...req.body, userId: req.user.id });
  try {
    const newProject = await project.save();
    res.status(201).json(newProject);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update project
router.put('/:id', async (req, res) => {
  try {
    const updatedProject = await Project.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    );
    if (!updatedProject) return res.status(404).json({ message: 'Project not found' });
    res.json(updatedProject);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE project
router.delete('/:id', async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
