import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  productType: { type: String, required: true },
  width: { type: String, required: true },
  height: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  profile: { type: String, required: true },
  glassType: { type: String },
  hardware: { type: String },
  remarks: { type: String, trim: true }
}, {
  timestamps: true
});

export default mongoose.model('Project', projectSchema);
