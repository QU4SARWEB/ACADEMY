document.addEventListener('DOMContentLoaded',async()=>{if(typeof lucide!=='undefined')lucide.createIcons();const lo=document.getElementById('loadingOverlay');if(lo)lo.classList.add('hidden');
  const db = initSupabase();
  if (!db) { alert('Error de conexión.'); return; }

  const { data: { session } } = await db.auth.getSession();
  if (!session) { window.location.href = '../../index.html'; return; }

  const user = session.user;

  const { data: myProfile } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (!myProfile || myProfile.role !== 'coach') {
    window.location.href = '../alumnos/dashboard.html';
    return;
  }

  const $ = (id) => document.getElementById(id);
  const loading = $('loadingOverlay');
  const userName = $('userName');
  const sidebar = $('sidebar');

  // Fetch coach profile for name
  const { data: coachProfile } = await db.from('profiles').select('full_name').eq('id', user.id).single();
  userName.textContent = coachProfile?.full_name || 'Coach';
  $('userAvatar').textContent = (coachProfile?.full_name || 'C').charAt(0).toUpperCase();

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
  await loadSessions();
  await loadGoals();
  await loadFeedback();

  setTimeout(() => loading.classList.add('hidden'), 500);

  async function loadOverview() {
    const { count: studentCount } = await db.from('enrollments').select('*', { count: 'exact', head: true }).eq('coach_id', user.id).eq('estado', 'active');
    $('myStudents').textContent = studentCount || 0;

    const { count: jugadorCount } = await db.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'jugador');
    $('coachJugadores').textContent = jugadorCount || 0;

    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 7);
    const { count: classCount } = await db.from('training_sessions').select('*', { count: 'exact', head: true }).eq('coach_id', user.id).gte('scheduled_at', weekStart.toISOString()).lt('scheduled_at', weekEnd.toISOString());
    $('weeklyClasses').textContent = classCount || 0;

    const { count: goalCount } = await db.from('goals').select('*', { count: 'exact', head: true }).eq('coach_id', user.id).eq('status', 'active');
    $('activeGoalsCount').textContent = goalCount || 0;

    $('pendingFeedback').textContent = '-';

    // Students list
    const { data: enrolls } = await db.from('enrollments').select('*, profiles!student_id(*)').eq('coach_id', user.id).eq('estado', 'active');
    if (enrolls?.length) {
      $('studentsList').innerHTML = enrolls.map(e => {
        const p = e.profiles;
        return `<div class="student-chip">
          <div class="student-chip-avatar">${(p?.full_name || '?').charAt(0).toUpperCase()}</div>
          <div class="student-chip-info">
            <strong>${p?.full_name || 'Sin nombre'}</strong>
            <span>${p?.rank || 'Sin rango'} · ${p?.valorant_name || '-'}</span>
          </div>
        </div>`;
      }).join('');
    }

    // Upcoming sessions
    const { data: sessions } = await db.from('training_sessions').select('*').eq('coach_id', user.id).gte('scheduled_at', new Date().toISOString()).order('scheduled_at', { ascending: true }).limit(3);
    if (sessions?.length) {
      $('upcomingSessions').innerHTML = sessions.map(s => `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <div style="flex:1;min-width:0">
            <div style="font-size:0.82rem;font-weight:500;color:var(--text)">${s.title}</div>
            <div style="font-size:0.7rem;color:var(--text-muted)">${new Date(s.scheduled_at).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>
      `).join('');
    }
  }

  async function loadStudents() {
    const { data: enrolls } = await db.from('enrollments').select('*, profiles!student_id(*)').eq('coach_id', user.id).eq('estado', 'active');
    if (enrolls) {
      $('studentsTable').innerHTML = enrolls.map(e => {
        const p = e.profiles;
        return `<tr>
          <td>${p?.full_name || 'Sin nombre'}</td>
          <td>${p?.valorant_name || '-'}</td>
          <td>${p?.rank || '-'}</td>
          <td><span class="status-badge status-active">Activo</span></td>
          <td style="color:var(--text-muted);font-size:0.75rem">${p?.updated_at ? new Date(p.updated_at).toLocaleDateString('es-ES') : '-'}</td>
          <td><button class="action-btn" onclick="setGoal('${p?.id}')">+ Objetivo</button></td>
        </tr>`;
      }).join('');
    }
  }

  async function loadJugadores() {
    const { data } = await db.from('profiles').select('*').eq('role', 'jugador').order('created_at', { ascending: false });
    if (data) {
      $('jugadoresTable').innerHTML = data.map(p => `
        <tr>
          <td>${p.full_name || 'Sin nombre'}</td>
          <td>${p.valorant_name || '-'}</td>
          <td>${p.rank || '-'}</td>
          <td><span class="status-badge status-active">Activo</span></td>
          <td style="color:var(--text-muted);font-size:0.75rem">${p.updated_at ? new Date(p.updated_at).toLocaleDateString('es-ES') : '-'}</td>
          <td><button class="action-btn" onclick="setGoal('${p.id}')">+ Objetivo</button></td>
        </tr>
      `).join('');
    }
  }

  async function loadSessions() {
    const { data } = await db.from('training_sessions').select('*').eq('coach_id', user.id).order('scheduled_at', { ascending: false });
    if (data) {
      $('sessionsTable').innerHTML = data.map(s => `
        <tr>
          <td><strong>${s.title}</strong></td>
          <td style="color:var(--text-muted)">${s.type || '-'}</td>
          <td style="color:var(--text-muted)">${s.scheduled_at ? new Date(s.scheduled_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
          <td style="color:var(--text-muted)">${s.duration_minutes || '-'} min</td>
          <td><button class="action-btn" onclick="deleteSession('${s.id}')">Eliminar</button></td>
        </tr>
      `).join('');
    }
  }

  async function loadGoals() {
    const { data } = await db.from('goals').select('*, profiles!student_id(full_name)').eq('coach_id', user.id).order('created_at', { ascending: false });
    if (data) {
      $('goalsTable').innerHTML = data.map(g => `
        <tr>
          <td>${g.profiles?.full_name || '-'}</td>
          <td>${g.title}</td>
          <td>
            <div style="display:flex;align-items:center;gap:6px">
              <div style="flex:1;height:6px;background:rgba(255,255,255,0.05);border-radius:3px;overflow:hidden;max-width:100px">
                <div style="height:100%;width:${g.progress || 0}%;background:linear-gradient(90deg,var(--neon-dark),var(--neon));border-radius:3px"></div>
              </div>
              <span style="font-size:0.7rem;color:var(--text-muted)">${g.progress || 0}%</span>
            </div>
          </td>
          <td><span class="status-badge status-${g.status === 'active' ? 'active' : 'completed'}">${g.status}</span></td>
          <td><button class="action-btn" onclick="completeGoal('${g.id}')">Completar</button></td>
        </tr>
      `).join('');
    }
  }

  async function loadFeedback() {
    const { data } = await db.from('coach_reviews').select('*, profiles!student_id(full_name)').eq('coach_id', user.id).order('created_at', { ascending: false }).limit(20);
    if (data) {
      $('feedbackTable').innerHTML = data.map(r => `
        <tr>
          <td>${r.profiles?.full_name || '-'}</td>
          <td>${r.titulo || 'Sin título'}</td>
          <td>${r.nota_global ? r.nota_global + '/10' : '-'}</td>
          <td style="color:var(--text-muted);font-size:0.75rem">${new Date(r.created_at).toLocaleDateString('es-ES')}</td>
          <td><button class="action-btn">Ver</button></td>
        </tr>
      `).join('');
    }
  }

  window.setGoal = (studentId) => {
    const title = prompt('Título del objetivo:');
    if (!title) return;
    const target = prompt('Valor objetivo (ej: 100):');
    if (!target) return;
    db.from('goals').insert({
      student_id: studentId,
      coach_id: user.id,
      title,
      target_value: Number(target),
      status: 'active',
    }).then(() => { loadGoals(); loadOverview(); });
  };

  window.completeGoal = (id) => {
    db.from('goals').update({ status: 'completed', progress: 100 }).eq('id', id).then(() => loadGoals());
  };

  window.deleteSession = (id) => {
    if (confirm('¿Eliminar esta sesión?')) {
      db.from('training_sessions').delete().eq('id', id).then(() => loadSessions());
    }
  };

  $('addSessionBtn')?.addEventListener('click', () => {
    const title = prompt('Título de la sesión:');
    if (!title) return;
    const type = prompt('Tipo (class, vod_review, scrim, aim_training, theory, custom):') || 'class';
    db.from('training_sessions').insert({
      coach_id: user.id,
      title,
      type,
      scheduled_at: new Date().toISOString(),
    }).then(() => loadSessions());
  });

  $('addGoalBtn')?.addEventListener('click', () => {
    const title = prompt('Título del objetivo:');
    if (!title) return;
    const target = prompt('Valor objetivo:');
    if (!target) return;
    db.from('goals').insert({
      coach_id: user.id,
      title,
      target_value: Number(target),
      status: 'active',
    }).then(() => loadGoals());
  });
});

