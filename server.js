require('dotenv').config();
const connectDB = require('./database');
connectDB();

const mongoose = require('mongoose');
const upload = require('./config/upload'); // 🔥 Ahora usamos la configuración externa
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const User = require('./models/User');
const Post = require('./models/Post');

const app = express();
const port = process.env.PORT ?? 1234;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Crear carpeta uploads si no existe
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
// Middleware auth
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no enviado o malformado' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// Registro con imagen
app.post('/register', upload.single('imagenPerfil'), async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Faltan campos obligatorios' });

  try {
    const usuarioExistente = await User.findOne({ email });
    if (usuarioExistente)
      return res.status(409).json({ error: 'Usuario ya registrado' });

    const hashedPassword = await bcrypt.hash(password, 10);

    // 🔥 Asegura que la imagen siempre tenga un valor
    const imagenPerfil = req.file ? `/uploads/${req.file.filename}` : '/uploads/default-profile.jpg';

    console.log("Imagen guardada:", imagenPerfil); // Debugging

    const nuevoUsuario = new User({ name, email, password: hashedPassword, imagen: imagenPerfil });
    await nuevoUsuario.save();

    const token = jwt.sign({ _id: nuevoUsuario._id, name, email, imagen: nuevoUsuario.imagen }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({ message: 'Registrado', token, userId: nuevoUsuario._id, name, imagen: nuevoUsuario.imagen });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ error: 'Credenciales inválidas' });

  const token = jwt.sign({
  _id: user._id,
  name: user.name,
  email: user.email,
  imagen: user.imagen || '/uploads/default-profile.jpg'
}, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ message: 'Login exitoso', token, name: user.name });
});

app.get('/me', authMiddleware, (req, res) => {
  res.json({ name: req.user.name, email: req.user.email });
});

// Foto de perfil (actualización)
app.post('/perfil/foto', authMiddleware, upload.single('imagenPerfil'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se ha subido ninguna imagen' });

    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    user.imagen = `/uploads/${req.file.filename}`;
    await user.save();

    res.json({ mensaje: 'Foto de perfil actualizada', imagen: user.imagen });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar la foto de perfil' });
  }
});

// Perfil
app.get('/perfil/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send('ID inválido');
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const posts = await Post.find({ author: user._id }).populate('author', 'name imagen');

    // 🔥 Garantiza que la imagen del usuario siempre tenga un valor
    const imagenPerfil = user.imagen && user.imagen !== 'null'
  ? user.imagen
  : '/uploads/default-profile.jpg';

    res.render('perfil', {
      user: { ...user.toObject(), imagen: imagenPerfil },
      posts,
    });
  } catch (error) {
    console.error('Error en /perfil/:id:', error);
    res.status(500).send({ error: 'Error al obtener el perfil' });
  }
});

// Crear post
app.post('/posts', authMiddleware, upload.single('imagen'), async (req, res) => {
  const { titulo, contenido } = req.body;
  if (!titulo || !contenido)
    return res.status(400).json({ error: 'Faltan campos' });

  const nuevoPost = new Post({
    author: req.user._id, // 👈 Esto es el ObjectId del usuario
    titulo,
    contenido,
    imagen: req.file ? `/uploads/${req.file.filename}` : null,
    fecha: new Date(),
    comentarios: []
  });

  await nuevoPost.save();
  res.status(201).json(nuevoPost);
});

// Listar posts
// Listar posts
app.get('/posts', async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('author', 'name imagen')                // Incluye imagen del autor del post
      .populate('comentarios.autor', 'name imagen')     // Incluye nombre e imagen de autores de comentarios
      .sort({ fecha: -1 });

    // Convertir a objetos planos para evitar errores con Mongoose
    const postsConId = posts.map(p => {
      const postObj = p.toObject(); // 🔥 convierte a JSON plano
      return {
        ...postObj,
        id: postObj._id,
        author: postObj.author || null, // Asegura que author exista
        comentarios: postObj.comentarios?.map(c => ({
          ...c,
          autor: c.autor || null // Asegura que autor de comentario exista
        })) || []
      };
    });

    res.json(postsConId);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener posts' });
  }
});

// Editar post
app.put('/posts/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { titulo, contenido } = req.body;
  const post = await Post.findById(id);
  if (!post) return res.status(404).json({ error: 'Post no encontrado' });
  if (post.autor !== req.user.name) return res.status(403).json({ error: 'No autorizado' });

  if (titulo) post.titulo = titulo;
  if (contenido) post.contenido = contenido;

  await post.save();
  res.json(post);
});

// Eliminar post
app.delete('/posts/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const post = await Post.findById(id);
  if (!post) return res.status(404).json({ error: 'Post no encontrado' });
  if (post.autor !== req.user.name) return res.status(403).json({ error: 'No autorizado' });

  await post.deleteOne();
  res.json({ mensaje: 'Post eliminado' });
});

// Comentar
app.post('/posts/:id/comentarios', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { texto } = req.body;
  if (!texto) return res.status(400).json({ error: 'Falta el texto' });

  try {
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ error: 'Post no encontrado' });

    const nuevoComentario = {
      autor: new mongoose.Types.ObjectId(req.user._id), // 🔥 Guarda el ID del usuario correctamente
      texto,
      fecha: new Date()
    };

    post.comentarios.push(nuevoComentario);
    await post.save();

    res.status(201).json(nuevoComentario);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al agregar comentario' });
  }
});


app.get('/posts/:id/comentarios', async (req, res) => {
   try {
    const { id } = req.params;
    const post = await Post.findById(id).populate('comentarios.autor', 'name imagen');
    if (!post) return res.status(404).json({ error: 'Post no encontrado' });

    res.json(post.comentarios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener comentarios' });
  }
});

// 404
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(port, () => {
  console.log(`✅ Servidor en http://localhost:${port}`);
});
