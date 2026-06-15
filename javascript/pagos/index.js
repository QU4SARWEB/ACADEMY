document.addEventListener('DOMContentLoaded',async()=>{if(typeof lucide!=='undefined')lucide.createIcons();const lo=document.getElementById('loadingOverlay');if(lo)lo.classList.add('hidden');
  const db=initSupabase();if(!db)return;
  const {data:{session}}=await db.auth.getSession();if(!session){window.location.href='../../index.html';return;}
  const $=id=>document.getElementById(id);const user=session.user;
  const {data:p}=await db.from('profiles').select('full_name,status,membership_type').eq('id',user.id).single();
  const name=p?.full_name||user.email?.split('@')[0]||'User';$('userName').textContent=name;$('userAvatar').textContent=name.charAt(0).toUpperCase();
  $('logoutBtn').addEventListener('click',async e=>{e.preventDefault();await db.auth.signOut();window.location.href='../../index.html'});
  $('sidebarToggle').addEventListener('click',()=>$('sidebar').classList.toggle('open'));

  $('membershipStatus').textContent=`${p?.status||'inactive'} · ${p?.membership_type||'free'}`;

  const {data:payments}=await db.from('payments').select('*').eq('user_id',user.id).order('created_at',{ascending:false});
  $('paymentsHistory').innerHTML=payments?.length?payments.map(p=>`<tr><td>S/ ${p.amount}</td><td>${p.payment_method||'-'}</td><td><span class="status-badge status-${p.status}">${p.status}</span></td><td style="color:var(--text-muted);font-size:.75rem">${new Date(p.created_at).toLocaleDateString('es-ES')}</td></tr>`).join(''):'<tr><td colspan="4" style="text-align:center;color:var(--text-dim)">Sin pagos registrados</td></tr>';
});

