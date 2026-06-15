document.addEventListener('DOMContentLoaded',async()=>{
  const db=initSupabase();if(!db)return;
  const {data:{session}}=await db.auth.getSession();if(!session){window.location.href='../../index.html';return;}
  const $=id=>document.getElementById(id);const user=session.user;
  const {data:p}=await db.from('profiles').select('full_name').eq('id',user.id).single();
  const name=p?.full_name||user.email?.split('@')[0]||'User';$('userName').textContent=name;$('userAvatar').textContent=name.charAt(0).toUpperCase();
  $('logoutBtn').addEventListener('click',async e=>{e.preventDefault();await db.auth.signOut();window.location.href='../../index.html'});
  $('sidebarToggle').addEventListener('click',()=>$('sidebar').classList.toggle('open'));

  async function loadCourses(filter='all'){
    let query=db.from('enrollments').select('*,courses(*)').eq('student_id',user.id);
    if(filter==='active')query=query.eq('estado','active');
    if(filter==='completed')query=query.eq('estado','completed');
    const {data}=await query.order('created_at',{ascending:false});
    const grid=$('coursesGrid');
    if(!data?.length){grid.innerHTML='<p class="empty-state">No tienes cursos inscritos</p>';return;}
    grid.innerHTML=data.map(e=>{
      const c=e.courses;if(!c)return'';
      return`<div class="course-card"><h3>${c.nombre}</h3><p>${c.descripcion||'Sin descripción'}</p><div class="course-meta"><span><i data-lucide="bar-chart" size="14"></i>${e.estado}</span><span><i data-lucide="clock" size="14"></i>${c.duracion_meses||'-'} meses</span></div></div>`;
    }).join('');lucide.createIcons();
  }
  loadCourses();
  document.querySelectorAll('.filter-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');loadCourses(btn.dataset.filter);
    });
  });
});
