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

function _performSignOut(client, href) {
  // Clear all local auth tokens immediately so session is gone on next load
  localStorage.removeItem('bc_at');
  localStorage.removeItem('bc_rt');
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('sb-') && key.includes('-auth-token')) localStorage.removeItem(key);
  }
  client.auth.signOut().catch(() => {});
  window.location.href = href || 'index.html';
}

function signOutAndRedirect(client, href) {
  if (document.getElementById('signout-confirm-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'signout-confirm-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;padding:1rem;font-family:Barlow,sans-serif;';

  const dialog = document.createElement('div');
  dialog.style.cssText = 'background:var(--bg2,#161b22);border:1px solid var(--border2,rgba(255,255,255,0.14));border-radius:14px;max-width:380px;width:100%;padding:1.5rem 1.5rem 1.25rem;color:var(--text,#e6edf3);box-shadow:0 12px 40px rgba(0,0,0,0.45);';
  dialog.innerHTML =
    '<div style="font-family:Barlow Condensed,sans-serif;font-size:1.25rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:0.5rem;">Sign out?</div>' +
    '<div style="font-size:13px;color:var(--muted,#8b949e);line-height:1.55;margin-bottom:1.25rem;">Your bag and settings are saved to your account and will be here when you sign back in.</div>' +
    '<div style="display:flex;gap:0.6rem;justify-content:flex-end;">' +
      '<button id="signout-cancel" style="padding:8px 18px;font-family:Barlow,sans-serif;font-size:13px;font-weight:600;border-radius:7px;border:1px solid var(--border2,rgba(255,255,255,0.14));background:var(--bg3,#21262d);color:var(--muted,#8b949e);cursor:pointer;">Cancel</button>' +
      '<button id="signout-confirm" style="padding:8px 18px;font-family:Barlow,sans-serif;font-size:13px;font-weight:600;border-radius:7px;border:1px solid rgba(248,81,73,0.4);background:rgba(248,81,73,0.12);color:#f85149;cursor:pointer;">Sign Out</button>' +
    '</div>';
  overlay.appendChild(dialog);

  function close() {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e) {
    if (e.key === 'Escape') close();
    if (e.key === 'Enter') { close(); _performSignOut(client, href); }
  }

  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  dialog.querySelector('#signout-cancel').addEventListener('click', close);
  dialog.querySelector('#signout-confirm').addEventListener('click', () => { close(); _performSignOut(client, href); });
  document.addEventListener('keydown', onKey);

  document.body.appendChild(overlay);
  dialog.querySelector('#signout-confirm').focus();
}
