document.addEventListener('DOMContentLoaded',async()=>{if(typeof lucide!=='undefined')lucide.createIcons();const lo=document.getElementById('loadingOverlay');if(lo)lo.classList.add('hidden');
  const db=initSupabase();if(!db)return;
  const {data:{session}}=await db.auth.getSession();if(!session){window.location.href='../../index.html';return;}
  const $=id=>document.getElementById(id);const user=session.user;
  const {data:p}=await db.from('profiles').select('full_name').eq('id',user.id).single();
  const name=p?.full_name||user.email?.split('@')[0]||'User';$('userName').textContent=name;$('userAvatar').textContent=name.charAt(0).toUpperCase();
  $('logoutBtn').addEventListener('click',async e=>{e.preventDefault();await db.auth.signOut();window.location.href='../../index.html'});
  $('sidebarToggle').addEventListener('click',()=>$('sidebar').classList.toggle('open'));

  const now=new Date().toISOString();
  const {data:allScrims}=await db.from('scrims').select('*,teams(nombre)').order('fecha',{ascending:false});
  const wins=allScrims?.filter(s=>s.resultado==='win').length||0;
  const losses=allScrims?.filter(s=>s.resultado==='loss').length||0;
  const total=allScrims?.length||0;
  $('scrimsStats').innerHTML=`<div class="scrim-stat"><span class="scrim-stat-value">${wins}</span><span class="scrim-stat-label">Victorias</span></div><div class="scrim-stat"><span class="scrim-stat-value">${losses}</span><span class="scrim-stat-label">Derrotas</span></div><div class="scrim-stat"><span class="scrim-stat-value">${total?Math.round(wins/total*100):0}%</span><span class="scrim-stat-label">Win Rate</span></div>`;

  const upcoming=allScrims?.filter(s=>s.fecha>=now)||[];
  const grid=$('upcomingScrims');
  if(upcoming.length){grid.innerHTML=upcoming.map(s=>`<div class="scrim-card"><h3>vs ${s.opponent||'TBD'}</h3><div class="scrim-date">${new Date(s.fecha).toLocaleDateString('es-ES',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})}</div></div>`).join('');
  }else{grid.innerHTML='<p class="empty-state">No hay scrims programados</p>';}

  const history=allScrims?.filter(s=>s.fecha<now)||[];
  $('scrimsHistory').innerHTML=history.length?history.map(s=>`<tr><td>vs ${s.opponent||'-'}</td><td style="color:var(--text-muted);font-size:.75rem">${new Date(s.fecha).toLocaleDateString('es-ES')}</td><td><span class="status-badge" style="background:${s.resultado==='win'?'rgba(34,197,94,.12)':'rgba(239,68,68,.12)'};color:${s.resultado==='win'?'#22c55e':'#ef4444'}">${s.resultado||'-'}</span></td><td>${s.score||'-'}</td><td>${s.vod_url?'<a href="#" style="color:var(--neon-light)">Ver</a>':'-'}</td></tr>`).join(''):'<tr><td colspan="5" style="text-align:center;color:var(--text-dim)">Sin historial</td></tr>';
});

