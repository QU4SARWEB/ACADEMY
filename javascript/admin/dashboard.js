document.addEventListener('DOMContentLoaded',async()=>{if(typeof lucide!=='undefined')lucide.createIcons();const lo=document.getElementById('loadingOverlay');if(lo)lo.classList.add('hidden');
  const db = initSupabase();
  if (!db) { alert('Error de conexión.'); return; }

  const { data: { session } } = await db.auth.getSession();
  if (!session) { window.location.href = '../../index.html'; return; }

  const user = session.user;

  // Verify admin role
  const { data: myProfile } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (!myProfile || myProfile.role !== 'admin') {
    window.location.href = '../alumnos/dashboard.html';
    return;
  }

  const $ = (id) => document.getElementById(id);
  const loading = $('loadingOverlay');
  const userName = $('userName');
  const sidebar = $('sidebar');

  userName.textContent = 'Admin';
  $('userAvatar').textContent = 'A';

  // Navigation
  document.querySelectorAll('.nav-item[data-section]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.dataset.section;
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      const target = $('section-' + section);
      if (target) target.classList.add('active');
      $('pageTitle').textContent = item.querySelector('span')?.textContent || 'Panel';
      sidebar.classList.remove('open');
    });
  });

  $('sidebarToggle').addEventListener('click', () => sidebar.classList.toggle('open'));

  $('logoutBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    await db.auth.signOut();
    window.location.href = '../../index.html';
  });

  // Load data
  await loadOverview();
  await loadStudents();
  await loadJugadores();
  await loadCoaches();
  await loadPayments();
  await loadPending();
  await loadSeasons();

  setTimeout(() => loading.classList.add('hidden'), 500);

  // --- HELPERS ---
  async function loadOverview() {
    const { count: total } = await db.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student');
    const { count: jugadores } = await db.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'jugador');
    const { count: coaches } = await db.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'coach');
    const { count: pending } = await db.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending_payment');
    const { data: payments } = await db.from('payments').select('amount').gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());
    const monthTotal = payments?.reduce((s, p) => s + Number(p.amount), 0) || 0;

    $('totalStudents').textContent = total || 0;
    $('totalJugadores').textContent = jugadores || 0;
    $('totalCoaches').textContent = coaches || 0;
    $('pendingPayment').textContent = pending || 0;
    $('monthPayments').textContent = `S/ ${monthTotal}`;

    // Recent users
    const { data: recent } = await db.from('profiles').select('*').order('created_at', { ascending: false }).limit(5);
    if (recent) {
      $('recentUsers').innerHTML = recent.map(p => `
        <tr>
          <td>${p.full_name || 'Sin nombre'}</td>
          <td style="color:var(--text-muted)">${p.email || '-'}</td>
          <td><span class="status-badge status-${p.status}">${p.status}</span></td>
          <td><span class="status-${p.role}">${p.role}</span></td>
          <td style="color:var(--text-muted);font-size:0.75rem">${new Date(p.created_at).toLocaleDateString('es-ES')}</td>
        </tr>
      `).join('');
    }
  }

  async function loadStudents() {
    const { data } = await db.from('profiles').select('*').eq('role', 'student').order('created_at', { ascending: false });
    if (data) {
      $('studentsTable').innerHTML = data.map(p => `
        <tr>
          <td>${p.full_name || 'Sin nombre'}</td>
          <td style="color:var(--text-muted)">${p.discord_user || '-'}</td>
          <td style="color:var(--text-muted)">${p.valorant_name || '-'}</td>
          <td>${p.rank || '-'}</td>
          <td><span class="status-badge status-${p.status}">${p.status}</span></td>
          <td>
            <button class="action-btn" onclick="updateStatus('${p.id}','active')">Activar</button>
          </td>
        </tr>
      `).join('');
    }
  }

  async function loadJugadores() {
    const { data } = await db.from('profiles').select('*').eq('role', 'jugador').order('created_at', { ascending: false });
    if (data) {
      $('jugadoresTable').innerHTML = data.map(p => `
        <tr>
          <td>${p.full_name || 'Sin nombre'}</td>
          <td style="color:var(--text-muted)">${p.discord_user || '-'}</td>
          <td style="color:var(--text-muted)">${p.valorant_name || '-'}</td>
          <td>${p.rank || '-'}</td>
          <td><span class="status-badge status-${p.status}">${p.status}</span></td>
          <td>
            <button class="action-btn" onclick="updateStatus('${p.id}','active')">Activar</button>
          </td>
        </tr>
      `).join('');
    }
  }

  async function loadCoaches() {
    const { data } = await db.from('profiles').select('*').eq('role', 'coach').order('created_at', { ascending: false });
    if (data) {
      $('coachesTable').innerHTML = data.map(p => `
        <tr>
          <td>${p.full_name || 'Sin nombre'}</td>
          <td style="color:var(--text-muted)">${p.email || '-'}</td>
          <td style="color:var(--text-muted)">-</td>
          <td><button class="action-btn reject" onclick="updateRole('${p.id}','student')">Quitar coach</button></td>
        </tr>
      `).join('');
    }
  }

  async function loadPayments() {
    const { data } = await db.from('payments').select('*, profiles!inner(full_name)').order('created_at', { ascending: false }).limit(20);
    if (data) {
      $('paymentsTable').innerHTML = data.map(p => `
        <tr>
          <td>${p.profiles?.full_name || '-'}</td>
          <td>S/ ${p.amount}</td>
          <td style="color:var(--text-muted)">${p.payment_method || '-'}</td>
          <td><span class="status-badge status-${p.status}">${p.status}</span></td>
          <td style="color:var(--text-muted);font-size:0.75rem">${new Date(p.created_at).toLocaleDateString('es-ES')}</td>
        </tr>
      `).join('');
    }
  }

  async function loadPending() {
    const { data } = await db.from('applications').select('*, profiles!inner(*)').eq('status', 'pending').order('created_at', { ascending: false });
    if (data) {
      $('pendingTable').innerHTML = data.map(a => {
        const profile = a.profiles || {};
        return `
        <tr>
          <td>${profile.full_name || 'Sin nombre'}</td>
          <td style="color:var(--text-muted)">${profile.email || '-'}</td>
          <td style="color:var(--text-muted)">${profile.discord_user || '-'}</td>
          <td style="color:var(--text-muted)">${profile.valorant_name || '-'}</td>
          <td>${Array.isArray(a.roles_of_interest) ? a.roles_of_interest.join(', ') : '-'}</td>
          <td style="white-space:nowrap">
            <button class="action-btn approve" onclick="approveApp('${a.id}','${profile.id}')">Aprobar</button>
            <button class="action-btn reject" onclick="rejectApp('${a.id}')">Rechazar</button>
          </td>
        </tr>
      `}).join('');
    }
  }

  async function loadSeasons() {
    const { data } = await db.from('seasons').select('*').order('start_date', { ascending: false });
    if (data) {
      $('seasonsTable').innerHTML = data.map(s => `
        <tr>
          <td><strong>${s.name}</strong></td>
          <td style="color:var(--text-muted)">${s.start_date}</td>
          <td style="color:var(--text-muted)">${s.end_date}</td>
          <td><span class="status-badge ${s.is_active ? 'status-active' : 'status-inactive'}">${s.is_active ? 'Activa' : 'Inactiva'}</span></td>
          <td><button class="action-btn" onclick="toggleSeason('${s.id}',${!s.is_active})">${s.is_active ? 'Desactivar' : 'Activar'}</button></td>
        </tr>
      `).join('');
    }
  }

  // Global functions
  window.updateStatus = async (id, status) => {
    await db.from('profiles').update({ status }).eq('id', id);
    loadStudents();
  };

  window.updateRole = async (id, role) => {
    await db.from('profiles').update({ role }).eq('id', id);
    loadCoaches();
  };

  window.approveApp = async (appId, profileId) => {
    await db.from('applications').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', appId);
    await db.from('profiles').update({ status: 'active' }).eq('id', profileId);
    loadPending();
    loadOverview();
  };

  window.rejectApp = async (appId) => {
    await db.from('applications').update({ status: 'rejected' }).eq('id', appId);
    loadPending();
  };

  window.toggleSeason = async (id, active) => {
    if (active) {
      await db.from('seasons').update({ is_active: false }).neq('id', id);
    }
    await db.from('seasons').update({ is_active: active }).eq('id', id);
    loadSeasons();
  };

  // Add coach modal
  $('addCoachBtn')?.addEventListener('click', () => {
    const email = prompt('Email del usuario a hacer coach:');
    if (email) {
      db.from('profiles').select('id, role').eq('email', email).single().then(({ data, error }) => {
        if (error || !data) { alert('Usuario no encontrado'); return; }
        db.from('profiles').update({ role: 'coach' }).eq('id', data.id).then(() => {
          alert('Coach añadido');
          loadCoaches();
        });
      });
    }
  });
});

