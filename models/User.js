const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },  
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  imagen: { type: String, default: '/uploads/default-profile.jpg' }, // 🔥 Imagen por defecto
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
