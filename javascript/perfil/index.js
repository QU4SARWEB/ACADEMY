document.addEventListener('DOMContentLoaded',async()=>{if(typeof lucide!=='undefined')lucide.createIcons();const lo=document.getElementById('loadingOverlay');if(lo)lo.classList.add('hidden');
  const db=initSupabase();if(!db)return;
  const {data:{session}}=await db.auth.getSession();if(!session){window.location.href='../../index.html';return;}
  const $=id=>document.getElementById(id);const user=session.user;

  const {data:profile}=await db.from('profiles').select('*').eq('id',user.id).single();
  if(!profile){window.location.href='../../index.html';return;}
  const name=profile.full_name||user.email?.split('@')[0]||'User';
  $('userName').textContent=name;$('userAvatar').textContent=name.charAt(0).toUpperCase();

  $('profileName').textContent=name;
  $('profileAvatar').textContent=name.charAt(0).toUpperCase();
  $('profileRank').textContent=`${profile.academy_rank||'Curso'} · ${profile.role||'student'}`;
  $('profileEmail').textContent=user.email||'-';
  $('profileDiscord').textContent=profile.discord_user||'-';
  $('profileValorant').textContent=profile.valorant_name||'-';
  $('profileValRank').textContent=profile.rank||'-';
  $('profileRole').textContent=profile.role||'-';
  $('profileServer').textContent=profile.server||'-';
  $('profileAvail').textContent=profile.availability||'-';
  $('profileSince').textContent=profile.created_at?new Date(profile.created_at).toLocaleDateString('es-ES'):'-';

  $('logoutBtn').addEventListener('click',async e=>{e.preventDefault();await db.auth.signOut();window.location.href='../../index.html'});
  $('sidebarToggle').addEventListener('click',()=>$('sidebar').classList.toggle('open'));
});

