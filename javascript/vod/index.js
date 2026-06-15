document.addEventListener('DOMContentLoaded',async()=>{if(typeof lucide!=='undefined')lucide.createIcons();const lo=document.getElementById('loadingOverlay');if(lo)lo.classList.add('hidden');
  const db=initSupabase();if(!db)return;
  const {data:{session}}=await db.auth.getSession();if(!session){window.location.href='../../index.html';return;}
  const $=id=>document.getElementById(id);const user=session.user;
  const {data:p}=await db.from('profiles').select('full_name').eq('id',user.id).single();
  const name=p?.full_name||user.email?.split('@')[0]||'User';$('userName').textContent=name;$('userAvatar').textContent=name.charAt(0).toUpperCase();
  $('logoutBtn').addEventListener('click',async e=>{e.preventDefault();await db.auth.signOut();window.location.href='../../index.html'});
  $('sidebarToggle').addEventListener('click',()=>$('sidebar').classList.toggle('open'));

  // Check role: student sees own, coach sees their assigned
  const {data:profile}=await db.from('profiles').select('role').eq('id',user.id).single();
  const isCoach=profile?.role==='coach';

  let query=db.from('vod_reviews').select('*,coach_id!inner(full_name)');
  if(!isCoach)query=query.eq('student_id',user.id);
  const {data}=await query.order('created_at',{ascending:false});
  const grid=$('vodGrid');
  if(data?.length){grid.innerHTML=data.map(v=>`<div class="vod-card"><h3>${v.title||'VOD Review'}</h3><div class="vod-meta"><span>${v.coach_id?.full_name||'Coach'}</span><span>${new Date(v.created_at).toLocaleDateString('es-ES')}</span></div><p>${v.summary||'Sin resumen'}</p></div>`).join('');
  }else{grid.innerHTML='<p class="empty-state">Sin VOD reviews aún</p>';}

  $('newVodBtn')?.addEventListener('click',()=>{
    const url=prompt('URL del video (YouTube/Twitch):');if(!url)return;
    db.from('vod_reviews').insert({student_id:user.id,coach_id:user.id,video_url:url,title:'Nuevo VOD'}).then(()=>location.reload());
  });
});

