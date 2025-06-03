require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI no está definido');
  }
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
  } catch (error) {
    console.error('Error al conectar a MongoDB:', error);
  }
}
mongoose.connection.once('open', () => {
    console.log('🧭 Base de datos conectada:', mongoose.connection.name);
  });
  
module.exports = connectDB;
