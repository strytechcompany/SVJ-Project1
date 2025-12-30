const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
