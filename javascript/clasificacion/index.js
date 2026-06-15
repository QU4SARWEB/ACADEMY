document.addEventListener('DOMContentLoaded',async()=>{if(typeof lucide!=='undefined')lucide.createIcons();const lo=document.getElementById('loadingOverlay');if(lo)lo.classList.add('hidden');
  const db=initSupabase();if(!db)return;
  const {data:{session}}=await db.auth.getSession();if(!session){window.location.href='../../index.html';return;}
  const $=id=>document.getElementById(id);const user=session.user;
  const {data:p}=await db.from('profiles').select('full_name').eq('id',user.id).single();
  const name=p?.full_name||user.email?.split('@')[0]||'User';$('userName').textContent=name;$('userAvatar').textContent=name.charAt(0).toUpperCase();
  $('logoutBtn').addEventListener('click',async e=>{e.preventDefault();await db.auth.signOut();window.location.href='../../index.html'});
  $('sidebarToggle').addEventListener('click',()=>$('sidebar').classList.toggle('open'));

  async function loadLeaderboard(type='xp'){
    let data;
    if(type==='xp'){const {data:d}=await db.from('academy_progress').select('*,profiles!inner(full_name)').order('total_xp',{ascending:false}).limit(20);data=d;}
    else if(type==='streak'){const {data:d}=await db.from('student_streaks').select('*,profiles!inner(full_name)').order('current_streak',{ascending:false}).limit(20);data=d;}
    else{const {data:d}=await db.from('profiles').select('*').eq('role','student').order('level',{ascending:false}).limit(20);data=d;}

    const list=$('leaderboardList');
    if(!data?.length){list.innerHTML='<div class="lb-row" style="justify-content:center;color:var(--text-dim)">Sin datos</div>';return;}
    list.innerHTML=data.map((item,i)=>{
      const pos=i+1;
      const posClass=pos<=3?`top${pos}`:'';
      const displayName=item.profiles?.full_name||item.full_name||'Sin nombre';
      const value=type==='xp'?item.total_xp||0:type==='streak'?item.current_streak||0:item.level||0;
      const valueLabel=type==='streak'?value+' días':value;
      return`<div class="lb-row"><div class="lb-position ${posClass}">${pos}</div><div class="lb-avatar">${displayName.charAt(0).toUpperCase()}</div><div class="lb-info"><strong>${displayName}</strong></div><div class="lb-value">${valueLabel}</div></div>`;
    }).join('');
  }
  loadLeaderboard();
  document.querySelectorAll('.filter-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');loadLeaderboard(btn.dataset.filter);
    });
  });
});

