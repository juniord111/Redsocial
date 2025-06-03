const mongoose = require('mongoose');

const comentariosSchema = new mongoose.Schema({
  autor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Ahora `autor` también usa `_id`
  texto: String,
  fecha: {
    type: Date,
    default: Date.now,
  },
});

const postSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Se mantiene como referencia a `User`
  titulo: { type: String, required: true },
  contenido: { type: String, required: true },
  fecha: { type: Date, default: Date.now },
  imagen: String,
  comentarios: [comentariosSchema],
});

module.exports = mongoose.model('Post', postSchema);
