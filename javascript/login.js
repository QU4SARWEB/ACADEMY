document.addEventListener('DOMContentLoaded', () => {
  // Init Lucide icons
  if (typeof lucide !== 'undefined') lucide.createIcons();
  // Hide loader
  const lo = document.getElementById('loadingOverlay');
  if (lo) lo.classList.add('hidden');

  const db = initSupabase();
  const form = document.getElementById('loginForm');
  const btn = document.getElementById('loginBtn');
  const msg = document.getElementById('loginMsg');
  const pwInput = document.getElementById('login_password');
  const pwToggle = document.getElementById('pwToggle');

  // Password toggle
  pwToggle.addEventListener('click', () => {
    const type = pwInput.type === 'password' ? 'text' : 'password';
    pwInput.type = type;
    pwToggle.innerHTML = type === 'password'
      ? '<i data-lucide="eye" size="18"></i>'
      : '<i data-lucide="eye-off" size="18"></i>';
    lucide.createIcons();
  });

  // Redirect if already logged in
  db.auth.getSession().then(({ data: { session } }) => {
    if (session) redirectByRole(session.user);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';
    btn.classList.add('loading');
    btn.disabled = true;

    const email = document.getElementById('login_email').value.trim();
    const password = pwInput.value;

    if (!email || !password) {
      showError('Completa todos los campos');
      return;
    }

    try {
      const { data, error } = await db.auth.signInWithPassword({ email, password });

      if (error) {
        const map = {
          'Invalid login credentials': 'Correo o contraseña incorrectos',
          'Email not confirmed': 'Confirma tu correo electrónico antes de iniciar sesión',
          'Invalid email': 'Correo electrónico inválido',
        };
        return showError(map[error.message] || error.message);
      }

      if (data.session) {
        await redirectByRole(data.user);
      }
    } catch (err) {
      showError('Error inesperado. Intenta de nuevo.');
      console.error(err);
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  });

  async function redirectByRole(user) {
    try {
      const { data: profile } = await db.from('profiles').select('role, status').eq('id', user.id).single();

      if (!profile) {
        window.location.href = '../index.html';
        return;
      }

      const roleRedirects = {
        admin: '../html/admin/dashboard.html',
        coach: '../html/coaches/dashboard.html',
        student: '../html/alumnos/dashboard.html',
        jugador: '../html/jugadores/dashboard.html',
      };

      window.location.href = roleRedirects[profile.role] || '../index.html';
    } catch {
      window.location.href = '../html/alumnos/dashboard.html';
    }
  }

  function showError(text) {
    msg.textContent = text;
    btn.classList.remove('loading');
    btn.disabled = false;
  }
});
