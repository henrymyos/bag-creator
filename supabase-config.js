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
