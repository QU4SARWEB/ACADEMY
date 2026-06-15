document.addEventListener('DOMContentLoaded',async()=>{if(typeof lucide!=='undefined')lucide.createIcons();const lo=document.getElementById('loadingOverlay');if(lo)lo.classList.add('hidden');
  const db=initSupabase();if(!db)return;
  const {data:{session}}=await db.auth.getSession();if(!session){window.location.href='../../index.html';return;}
  const $=id=>document.getElementById(id);const user=session.user;
  const {data:p}=await db.from('profiles').select('full_name').eq('id',user.id).single();
  const name=p?.full_name||user.email?.split('@')[0]||'User';$('userName').textContent=name;$('userAvatar').textContent=name.charAt(0).toUpperCase();
  $('logoutBtn').addEventListener('click',async e=>{e.preventDefault();await db.auth.signOut();window.location.href='../../index.html'});
  $('sidebarToggle').addEventListener('click',()=>$('sidebar').classList.toggle('open'));

  const now=new Date().toISOString();
  const {data:upcoming}=await db.from('training_sessions').select('*').gte('scheduled_at',now).order('scheduled_at').limit(6);
  const grid=$('sessionsGrid');
  if(upcoming?.length){grid.innerHTML=upcoming.map(s=>`<div class="session-card"><div class="session-type">${s.type||'class'}</div><h3>${s.title}</h3><p>${s.description||''}</p><div class="session-meta"><span>${new Date(s.scheduled_at).toLocaleDateString('es-ES',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span><span>${s.duration_minutes||'-'} min</span></div></div>`).join('');
  }else{grid.innerHTML='<p class="empty-state">No hay sesiones programadas</p>';}

  const {data:past}=await db.from('training_sessions').select('*').lt('scheduled_at',now).order('scheduled_at',{ascending:false}).limit(10);
  const list=$('sessionsList');
  if(past?.length){list.innerHTML=past.map(s=>`<div class="session-row"><div style="flex:1;min-width:0"><strong>${s.title}</strong><span style="color:var(--text-muted);font-size:.7rem;margin-left:8px">${new Date(s.scheduled_at).toLocaleDateString('es-ES')}</span></div><span style="font-size:.7rem;color:var(--text-dim)">${s.type||'-'}</span></div>`).join('');
  }else{list.innerHTML='<p class="empty-state">Sin sesiones pasadas</p>';}
});

