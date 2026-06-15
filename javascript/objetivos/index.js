document.addEventListener('DOMContentLoaded',async()=>{if(typeof lucide!=='undefined')lucide.createIcons();const lo=document.getElementById('loadingOverlay');if(lo)lo.classList.add('hidden');
  const db=initSupabase();if(!db)return;
  const {data:{session}}=await db.auth.getSession();if(!session){window.location.href='../../index.html';return;}
  const $=id=>document.getElementById(id);const user=session.user;
  const {data:p}=await db.from('profiles').select('full_name').eq('id',user.id).single();
  const name=p?.full_name||user.email?.split('@')[0]||'User';$('userName').textContent=name;$('userAvatar').textContent=name.charAt(0).toUpperCase();
  $('logoutBtn').addEventListener('click',async e=>{e.preventDefault();await db.auth.signOut();window.location.href='../../index.html'});
  $('sidebarToggle').addEventListener('click',()=>$('sidebar').classList.toggle('open'));

  const {data:goals}=await db.from('goals').select('*').eq('student_id',user.id).order('created_at',{ascending:false});
  const active=goals?.filter(g=>g.status==='active')||[];
  const completed=goals?.filter(g=>g.status==='completed')||[];

  const grid=$('goalsGrid');
  if(active.length){grid.innerHTML=active.map(g=>`<div class="goal-card"><h3>${g.title}</h3>${g.description?`<div class="goal-desc">${g.description}</div>`:''}<div class="goal-progress"><div class="goal-bar"><div class="goal-bar-fill" style="width:${g.progress||0}%"></div></div><span class="goal-pct">${g.progress||0}%</span></div><div class="goal-meta">${g.target_value?`Meta: ${g.target_value} ${g.unit||''}`:''}</div></div>`).join('');
  }else{grid.innerHTML='<p class="empty-state">No hay objetivos activos</p>';}

  const list=$('goalsCompleted');
  if(completed.length){list.innerHTML=completed.map(g=>`<div class="goal-row"><span style="color:var(--text-muted)">✅ ${g.title}</span><span style="font-size:.7rem;color:var(--text-dim);margin-left:8px">${g.progress}% completado</span></div>`).join('');
  }else{list.innerHTML='<p class="empty-state">Sin objetivos completados</p>';}
});

