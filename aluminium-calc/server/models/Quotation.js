import mongoose from 'mongoose';

const quotationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  projects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
  totalMaterialCost: { type: Number, required: true },
  labourCost: { type: Number, default: 0 },
  additionalCharges: { type: Number, default: 0 },
  profitPercentage: { type: Number, default: 0 },
  finalPrice: { type: Number, required: true },
  snapshot: { type: Object } // Store a static JSON snapshot of the cut list in case formulas change later
}, {
  timestamps: true
});

export default mongoose.model('Quotation', quotationSchema);
