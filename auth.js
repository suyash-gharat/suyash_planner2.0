// =============================================
//  auth.js — Shared Supabase auth utilities
//  Used by login.html, signup.html, index.html
// =============================================

const SUPA_URL = 'https://xrofrmjrsxlresckvilp.supabase.co';
const SUPA_KEY = 'sb_publishable_3MuJBPYIDka1ILUA__pDAg_Z9198PqE';
const _supa = supabase.createClient(SUPA_URL, SUPA_KEY);

// ── UI helpers ──────────────────────────────
function setLoading(form, loading) {
  const btn  = document.getElementById(form + '-btn');
  const txt  = document.getElementById(form + '-btn-text');
  const spin = document.getElementById(form + '-spinner');
  if (btn)  btn.disabled = loading;
  if (txt)  txt.style.display  = loading ? 'none'  : 'flex';
  if (spin) spin.style.display = loading ? 'block' : 'none';
}

function showError(formId, msg) {
  const el = document.getElementById(formId + '-error');
  if (el) { el.textContent = msg; }
}

function showSuccess(formId, msg) {
  const el = document.getElementById(formId + '-success');
  if (el) { el.textContent = msg; }
}

function togglePass(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const isPass = inp.type === 'password';
  inp.type = isPass ? 'text' : 'password';
  btn.innerHTML = isPass
    ? '<i class="ti ti-eye-off"></i>'
    : '<i class="ti ti-eye"></i>';
}

// ── Username availability check ─────────────
let _usernameTimer = null;
function checkUsername(val) {
  const icon = document.getElementById('signup-username-icon');
  if (!icon) return;
  icon.textContent = '';
  clearTimeout(_usernameTimer);
  val = val.trim().toLowerCase();
  if (!val || val.length < 3) return;
  icon.textContent = '⏳';
  _usernameTimer = setTimeout(async () => {
    const { data } = await _supa
      .from('usernames').select('username')
      .eq('username', val).maybeSingle();
    icon.textContent = data ? '❌' : '✅';
  }, 600);
}

// ── Password strength indicator ─────────────
function checkPasswordStrength(val) {
  const fill = document.getElementById('strength-fill');
  if (!fill) return;
  let score = 0;
  if (val.length >= 6)  score++;
  if (val.length >= 10) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^a-zA-Z0-9]/.test(val)) score++;
  const colors = ['#f43f5e','#f59e0b','#f59e0b','#10b981','#10b981'];
  const widths  = ['20%','40%','60%','80%','100%'];
  fill.style.width      = widths[score-1]  || '0%';
  fill.style.background = colors[score-1] || 'transparent';
}

// ── Redirect guard for index.html ───────────
// Call this at top of index.html to block access if not logged in
async function requireAuth() {
  const { data: { session } } = await _supa.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session;
}

// ── Get current user profile ─────────────────
async function getCurrentUserProfile() {
  const { data: { session } } = await _supa.auth.getSession();
  if (!session) return null;
  const { data: profile } = await _supa
    .from('profiles').select('*')
    .eq('id', session.user.id).maybeSingle();
  return {
    id:         session.user.id,
    name:       profile?.name     || session.user.user_metadata?.name || 'User',
    username:   profile?.username || '',
    avatar_url: profile?.avatar_url || null,
    color:      profile?.color    || '#0ea5e9',
  };
}

// ── Logout (callable from index.html) ────────
async function authLogout() {
  if (!confirm('Sign out of WorkLife Planner?')) return;
  await _supa.auth.signOut();
  window.location.href = 'login.html';
}
