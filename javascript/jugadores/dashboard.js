document.addEventListener('DOMContentLoaded', async () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();
  const lo = document.getElementById('loadingOverlay');
  if (lo) lo.classList.add('hidden');
  const db = initSupabase();
  if (!db) {
    alert('Error de conexión. Recarga la página.');
    return;
  }

  const { data: { session }, error: sessionError } = await db.auth.getSession();
  if (sessionError || !session) {
    window.location.href = '../../index.html';
    return;
  }

  const user = session.user;

  // Verify jugador role
  const { data: myProfile } = await db.from('profiles').select('role').eq('id', user.id).single();
  if (!myProfile || myProfile.role !== 'jugador') {
    window.location.href = '../alumnos/dashboard.html';
    return;
  }

  const $ = (id) => document.getElementById(id);
  const loadingOverlay = $('loadingOverlay');
  const userName = $('userName');
  const userRole = $('userRole');
  const userAvatar = $('userAvatar');
  const pageTitle = $('pageTitle');
  const sidebar = $('sidebar');
  const notifBadge = $('notifBadge');

  let profile = null;
  try {
    const { data, error } = await db.from('profiles').select('*').eq('id', user.id).single();
    if (error && error.code !== 'PGRST116') console.error('Profile load error:', error);
    profile = data;
  } catch (e) { console.error(e); }

  const displayName = profile?.full_name || user.email?.split('@')[0] || 'Usuario';
  const role = profile?.role || 'jugador';
  userName.textContent = displayName;
  userRole.textContent = role;
  userAvatar.textContent = displayName.charAt(0).toUpperCase();

  const setStat = (id, val) => { const el = $(id); if (el) el.textContent = val; };
  setStat('statLevel', profile?.level || 'Curso');
  setStat('statXP', profile?.xp || 0);
  setStat('statAcademyRank', profile?.academy_rank || 'Rookie');
  setStat('statValRank', profile?.valorant_rank || 'Sin rango');
  setStat('statStreak', (profile?.streak || 0) + ' días');

  const xpCurrent = profile?.xp || 0;
  const xpNext = 1000;
  const xpPct = Math.min(100, Math.round((xpCurrent / xpNext) * 100));
  $('xpCurrent').textContent = xpCurrent;
  $('xpNext').textContent = xpNext;
  $('xpBarFill').style.width = xpPct + '%';

  try {
    const { data: seasons } = await db.from('seasons').select('*').eq('is_active', true).limit(1);
    const season = seasons?.[0];
    $('currentSeason').innerHTML = season
      ? `<strong>${season.name}</strong><br><span style="font-size:0.75rem;color:var(--text-muted)">${season.start_date} — ${season.end_date}</span>`
      : '<p class="empty-state">No hay temporada activa</p>';
  } catch { $('currentSeason').innerHTML = '<p class="empty-state">Error al cargar</p>'; }

  try {
    const { data: progressList } = await db.from('academy_progress').select('*').eq('student_id', user.id).limit(1);
    const studentData = progressList?.[0];
    if (studentData) {
      setStat('statXP', studentData.total_xp || 0);
    }
  } catch {}

  try {
    const { count } = await db.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('leido', false);
    notifBadge.textContent = count || 0;
  } catch {}

  try {
    const { data: goals } = await db.from('goals').select('*').eq('student_id', user.id).eq('status', 'active').limit(3);
    if (goals?.length) {
      $('activeGoals').innerHTML = goals.map(g =>
        `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <div style="flex:1;min-width:0">
            <div style="font-size:0.82rem;font-weight:500;color:var(--text)">${g.title}</div>
            <div style="font-size:0.7rem;color:var(--text-muted)">${g.progress || 0}% completado</div>
          </div>
          <div style="width:36px;height:36px;border-radius:50%;background:rgba(139,92,246,0.1);display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;color:var(--neon-light)">${g.progress || 0}%</div>
        </div>`
      ).join('');
    }
  } catch {}

  try {
    const { data: sessions } = await db.from('training_sessions').select('*').gte('scheduled_at', new Date().toISOString()).order('scheduled_at', { ascending: true }).limit(1);
    if (sessions?.length) {
      const s = sessions[0];
      $('nextClass').innerHTML = `
        <strong>${s.title}</strong><br>
        <span style="font-size:0.75rem;color:var(--text-muted)">${new Date(s.scheduled_at).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>`;
    }
  } catch {}

  try {
    const { data: scrims } = await db.from('scrims').select('*, teams!inner(*)').gte('fecha', new Date().toISOString()).order('fecha', { ascending: true }).limit(1);
    if (scrims?.length) {
      const s = scrims[0];
      $('nextScrim').innerHTML = `
        <strong>vs ${s.opponent || 'TBD'}</strong><br>
        <span style="font-size:0.75rem;color:var(--text-muted)">${new Date(s.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>`;
    }
  } catch {}

  try {
    const { data: reviews } = await db.from('coach_reviews').select('*').eq('student_id', user.id).order('created_at', { ascending: false }).limit(1);
    if (reviews?.length) {
      const r = reviews[0];
      $('lastFeedback').innerHTML = `
        <strong>${r.titulo || 'Feedback'}</strong><br>
        <span style="font-size:0.75rem;color:var(--text-muted)">${r.nota_global ? 'Nota: ' + r.nota_global + '/10' : ''}</span>`;
    }
  } catch {}

  try {
    const { data: achievs } = await db.from('student_achievements').select('*, achievements(*)').eq('student_id', user.id).order('earned_at', { ascending: false }).limit(3);
    if (achievs?.length) {
      $('recentAchievements').innerHTML = achievs.map(a =>
        `<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
          <div style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,rgba(139,92,246,0.15),rgba(245,158,11,0.1));display:flex;align-items:center;justify-content:center;color:var(--gold,#f59e0b);font-size:0.75rem">🏆</div>
          <span style="font-size:0.8rem;color:var(--text)">${a.achievements?.nombre || 'Logro'}</span>
        </div>`
      ).join('');
    }
  } catch {}

  setTimeout(() => { loadingOverlay.classList.add('hidden'); }, 600);

  const overviewLink = document.querySelector('.nav-item[data-section="overview"]');
  if (overviewLink) {
    overviewLink.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      overviewLink.classList.add('active');
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      const target = $('section-overview');
      if (target) target.classList.add('active');
      pageTitle.textContent = 'Visión General';
      sidebar.classList.remove('open');
    });
  }

  $('sidebarToggle').addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  $('logoutBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    await db.auth.signOut();
    window.location.href = '../../index.html';
  });
});
