document.addEventListener('DOMContentLoaded', () => {
  const db = initSupabase();
  const form = document.getElementById('registerForm');
  const btn = document.getElementById('regBtn');
  const msg = document.getElementById('registerMsg');

  // Toggle role checkboxes on label click
  document.addEventListener('click', (e) => {
    const lbl = e.target.closest('.role-opt');
    if (!lbl) return;
    const cb = lbl.querySelector('input[type=checkbox]');
    if (!cb) return;
    cb.checked = !cb.checked;
    lbl.classList.toggle('checked', cb.checked);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';
    msg.className = 'form-msg';
    btn.classList.add('loading');
    btn.disabled = true;

    // Get values
    const name = document.getElementById('reg_name').value.trim();
    const age = document.getElementById('reg_age').value;
    const discord = document.getElementById('reg_discord').value.trim();
    const valorant = document.getElementById('reg_valorant').value.trim();
    const rank = document.getElementById('reg_rank').value;
    const mainRole = document.getElementById('reg_role').value;
    const server = document.getElementById('reg_server').value;
    const avail = document.getElementById('reg_avail').value;
    const objectives = document.getElementById('reg_objectives').value.trim();
    const reason = document.getElementById('reg_reason').value.trim();
    const email = document.getElementById('reg_email').value.trim();
    const password = document.getElementById('reg_password').value;
    const confirm = document.getElementById('reg_confirm').value;
    const terms = document.getElementById('reg_terms').checked;

    const selectedRoles = [];
    document.querySelectorAll('#reg_roles input:checked').forEach((cb) => {
      selectedRoles.push(cb.value);
    });

    // Validation
    if (!name) { return showError('El nombre es obligatorio'); }
    if (!email) { return showError('El correo electrónico es obligatorio'); }
    if (password.length < 6) { return showError('La contraseña debe tener al menos 6 caracteres'); }
    if (password !== confirm) { return showError('Las contraseñas no coinciden'); }
    if (!terms) { return showError('Debes aceptar los términos y condiciones'); }

    if (!db) { return showError('Error de conexión. Recarga la página.'); }

    try {
      // Step 1: Sign up
      const { data: authData, error: authError } = await db.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
        },
      });

      if (authError) {
        const map = {
          'User already registered': 'Este correo ya está registrado',
          'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres',
          'Invalid email': 'Correo electrónico inválido',
          'Email rate limit exceeded': 'Demasiados intentos. Espera un momento',
        };
        return showError(map[authError.message] || authError.message);
      }

      if (!authData.user) {
        return showError('Error al crear la cuenta. Intenta de nuevo.');
      }

      // Step 2: Update profile with registration data
      const { error: profileError } = await db.from('profiles').update({
        full_name: name,
        age: age || null,
        discord_user: discord,
        valorant_name: valorant,
        rank,
        role: mainRole,
        server,
        availability: avail,
      }).eq('id', authData.user.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
      }

      // Step 3: Create application record
      const { error: appError } = await db.from('applications').insert({
        user_id: authData.user.id,
        roles_of_interest: selectedRoles,
        objectives,
        reason,
      });

      if (appError) {
        console.error('Application insert error:', appError);
      }

      // Success
      form.innerHTML = `
        <div class="register-success">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <h2>¡Solicitud enviada!</h2>
          <p>Revisa tu correo <strong>${email}</strong> para confirmar tu cuenta.<br><br>
          Una vez confirmado, un administrador revisará tu solicitud y te contactará para coordinar el pago.</p>
          <a href="../index.html" class="btn-primary" style="text-decoration:none;margin-top:8px">VOLVER AL INICIO</a>
        </div>
      `;
    } catch (err) {
      showError('Error inesperado. Intenta de nuevo.');
      console.error(err);
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  });

  function showError(text) {
    msg.textContent = text;
    btn.classList.remove('loading');
    btn.disabled = false;
  }
});
