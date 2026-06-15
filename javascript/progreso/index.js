document.addEventListener('DOMContentLoaded',async()=>{if(typeof lucide!=='undefined')lucide.createIcons();const lo=document.getElementById('loadingOverlay');if(lo)lo.classList.add('hidden');
  const db=initSupabase();if(!db)return;
  const {data:{session}}=await db.auth.getSession();if(!session){window.location.href='../../index.html';return;}
  const $=id=>document.getElementById(id);const user=session.user;
  const {data:p}=await db.from('profiles').select('full_name').eq('id',user.id).single();
  const name=p?.full_name||user.email?.split('@')[0]||'User';$('userName').textContent=name;$('userAvatar').textContent=name.charAt(0).toUpperCase();
  $('logoutBtn').addEventListener('click',async e=>{e.preventDefault();await db.auth.signOut();window.location.href='../../index.html'});
  $('sidebarToggle').addEventListener('click',()=>$('sidebar').classList.toggle('open'));

  const {data:progList}=await db.from('academy_progress').select('*').eq('student_id',user.id).limit(1);const progress=progList?.[0];
  $('progCompletado').textContent=(progress?.completion_percentage||0)+'%';
  $('progScrims').textContent=progress?.total_scrims||0;
  $('progReviews').textContent=progress?.total_reviews||0;
  $('progGoals').textContent=progress?.total_goals_completed||0;

  // Recent activity from multiple sources
  const activities=[];
  const {data:goals}=await db.from('goals').select('title,status,created_at').eq('student_id',user.id).limit(5);
  goals?.forEach(g=>activities.push({text:`Objetivo ${g.status}: ${g.title}`,date:g.created_at,icon:'🎯'}));

  const {data:xp}=await db.from('xp_transactions').select('*').eq('student_id',user.id).order('created_at',{ascending:false}).limit(10);
  xp?.forEach(x=>activities.push({text:`+${x.cantidad} XP por ${x.tipo}`,date:x.created_at,icon:'⭐'}));

  activities.sort((a,b)=>new Date(b.date)-new Date(a.date));

  const timeline=$('activityTimeline');
  if(activities.length){timeline.innerHTML=activities.slice(0,15).map(a=>`<div class="activity-item"><div class="activity-dot"></div><div class="activity-text">${a.icon} ${a.text}</div><div class="activity-date">${new Date(a.date).toLocaleDateString('es-ES')}</div></div>`).join('');
  }else{timeline.innerHTML='<p class="empty-state" style="padding:18px">Sin actividad aún. ¡Empieza a entrenar!</p>';}
});

