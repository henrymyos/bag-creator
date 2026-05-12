const SUPABASE_URL = 'https://rpkdnolybxatcvwsqydi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwa2Rub2x5YnhhdGN2d3NxeWRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyODQ1MzUsImV4cCI6MjA5Mzg2MDUzNX0.eT2xzD-jbmRTi50C7U2dqLI9-SKuf30i5iqjhIBX-hU';

async function getSupabaseSession(client) {
  const { data } = await client.auth.getSession();
  if (data.session) {
    localStorage.removeItem('bc_at');
    localStorage.removeItem('bc_rt');
    return data.session;
  }
  const at = localStorage.getItem('bc_at');
  const rt = localStorage.getItem('bc_rt');
  if (!at) return null;
  const { data: restored } = await client.auth.setSession({ access_token: at, refresh_token: rt || '' });
  localStorage.removeItem('bc_at');
  localStorage.removeItem('bc_rt');
  return restored?.session ?? null;
}

function _navAvatarInitial(user) {
  const label = user?.user_metadata?.displayName || user?.user_metadata?.full_name || user?.email || '';
  return label[0]?.toUpperCase() || '?';
}

function applyNavAvatar(colorVal, photoData, initial) {
  const hex = colorVal || '#39d353';
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  ['nav-avatar', 'nav-avatar-mobile'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (photoData) {
      el.innerHTML = '<img src="' + photoData + '" alt="">';
      el.style.background = 'none';
      el.style.color = '';
    } else {
      el.textContent = initial || '?';
      el.style.background = 'rgba(' + r + ',' + g + ',' + b + ',0.2)';
      el.style.color = hex;
    }
  });
}

function _getNavAuthToken() {
  try {
    const key = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.includes('-auth-token'));
    return (key && JSON.parse(localStorage.getItem(key)))?.access_token ?? null;
  } catch { return null; }
}

async function loadNavAvatar(client, user) {
  if (!user) return;
  const initial = _navAvatarInitial(user);
  applyNavAvatar(null, null, initial);
  try {
    const token = _getNavAuthToken();
    if (!token) return;
    const res = await fetch(
      SUPABASE_URL + '/rest/v1/bags?user_id=eq.' + encodeURIComponent(user.id) + '&select=prefs&limit=1',
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + token } }
    );
    if (!res.ok) return;
    const rows = await res.json();
    const p = rows?.[0]?.prefs || {};
    applyNavAvatar(p.avatarColor || null, p.avatarPhoto || null, initial);
  } catch {}
}

function signOutAndRedirect(client, href) {
  // Clear all local auth tokens immediately so session is gone on next load
  localStorage.removeItem('bc_at');
  localStorage.removeItem('bc_rt');
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('sb-') && key.includes('-auth-token')) localStorage.removeItem(key);
  }
  client.auth.signOut().catch(() => {});
  window.location.href = href || 'index.html';
}
