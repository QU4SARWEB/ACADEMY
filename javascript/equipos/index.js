document.addEventListener('DOMContentLoaded',async()=>{if(typeof lucide!=='undefined')lucide.createIcons();const lo=document.getElementById('loadingOverlay');if(lo)lo.classList.add('hidden');
  const db=initSupabase();if(!db)return;
  const {data:{session}}=await db.auth.getSession();if(!session){window.location.href='../../index.html';return;}
  const $=id=>document.getElementById(id);const user=session.user;
  const {data:p}=await db.from('profiles').select('full_name').eq('id',user.id).single();
  const name=p?.full_name||user.email?.split('@')[0]||'User';$('userName').textContent=name;$('userAvatar').textContent=name.charAt(0).toUpperCase();
  $('logoutBtn').addEventListener('click',async e=>{e.preventDefault();await db.auth.signOut();window.location.href='../../index.html'});
  $('sidebarToggle').addEventListener('click',()=>$('sidebar').classList.toggle('open'));

  // Check role
  const {data:profile}=await db.from('profiles').select('role').eq('id',user.id).single();
  const isAdminOrCoach=profile?.role==='admin'||profile?.role==='coach';

  let query=db.from('teams').select('*,team_stats(*)');
  if(isAdminOrCoach&&profile.role==='coach')query=query.eq('coach_id',user.id);
  const {data}=await query.order('created_at',{ascending:false});
  const grid=$('teamsGrid');
  if(data?.length){
    grid.innerHTML=await Promise.all(data.map(async t=>{
      const {data:members}=await db.from('team_members').select('*,profiles!inner(full_name)').eq('team_id',t.id).eq('is_active',true);
      const stats=t.team_stats;
      return`<div class="team-card"><h3>${t.nombre}</h3><div class="team-game">${t.game||'VALORANT'}</div><p>${t.description||''}</p><div class="team-stats"><span class="wins">🏆 ${stats?.wins||0}</span><span class="losses">💀 ${stats?.losses||0}</span><span>📊 ${stats?.winrate||0}%</span></div><div class="team-members">${members?.map(m=>`<span class="team-member-chip">${m.profiles?.full_name||'?'}</span>`).join('')||''}</div></div>`;
    })).then(r=>r.join(''));
  }else{grid.innerHTML='<p class="empty-state">No hay equipos aún</p>';}
});

