document.addEventListener('DOMContentLoaded',async()=>{if(typeof lucide!=='undefined')lucide.createIcons();const lo=document.getElementById('loadingOverlay');if(lo)lo.classList.add('hidden');
  const db=initSupabase();if(!db)return;
  const {data:{session}}=await db.auth.getSession();if(!session){window.location.href='../../index.html';return;}
  const $=id=>document.getElementById(id);const user=session.user;
  const {data:p}=await db.from('profiles').select('full_name').eq('id',user.id).single();
  const name=p?.full_name||user.email?.split('@')[0]||'User';$('userName').textContent=name;$('userAvatar').textContent=name.charAt(0).toUpperCase();
  $('logoutBtn').addEventListener('click',async e=>{e.preventDefault();await db.auth.signOut();window.location.href='../../index.html'});
  $('sidebarToggle').addEventListener('click',()=>$('sidebar').classList.toggle('open'));

  const {data:studentAchievements}=await db.from('student_achievements').select('*,achievements(*)').eq('student_id',user.id);
  $('totalAchievements').textContent=studentAchievements?.length||0;

  const {data:allAchievements}=await db.from('achievements').select('*');
  const grid=$('achievementsGrid');
  if(allAchievements?.length){grid.innerHTML=allAchievements.map(a=>{
    const unlocked=studentAchievements?.some(sa=>sa.achievement_id===a.id);
    return`<div class="achievement-card" style="opacity:${unlocked?1:.35}"><div class="ach-icon">${a.icon_url||'🏆'}</div><h3>${a.nombre}</h3><p>${a.descripcion||''}</p>${a.xp_recompensa?`<p style="font-size:.65rem;color:var(--neon-light);margin-top:4px">+${a.xp_recompensa} XP</p>`:''}</div>`;
  }).join('');
  }else{grid.innerHTML='<p class="empty-state">No hay logros disponibles</p>';}
});

