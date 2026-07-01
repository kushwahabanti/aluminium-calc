import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  address: { type: String, trim: true },
  notes: { type: String, trim: true }
}, { 
  timestamps: true 
});

export default mongoose.model('Customer', customerSchema);
