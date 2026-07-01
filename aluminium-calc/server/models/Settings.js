import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  companyName: { type: String, default: 'My Fabrication Company' },
  address: { type: String, default: '' },
  phone: { type: String, default: '' },
  gst: { type: String, default: '' },
  logoUrl: { type: String, default: '' },
  defaultProfitMargin: { type: Number, default: 20 },
  currency: { type: String, default: 'INR' },
  configuration: { type: mongoose.Schema.Types.Mixed, default: {} }
}, {
  timestamps: true
});

export default mongoose.model('Settings', settingsSchema);
