// Vistas y elementos
const loginView = document.getElementById('login-view');
const registerView = document.getElementById('register-view');
const dashboardView = document.getElementById('dashboard-view');
const welcomeMsg = document.getElementById('user-name');


const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const toRegister = document.getElementById('to-register');
const toLogin = document.getElementById('to-login');
const logoutBtn = document.getElementById('logout-btn');

const postForm = document.getElementById('postForm');
const titulo = document.getElementById('titulo');
const contenido = document.getElementById('contenido');
const imagenInput = document.getElementById('imagen');
const postsContainer = document.getElementById('postsContainer');

const togglePostBtn = document.getElementById('togglePostBtn');
const createPostContainer = document.getElementById('createPostContainer');

const baseURL = 'https://redsocial-l8sf.onrender.com';

// Verificar token al cargar
const token = localStorage.getItem('token');
if (token) {
  fetch(baseURL + '/me', { headers: { Authorization: `Bearer ${token}` } })
    .then(res => res.ok ? res.json() : Promise.reject())
    .then(data => {
      localStorage.setItem('name', data.name);
      welcomeMsg.textContent = `Bienvenido, ${data.name}`;
      mostrarVista('dashboard');
      cargarPosts();
    })
    .catch(() => localStorage.removeItem('token'));
}

// Navegación
toRegister.onclick = () => mostrarVista('register');
toLogin.onclick = () => mostrarVista('login');
logoutBtn.onclick = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('name');
  localStorage.removeItem('userId');
  mostrarVista('login');
};
// Toggle para abrir/cerrar formulario creación post
const postContainer = document.getElementById('createPostContainer');

togglePostBtn.addEventListener('click', () => {
  const isHidden = postContainer.classList.toggle('hidden');
  const icon = togglePostBtn.querySelector('span.material-icons');

  icon.textContent = isHidden ? 'add' : 'close';
});


// Login
loginForm.onsubmit = async (e) => {
  e.preventDefault();
  const email = loginForm.email.value;
  const password = loginForm.password.value;

  const res = await fetch(baseURL +'/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (!res.ok) return alert(data.error);

  localStorage.setItem('token', data.token);
  localStorage.setItem('name', data.name);
  welcomeMsg.textContent = `${data.name}`;
  localStorage.setItem('userId', data.userId || ''); // Ajusta si la API devuelve id usuario
  mostrarVista('dashboard');
  cargarPosts();
};

// Registro
registerForm.onsubmit = async (e) => {
  e.preventDefault();

  const formData = new FormData(registerForm); // 🔥 Esto captura la imagen correctamente

  const res = await fetch(baseURL +'/register', {
    method: 'POST',
    body: formData, // 🔥 Enviamos los datos como FormData, NO como JSON
  });

  const data = await res.json();
  if (!res.ok) return alert(data.error);

  localStorage.setItem('token', data.token);
  localStorage.setItem('name', data.name);
  localStorage.setItem('userId', data.userId);
  welcomeMsg.textContent = `${data.name}`;
  mostrarVista('dashboard');
  cargarPosts();
};


// Mostrar vistas
function mostrarVista(vista) {
  loginView.classList.add('hidden');
  registerView.classList.add('hidden');
  dashboardView.classList.add('hidden');

  if (vista === 'login') loginView.classList.remove('hidden');
  if (vista === 'register') registerView.classList.remove('hidden');
  if (vista === 'dashboard') dashboardView.classList.remove('hidden');
}

// Crear nuevo post con imagen opcional
postForm.onsubmit = async (e) => {
  e.preventDefault();

  const formData = new FormData();
  formData.append('titulo', titulo.value.trim());
  formData.append('contenido', contenido.value.trim());

  if (imagenInput.files.length > 0) {
    formData.append('imagen', imagenInput.files[0]);
  }

  const res = await fetch(baseURL +'/posts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    },
    body: formData
  });

  if (!res.ok) return alert('Error al crear el post');
  postForm.reset();
    if (!createPostContainer.classList.contains('hidden')) {
    createPostContainer.classList.add('hidden');
    if(togglePostBtn) togglePostBtn.textContent = '+';
  }
  cargarPosts();
};

// Cargar y mostrar posts
async function cargarPosts() {
  const res = await fetch(baseURL +'/posts');
  const posts = await res.json();
  postsContainer.innerHTML = '';

  posts.forEach(post => {
    const div = document.createElement('div');
    div.className = 'post';

    div.innerHTML = `
      <h3>${post.titulo}</h3>
       <p>
      <a href="/perfil/${post.author?._id || '#'}" class="author-link">
  <img src="${post.author?.imagen || '/uploads/default-profile.jpg'}" 
       alt="Foto de ${post.author?.name || 'Usuario desconocido'}" class="author-img"/>
  <strong>${post.author?.name || 'Usuario desconocido'}</strong>
</a>
    </p>
      <p>${post.contenido}</p>
      ${post.imagen ? `<img src="${post.imagen}" alt="Imagen del post" class="post-img"/>` : ''}
      <small>${new Date(post.fecha).toLocaleString()}</small>
     ${post.author && String(post.author._id) === localStorage.getItem('userId') ? `
        <button class="editPost">Editar</button>
        <button class="deletePost">Eliminar</button>
      ` : ''}
      <div class="comentarios">
  <h4>Comentarios:</h4>
  ${
    post.comentarios?.length
      ? post.comentarios.map(c => `
          <div class="comentario">
            <img class= "comentario-autor-img" src="${c.autor?.imagen || '/uploads/default-profile.jpg'}" 
                 alt="${c.autor?.name || 'Usuario desconocido'}" class="comment-img"/>
            <strong>${c.autor?.name || 'Usuario desconocido'}</strong>: 
            <span>${c.texto}</span>
          </div>
        `).join('')
      : '<p>No hay comentarios aún.</p>'
  }
</div>


      <form class="comentarioForm">
        <input type="text" name="texto" placeholder="Comentario" required />
        <button type="submit">Comentar</button>
      </form>
    `;

    const editBtn = div.querySelector('.editPost');
    if (editBtn) {
      editBtn.onclick = async () => {
        const nuevoTitulo = prompt('Nuevo título', post.titulo);
        const nuevoContenido = prompt('Nuevo contenido', post.contenido);
        if (!nuevoTitulo || !nuevoContenido) return;

        await fetch(baseURL +`/posts/${post.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ titulo: nuevoTitulo, contenido: nuevoContenido })
        });
        cargarPosts();
      };
    }

    const deleteBtn = div.querySelector('.deletePost');
    if (deleteBtn) {
      deleteBtn.onclick = async () => {
        if (!confirm('¿Eliminar este post?')) return;
        await fetch(baseURL + `/posts/${post.id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        cargarPosts();
      };
    }

    // Comentar
    div.querySelector('.comentarioForm').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const texto = fd.get('texto').trim();
      if (!texto) return alert('Comentario vacío');

      await fetch(baseURL +`/posts/${post.id}/comentarios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ texto })
      });
      cargarPosts();
    };

    postsContainer.appendChild(div);
  });
}

// Navegación de secciones internas del dashboard
const navHome = document.getElementById('nav-home');
const navSponsor = document.getElementById('nav-sponsor');
const navConfig = document.getElementById('nav-configuracion');

const homeView = document.getElementById('home-view');
const sponsorView = document.getElementById('sponsor-view');
const configView = document.getElementById('configuracion-content');

function mostrarSeccionDashboard(seccion) {
  homeView.classList.add('hidden');
  sponsorView.classList.add('hidden');
  configView.classList.add('hidden');

  if (seccion === 'home') homeView.classList.remove('hidden');
  if (seccion === 'sponsor') sponsorView.classList.remove('hidden');
  if (seccion === 'config') configView.classList.remove('hidden');
}

navHome.addEventListener('click', (e) => {
  e.preventDefault();
  mostrarSeccionDashboard('home');
});

navSponsor.addEventListener('click', (e) => {
  e.preventDefault();
  mostrarSeccionDashboard('sponsor');
});

navConfig.addEventListener('click', (e) => {
  e.preventDefault();
  mostrarSeccionDashboard('config');
});
