'use strict';

// ===================== STORAGE =====================
const SK = 'wlp-';
function load(key, def) {
  try { const r = localStorage.getItem(SK+key); return r ? JSON.parse(r) : def; } catch { return def; }
}
function save(key, val) { try { localStorage.setItem(SK+key, JSON.stringify(val)); } catch {} }

// ===================== STATE =====================
let tasks    = load('tasks', getDefaultTasks());
let habits   = load('habits', getDefaultHabits());
let goals    = load('goals', getDefaultGoals());
let journal  = load('journal', []);
let expenses = load('expenses', []);
let health   = load('health', { water:0, steps:0, sleep:[], workouts:[] });
let notes    = load('notes', []);
let budget   = load('budget', 30000);
let journalTags = [];
let selectedMood = 5;
let taskFilter  = 'all';
let taskFilter2 = 'all';
let nextId = load('nextId', 100);

function uid() { const id = ++nextId; save('nextId', nextId); return id; }

// ===================== DEFAULT DATA =====================
function getDefaultTasks() {
  const today = todayStr();
  return [
    { id:1, name:'Check and respond to overnight emails', cat:'work',     pri:'high', done:false, date:today, notes:'' },
    { id:2, name:'Review today\'s calendar and meetings',  cat:'admin',    pri:'high', done:false, date:today, notes:'' },
    { id:3, name:'Daily standup with team',                cat:'team',     pri:'med',  done:false, date:today, notes:'' },
    { id:4, name:'Update project tracker / task board',    cat:'work',     pri:'med',  done:false, date:today, notes:'' },
    { id:5, name:'Morning water + quick stretch',          cat:'health',   pri:'low',  done:false, date:today, notes:'' },
    { id:6, name:'Set your top 3 priorities for the day', cat:'personal', pri:'high', done:false, date:today, notes:'' },
    { id:7, name:'Review pending approvals & reports',     cat:'admin',    pri:'med',  done:false, date:today, notes:'' },
    { id:8, name:'Clear Slack / Teams notifications',      cat:'work',     pri:'med',  done:false, date:today, notes:'' },
    { id:9, name:'Block deep-focus time on calendar',      cat:'admin',    pri:'low',  done:false, date:today, notes:'' },
    { id:10,name:'Learning / upskill: read 10 pages',     cat:'learning', pri:'low',  done:false, date:today, notes:'' },
  ];
}
function getDefaultHabits() {
  return [
    { id:1, name:'Morning meditation', icon:'🧘', streak:3, target:7, doneToday:false, weekLog:[] },
    { id:2, name:'Exercise',           icon:'🏋️', streak:5, target:5, doneToday:false, weekLog:[] },
    { id:3, name:'Read 20 minutes',    icon:'📚', streak:7, target:7, doneToday:false, weekLog:[] },
    { id:4, name:'No social media before 10am', icon:'📵', streak:2, target:5, doneToday:false, weekLog:[] },
  ];
}
function getDefaultGoals() {
  return [
    { id:1, cat:'career',  title:'Get promoted to Senior Manager', desc:'Deliver 3 high-impact projects and get a performance rating of 5.',     progress:45, date:'2025-12-31' },
    { id:2, cat:'health',  title:'Run a half-marathon',            desc:'Train consistently for 6 months. Target: under 2 hours.',               progress:30, date:'2025-10-15' },
    { id:3, cat:'finance', title:'Save ₹5L emergency fund',        desc:'Set aside ₹40,000/month with zero exceptions.',                         progress:60, date:'2025-09-30' },
    { id:4, cat:'learning',title:'Complete AWS certification',     desc:'Study 45 mins daily. Take the exam by end of quarter.',                 progress:20, date:'2025-08-31' },
  ];
}

// ===================== UTILS =====================
function todayStr() { return new Date().toISOString().slice(0,10); }
function fmtDate(d) { return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}); }
function fmtAmt(n) { return '₹' + Number(n).toLocaleString('en-IN'); }
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ===================== NAVIGATION =====================
function switchView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.sb-link').forEach(l => l.classList.remove('active'));
  document.getElementById('view-'+name).classList.add('active');
  const lnk = document.querySelector(`.sb-link[data-view="${name}"]`);
  if (lnk) lnk.classList.add('active');
  if (name==='analytics') renderAnalytics();
  if (name==='today')     renderToday();
  if (name==='tasks')     renderAllTasks();
  if (name==='habits')    renderHabits();
  if (name==='goals')     renderGoals();
  if (name==='journal')   renderJournal();
  if (name==='finance')   renderFinance();
  if (name==='health')    renderHealth();
  if (name==='notes')     renderNotes();
  if (name==='dashboard') renderDashboard();
}
document.querySelectorAll('.sb-link').forEach(el => {
  el.addEventListener('click', e => { e.preventDefault(); switchView(el.dataset.view); });
});

// ===================== MODAL =====================
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function closeModalBg(e, id) { if (e.target.id===id) closeModal(id); }

// ===================== TASKS =====================
const CAT_LABELS  = { work:'Work', personal:'Personal', health:'Health', admin:'Admin', team:'Team', learning:'Learning' };
const PRI_LABELS  = { high:'High', med:'Medium', low:'Low' };
const CAT_COLORS  = { work:'#9d8fff', personal:'#f5a623', health:'#3ecf8e', admin:'#60a5fa', team:'#f08060', learning:'#2dd4bf' };

function todayTasks() { return tasks.filter(t => t.date === todayStr()); }

function addTaskModal() {
  const name = document.getElementById('m-task-name').value.trim();
  if (!name) { showToast('Please enter a task name'); return; }
  tasks.push({ id:uid(), name, cat:document.getElementById('m-task-cat').value,
    pri:document.getElementById('m-task-pri').value, done:false,
    date:todayStr(), notes:document.getElementById('m-task-notes').value.trim() });
  save('tasks', tasks);
  document.getElementById('m-task-name').value = '';
  document.getElementById('m-task-notes').value = '';
  closeModal('task-modal');
  renderDashboard(); renderToday(); renderAllTasks();
  showToast('Task added ✓');
}

function quickAddTask() {
  const name = document.getElementById('t-name').value.trim();
  if (!name) return;
  tasks.push({ id:uid(), name, cat:document.getElementById('t-cat').value,
    pri:document.getElementById('t-pri').value, done:false, date:todayStr(), notes:'' });
  save('tasks', tasks);
  document.getElementById('t-name').value = '';
  renderAllTasks(); renderDashboard(); renderToday();
  showToast('Task added ✓');
}

function toggleTask(id) {
  const t = tasks.find(x => x.id===id);
  if (t) { t.done = !t.done; save('tasks', tasks); renderDashboard(); renderToday(); renderAllTasks(); updateSidebarRing(); }
}
function deleteTask(id) {
  tasks = tasks.filter(x => x.id!==id);
  save('tasks', tasks); renderDashboard(); renderToday(); renderAllTasks(); updateSidebarRing();
  showToast('Task removed');
}
function resetTasks() { todayTasks().forEach(t => t.done=false); save('tasks', tasks); renderToday(); renderDashboard(); updateSidebarRing(); }

function taskHTML(t) {
  return `<div class="task-item${t.done?' done':''}" onclick="toggleTask(${t.id})">
    <div class="chk"><i class="ti ti-check"></i></div>
    <div class="t-body">
      <div class="t-name">${esc(t.name)}</div>
      ${t.notes ? `<div class="t-note">${esc(t.notes)}</div>` : ''}
      <div class="t-meta">
        <span class="badge b-${t.cat}">${CAT_LABELS[t.cat]||t.cat}</span>
        <div style="display:flex;align-items:center;gap:4px"><div class="pdot p-${t.pri}"></div><span class="pt">${PRI_LABELS[t.pri]||t.pri}</span></div>
      </div>
    </div>
    <button class="del-btn" onclick="event.stopPropagation();deleteTask(${t.id})" title="Delete"><i class="ti ti-trash"></i></button>
  </div>`;
}

function renderTasksInto(elId, list) {
  const el = document.getElementById(elId); if (!el) return;
  const pending = list.filter(t => !t.done);
  const done    = list.filter(t => t.done);
  if (!list.length) { el.innerHTML = `<div class="empty-state"><i class="ti ti-clipboard"></i>No tasks here. Add one!</div>`; return; }
  let h = pending.map(taskHTML).join('');
  if (done.length) h += `<div class="section-sep">Completed (${done.length})</div>` + done.map(taskHTML).join('');
  el.innerHTML = h;
}

// Filter tabs - today
document.querySelectorAll('[data-filter]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    taskFilter = btn.dataset.filter;
    renderToday();
  });
});
// Filter tabs - all tasks
document.querySelectorAll('[data-filter2]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-filter2]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    taskFilter2 = btn.dataset.filter2;
    renderAllTasks();
  });
});

function renderToday() {
  let list = todayTasks();
  if (taskFilter==='pending') list = list.filter(t => !t.done);
  if (taskFilter==='done')    list = list.filter(t => t.done);
  if (taskFilter==='high')    list = list.filter(t => t.pri==='high');
  renderTasksInto('today-task-list', list);
  const all  = todayTasks();
  const done = all.filter(t => t.done).length;
  const pct  = all.length ? Math.round(done/all.length*100) : 0;
  document.getElementById('today-prog-fill').style.width  = pct+'%';
  document.getElementById('today-prog-label').textContent = `${done} of ${all.length} tasks complete`;
}

function renderAllTasks() {
  let list = [...tasks].sort((a,b) => a.date < b.date ? 1 : -1);
  if (taskFilter2 !== 'all') list = list.filter(t => t.cat === taskFilter2);
  renderTasksInto('all-task-list', list);
}

// ===================== HABITS =====================
function addHabit() {
  const name = document.getElementById('m-habit-name').value.trim();
  if (!name) { showToast('Enter habit name'); return; }
  habits.push({ id:uid(), name, icon:document.getElementById('m-habit-icon').value||'✅',
    streak:0, target:parseInt(document.getElementById('m-habit-target').value)||7,
    doneToday:false, weekLog:[] });
  save('habits', habits);
  document.getElementById('m-habit-name').value = '';
  document.getElementById('m-habit-icon').value = '';
  closeModal('habit-modal');
  renderHabits(); renderDashboard();
  showToast('Habit added ✓');
}

function toggleHabit(id) {
  const h = habits.find(x => x.id===id);
  if (!h) return;
  h.doneToday = !h.doneToday;
  if (h.doneToday) { h.streak++; h.weekLog.push(todayStr()); }
  else { h.streak = Math.max(0,h.streak-1); h.weekLog = h.weekLog.filter(d => d!==todayStr()); }
  save('habits', habits);
  renderHabits(); renderDashboard(); updateSidebarRing();
}

function deleteHabit(id) {
  habits = habits.filter(x => x.id!==id);
  save('habits', habits); renderHabits(); renderDashboard();
  showToast('Habit removed');
}

function renderHabits() {
  const grid = document.getElementById('habits-grid'); if (!grid) return;
  if (!habits.length) { grid.innerHTML = `<div class="empty-state"><i class="ti ti-repeat"></i>No habits yet. Add your first!</div>`; return; }
  grid.innerHTML = habits.map(h => `
    <div class="habit-card${h.doneToday?' done-today':''}">
      <button class="habit-del" onclick="deleteHabit(${h.id})"><i class="ti ti-x"></i></button>
      <div class="habit-emoji">${h.icon}</div>
      <div class="habit-name">${esc(h.name)}</div>
      <div class="habit-streak">🔥 ${h.streak} day streak · ${h.target}×/week</div>
      <button class="habit-check-btn" onclick="toggleHabit(${h.id})">
        <i class="ti ti-${h.doneToday?'check':'circle'}"></i> ${h.doneToday ? 'Done today!' : 'Mark done'}
      </button>
    </div>`).join('');

  // Week grid
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const weekEl = document.getElementById('habit-week-grid'); if (!weekEl) return;
  const today = new Date(); const dow = today.getDay();
  const weekDates = days.map((_,i) => {
    const d = new Date(today); d.setDate(d.getDate() - ((dow+6)%7) + i);
    return d.toISOString().slice(0,10);
  });
  weekEl.innerHTML = habits.map(h => `
    <div class="habit-week-row">
      <div class="hw-name">${h.icon} ${esc(h.name)}</div>
      <div class="hw-days">${weekDates.map((d,i) => `
        <div class="hw-day${h.weekLog.includes(d)?' done':''}" title="${days[i]}">${days[i][0]}</div>`).join('')}
      </div>
    </div>`).join('');
}

// ===================== GOALS =====================
function addGoal() {
  const title = document.getElementById('m-goal-title').value.trim();
  if (!title) { showToast('Enter goal title'); return; }
  goals.push({ id:uid(), title, cat:document.getElementById('m-goal-cat').value,
    date:document.getElementById('m-goal-date').value,
    progress:parseInt(document.getElementById('m-goal-prog').value)||0,
    desc:document.getElementById('m-goal-desc').value.trim() });
  save('goals', goals);
  document.getElementById('m-goal-title').value='';
  document.getElementById('m-goal-desc').value='';
  document.getElementById('m-goal-prog').value='0';
  closeModal('goal-modal');
  renderGoals(); renderDashboard();
  showToast('Goal added ✓');
}

function updateGoalProgress(id, val) {
  const g = goals.find(x => x.id===id);
  if (g) { g.progress = Math.min(100,Math.max(0,parseInt(val)||0)); save('goals',goals); renderGoals(); }
}
function deleteGoal(id) {
  goals = goals.filter(x => x.id!==id);
  save('goals',goals); renderGoals(); renderDashboard();
  showToast('Goal removed');
}

function renderGoals() {
  const el = document.getElementById('goals-grid'); if (!el) return;
  if (!goals.length) { el.innerHTML = `<div class="empty-state"><i class="ti ti-target"></i>No goals yet. Dream big!</div>`; return; }
  el.innerHTML = goals.map(g => `
    <div class="goal-card">
      <button class="goal-del" onclick="deleteGoal(${g.id})"><i class="ti ti-trash"></i></button>
      <span class="goal-cat-badge gc-${g.cat}">${g.cat}</span>
      <div class="goal-title">${esc(g.title)}</div>
      <div class="goal-desc">${esc(g.desc||'')}</div>
      <div class="goal-prog-track"><div class="goal-prog-fill" style="width:${g.progress}%"></div></div>
      <div class="goal-meta">
        <span>${g.progress}% complete</span>
        ${g.date ? `<span>Due ${fmtDate(g.date)}</span>` : ''}
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
        <span style="font-size:11px;color:var(--text3)">Progress:</span>
        <input class="goal-prog-input" type="number" min="0" max="100" value="${g.progress}"
          onchange="updateGoalProgress(${g.id},this.value)" onclick="event.stopPropagation()"/>
        <span style="font-size:11px;color:var(--text3)">%</span>
      </div>
    </div>`).join('');
}

// ===================== JOURNAL =====================
document.querySelectorAll('.mood-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedMood = parseInt(btn.dataset.mood);
  });
});

function addJournalTag(e) {
  if (e.key !== 'Enter') return;
  const val = e.target.value.trim(); if (!val) return;
  if (!journalTags.includes(val)) journalTags.push(val);
  renderJournalTagsPreview();
  e.target.value = '';
}
function removeJournalTag(tag) {
  journalTags = journalTags.filter(t => t!==tag);
  renderJournalTagsPreview();
}
function renderJournalTagsPreview() {
  const el = document.getElementById('journal-tags-preview'); if (!el) return;
  el.innerHTML = journalTags.map(t => `
    <span class="tag-pill">#${esc(t)}<button onclick="removeJournalTag('${esc(t)}')"><i class="ti ti-x"></i></button></span>`).join('');
}

function saveJournalEntry() {
  const title = document.getElementById('journal-title-inp').value.trim();
  const body  = document.getElementById('journal-body-inp').value.trim();
  if (!title && !body) { showToast('Write something first!'); return; }
  journal.unshift({ id:uid(), title, body, mood:selectedMood, tags:[...journalTags], date:new Date().toISOString() });
  save('journal', journal);
  document.getElementById('journal-title-inp').value='';
  document.getElementById('journal-body-inp').value='';
  journalTags=[];
  renderJournalTagsPreview();
  renderJournal();
  renderDashboard();
  showToast('Entry saved ✓');
}

function renderJournal() {
  const lbl = document.getElementById('journal-today-lbl');
  if (lbl) lbl.textContent = new Date().toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  const el = document.getElementById('journal-entries-list'); if (!el) return;
  if (!journal.length) { el.innerHTML = `<div class="empty-state"><i class="ti ti-notebook"></i>No entries yet.</div>`; return; }
  const moodEmoji = {5:'😄',4:'🙂',3:'😐',2:'😔',1:'😞'};
  el.innerHTML = journal.map(j => `
    <div class="je-card">
      <div class="je-title">${esc(j.title||'Untitled')}</div>
      <div class="je-meta">
        <span>${fmtDate(j.date)}</span>
        <span>${moodEmoji[j.mood]||''}</span>
        ${j.tags.map(t=>`<span style="color:var(--purple);font-size:10px">#${esc(t)}</span>`).join('')}
      </div>
      <div class="je-preview">${esc(j.body||'')}</div>
    </div>`).join('');
}

// ===================== FINANCE =====================
function setBudget() {
  const v = parseFloat(document.getElementById('budget-inp').value);
  if (!v) return;
  budget = v; save('budget', budget);
  renderFinance(); showToast('Budget set ✓');
}

function addExpense() {
  const name = document.getElementById('exp-name').value.trim();
  const amt  = parseFloat(document.getElementById('exp-amt').value);
  if (!name||!amt) { showToast('Fill in description and amount'); return; }
  expenses.unshift({ id:uid(), name, amt, cat:document.getElementById('exp-cat').value, date:new Date().toISOString() });
  save('expenses', expenses);
  document.getElementById('exp-name').value='';
  document.getElementById('exp-amt').value='';
  renderFinance(); renderDashboard();
  showToast('Expense added ✓');
}
function addExpenseModal() {
  const name = document.getElementById('m-exp-name').value.trim();
  const amt  = parseFloat(document.getElementById('m-exp-amt').value);
  if (!name||!amt) { showToast('Fill all fields'); return; }
  expenses.unshift({ id:uid(), name, amt, cat:document.getElementById('m-exp-cat').value, date:new Date().toISOString() });
  save('expenses', expenses);
  document.getElementById('m-exp-name').value='';
  document.getElementById('m-exp-amt').value='';
  closeModal('expense-modal');
  renderFinance(); renderDashboard();
  showToast('Expense added ✓');
}
function deleteExpense(id) {
  expenses = expenses.filter(x => x.id!==id);
  save('expenses', expenses); renderFinance(); renderDashboard();
}

const EXP_CAT_COLORS = { food:'#3ecf8e', transport:'#60a5fa', shopping:'#f5a623', bills:'#f0647a', health:'#2dd4bf', other:'#9d8fff' };

function renderFinance() {
  const thisMonth = new Date().toISOString().slice(0,7);
  const monthExp  = expenses.filter(e => e.date.slice(0,7)===thisMonth);
  const spent     = monthExp.reduce((s,e) => s+e.amt, 0);
  const remaining = Math.max(0, budget-spent);
  const today     = todayStr();
  const todaySpent= expenses.filter(e => e.date.slice(0,10)===today).reduce((s,e)=>s+e.amt,0);

  document.getElementById('fin-budget').textContent    = fmtAmt(budget);
  document.getElementById('fin-spent').textContent     = fmtAmt(spent);
  document.getElementById('fin-remaining').textContent = fmtAmt(remaining);
  document.getElementById('fin-saved').textContent     = fmtAmt(Math.max(0,budget-spent));
  document.getElementById('kpi-budget').textContent    = fmtAmt(todaySpent);

  const el = document.getElementById('expense-list'); if (!el) return;
  if (!expenses.length) { el.innerHTML = `<div class="empty-state"><i class="ti ti-wallet"></i>No expenses yet.</div>`; return; }
  el.innerHTML = expenses.slice(0,40).map(e => `
    <div class="exp-item">
      <div class="exp-name">${esc(e.name)}</div>
      <span class="badge exp-cat-badge" style="background:rgba(${hexToRgb(EXP_CAT_COLORS[e.cat])},0.15);color:${EXP_CAT_COLORS[e.cat]}">${e.cat}</span>
      <span class="exp-date">${fmtDate(e.date)}</span>
      <span class="exp-amt">-${fmtAmt(e.amt)}</span>
      <button class="del-exp" onclick="deleteExpense(${e.id})"><i class="ti ti-trash"></i></button>
    </div>`).join('');
}
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

// ===================== HEALTH =====================
function renderHealth() {
  // Water
  const el = document.getElementById('water-cups'); if (!el) return;
  el.innerHTML = Array.from({length:8},(_,i) =>
    `<div class="cup${i < health.water ? ' filled':''}" onclick="setWater(${i+1})">💧</div>`).join('');
  const wl = document.getElementById('water-label');
  if (wl) wl.textContent = `${health.water} / 8 glasses`;

  // Steps
  const sv = document.getElementById('steps-val');
  if (sv) sv.textContent = health.steps.toLocaleString('en-IN');
  const sr = document.getElementById('steps-ring');
  if (sr) {
    const pct = Math.min(1, health.steps/10000);
    sr.setAttribute('stroke-dashoffset', (314.2*(1-pct)).toFixed(1));
  }

  // Sleep history
  const sh = document.getElementById('sleep-history'); if (!sh) return;
  sh.innerHTML = (health.sleep||[]).slice(-5).reverse().map(s =>
    `<div class="sleep-item"><span>${fmtDate(s.date)}</span><span>${s.bed} → ${s.wake}</span><span>${s.hours}h</span></div>`).join('');

  // Workouts
  const wkEl = document.getElementById('workout-list'); if (!wkEl) return;
  wkEl.innerHTML = (health.workouts||[]).slice(-6).reverse().map(w =>
    `<div class="workout-item"><span class="workout-name">💪 ${esc(w.name)}</span><span class="workout-dur">${w.duration} min</span></div>`).join('');
}
function setWater(n) { health.water = n; save('health',health); renderHealth(); showToast(`${n} glasses logged 💧`); }
function logSteps() {
  const v = parseInt(document.getElementById('steps-inp').value)||0;
  health.steps = v; save('health',health); renderHealth(); showToast('Steps logged ✓');
}
function logSleep() {
  const bed  = document.getElementById('sleep-bed').value;
  const wake = document.getElementById('sleep-wake').value;
  const bH = parseInt(bed.split(':')[0]),  bM = parseInt(bed.split(':')[1]);
  const wH = parseInt(wake.split(':')[0]), wM = parseInt(wake.split(':')[1]);
  let mins = (wH*60+wM) - (bH*60+bM);
  if (mins < 0) mins += 1440;
  const hours = (mins/60).toFixed(1);
  if (!health.sleep) health.sleep = [];
  health.sleep.push({ date:todayStr(), bed, wake, hours });
  save('health',health);
  const sr = document.getElementById('sleep-result');
  if (sr) sr.textContent = `${hours} hours of sleep`;
  renderHealth(); showToast('Sleep logged ✓');
}
function logWorkout() {
  const name = document.getElementById('workout-name').value.trim();
  const dur  = parseInt(document.getElementById('workout-dur').value)||0;
  if (!name) { showToast('Enter workout name'); return; }
  if (!health.workouts) health.workouts = [];
  health.workouts.push({ name, duration:dur, date:todayStr() });
  save('health',health);
  document.getElementById('workout-name').value='';
  document.getElementById('workout-dur').value='';
  renderHealth(); showToast('Workout logged 💪');
}

// ===================== NOTES =====================
const NOTE_COLORS = ['#1e1d35','#1a2e1a','#2e1a1a','#1a2035','#2e2a1a'];
function addNote() {
  notes.unshift({ id:uid(), title:'', body:'', date:new Date().toISOString(), color:NOTE_COLORS[0] });
  save('notes',notes); renderNotes();
}
function updateNote(id, field, val) {
  const n = notes.find(x => x.id===id);
  if (n) { n[field]=val; save('notes',notes); }
}
function deleteNote(id) {
  notes = notes.filter(x => x.id!==id);
  save('notes',notes); renderNotes(); showToast('Note deleted');
}
function setNoteColor(id, color) {
  const n = notes.find(x => x.id===id);
  if (n) { n.color=color; save('notes',notes); renderNotes(); }
}
function renderNotes() {
  const el = document.getElementById('notes-grid'); if (!el) return;
  if (!notes.length) { el.innerHTML = `<div class="empty-state"><i class="ti ti-notes"></i>No notes. Click "+ New note" to start.</div>`; return; }
  el.innerHTML = notes.map(n => `
    <div class="note-card" style="background:${n.color}">
      <button class="note-del" onclick="deleteNote(${n.id})"><i class="ti ti-trash"></i></button>
      <input class="note-card-title" value="${esc(n.title)}" placeholder="Title…"
        oninput="updateNote(${n.id},'title',this.value)" onclick="event.stopPropagation()"/>
      <textarea class="note-card-body" placeholder="Write here…"
        oninput="updateNote(${n.id},'body',this.value)" onclick="event.stopPropagation()">${esc(n.body)}</textarea>
      <div class="note-date">${fmtDate(n.date)}</div>
      <div class="note-colors">${NOTE_COLORS.map(c=>`<div class="nc" style="background:${c}" onclick="setNoteColor(${n.id},'${c}')"></div>`).join('')}</div>
    </div>`).join('');
}

// ===================== ANALYTICS =====================
function renderAnalytics() {
  // Tasks by category
  const cats = {}; tasks.forEach(t => { cats[t.cat]=(cats[t.cat]||{total:0,done:0}); cats[t.cat].total++; if(t.done)cats[t.cat].done++; });
  renderBars('ana-cat-bars', Object.entries(cats).map(([k,v])=>({ label:CAT_LABELS[k]||k, val:v.done, total:v.total, color:CAT_COLORS[k]||'#9d8fff' })));

  // Tasks by priority
  const pris = {high:{label:'High',total:0,done:0},med:{label:'Medium',total:0,done:0},low:{label:'Low',total:0,done:0}};
  tasks.forEach(t=>{if(pris[t.pri]){pris[t.pri].total++;if(t.done)pris[t.pri].done++;}});
  renderBars('ana-pri-bars', Object.entries(pris).map(([k,v])=>({ label:v.label, val:v.done, total:v.total, color:k==='high'?'#f0647a':k==='med'?'#f5a623':'#3ecf8e' })));

  // Habits
  const hEl = document.getElementById('ana-habits');
  if (hEl) hEl.innerHTML = habits.length ? habits.map(h=>{
    const done = h.weekLog.length, target = h.target, pct = Math.round(done/Math.max(target,1)*100);
    return `<div class="ana-bar-row">
      <span class="ana-bar-label">${h.icon} ${esc(h.name)}</span>
      <div class="ana-bar-track"><div class="ana-bar-fill" style="width:${pct}%;background:#9d8fff"></div></div>
      <span class="ana-bar-val">${done}/${target}</span>
    </div>`;}).join('') : '<div class="empty-state" style="padding:16px"><i class="ti ti-repeat"></i>No habits yet.</div>';

  // Finance
  const finCats = {}; expenses.forEach(e => { finCats[e.cat]=(finCats[e.cat]||0)+e.amt; });
  const finMax  = Math.max(...Object.values(finCats),1);
  const fEl = document.getElementById('ana-finance');
  if (fEl) fEl.innerHTML = Object.entries(finCats).length ? Object.entries(finCats).map(([cat,amt])=>`
    <div class="ana-bar-row">
      <span class="ana-bar-label">${cat}</span>
      <div class="ana-bar-track"><div class="ana-bar-fill" style="width:${Math.round(amt/finMax*100)}%;background:${EXP_CAT_COLORS[cat]||'#9d8fff'}"></div></div>
      <span class="ana-bar-val">${fmtAmt(amt)}</span>
    </div>`).join('') : '<div class="empty-state" style="padding:16px"><i class="ti ti-wallet"></i>No expenses yet.</div>';

  // Life score
  const tt = todayTasks(); const taskScore = tt.length ? Math.round(tt.filter(t=>t.done).length/tt.length*100) : 0;
  const habitScore = habits.length ? Math.round(habits.filter(h=>h.doneToday).length/habits.length*100) : 0;
  const goalScore  = goals.length  ? Math.round(goals.reduce((s,g)=>s+g.progress,0)/goals.length) : 0;
  const thisMonth = new Date().toISOString().slice(0,7);
  const spent = expenses.filter(e=>e.date.slice(0,7)===thisMonth).reduce((s,e)=>s+e.amt,0);
  const finScore = budget ? Math.round(Math.max(0,(1-spent/budget))*100) : 50;
  const wellScore= Math.round((health.water/8*50) + (Math.min(health.steps,10000)/10000*50));
  const overallScore = Math.round((taskScore+habitScore+goalScore+finScore+wellScore)/5);
  const lsg = document.getElementById('life-score-grid'); if (!lsg) return;
  lsg.innerHTML = [
    {lbl:'Overall',score:overallScore,color:'#9d8fff'},{lbl:'Productivity',score:taskScore,color:'#3ecf8e'},
    {lbl:'Habits',score:habitScore,color:'#f5a623'},{lbl:'Goals',score:goalScore,color:'#60a5fa'},
    {lbl:'Finance',score:finScore,color:'#2dd4bf'},{lbl:'Wellness',score:wellScore,color:'#f08060'},
  ].map(s=>`<div class="ls-card"><div class="ls-score" style="color:${s.color}">${s.score}</div><div class="ls-lbl">${s.lbl}</div></div>`).join('');
}

function renderBars(elId, items) {
  const el = document.getElementById(elId); if (!el) return;
  if (!items.length) { el.innerHTML = `<div class="empty-state" style="padding:16px">No data yet.</div>`; return; }
  const max = Math.max(...items.map(i=>i.total),1);
  el.innerHTML = items.map(i=>`
    <div class="ana-bar-row">
      <span class="ana-bar-label">${i.label}</span>
      <div class="ana-bar-track"><div class="ana-bar-fill" style="width:${Math.round(i.val/max*100)}%;background:${i.color}"></div></div>
      <span class="ana-bar-val">${i.val}/${i.total}</span>
    </div>`).join('');
}

// ===================== DASHBOARD =====================
function renderDashboard() {
  // Stats
  const tt = todayTasks();
  const done = tt.filter(t=>t.done).length;
  document.getElementById('kpi-tasks').textContent = tt.length;
  document.getElementById('kpi-tasks-done').textContent = `${done} done`;
  const totalH = habits.length, doneH = habits.filter(h=>h.doneToday).length;
  document.getElementById('kpi-habits').textContent = totalH ? Math.round(doneH/totalH*100)+'%' : '—';
  document.getElementById('kpi-habits-sub').textContent = `${doneH}/${totalH} habits`;
  document.getElementById('kpi-goals').textContent = goals.length;
  document.getElementById('kpi-goals-sub').textContent = goals.filter(g=>g.progress<100).length + ' in progress';

  // Dash tasks
  renderTasksInto('dash-tasks-list', tt.slice(0,5));

  // Dash habits
  const dhEl = document.getElementById('dash-habits-list'); if (dhEl) {
    dhEl.innerHTML = habits.slice(0,5).map(h=>`
      <div class="task-item" onclick="toggleHabit(${h.id})" style="cursor:pointer">
        <div class="chk${h.doneToday?' done':''}"><i class="ti ti-check" ${h.doneToday?'':'style="display:none"'}></i></div>
        <div class="t-body">
          <div class="t-name">${h.icon} ${esc(h.name)}</div>
          <div class="t-meta"><span style="font-size:11px;color:var(--text3)">🔥 ${h.streak} day streak</span></div>
        </div>
      </div>`).join('') || `<div class="empty-state"><i class="ti ti-repeat"></i>No habits yet.</div>`;
  }

  // Dash goals
  const dgEl = document.getElementById('dash-goals-list'); if (dgEl) {
    dgEl.innerHTML = goals.slice(0,4).map(g=>`
      <div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text2);margin-bottom:4px">
          <span>${esc(g.title)}</span><span style="color:var(--text3)">${g.progress}%</span></div>
        <div class="goal-prog-track"><div class="goal-prog-fill" style="width:${g.progress}%"></div></div>
      </div>`).join('') || `<div class="empty-state"><i class="ti ti-target"></i>No goals yet.</div>`;
  }

  // Dash journal
  const djEl = document.getElementById('dash-journal'); if (djEl) {
    const last = journal[0];
    djEl.innerHTML = last ? `
      <div class="je-card">
        <div class="je-title">${esc(last.title||'Untitled')}</div>
        <div class="je-meta"><span>${fmtDate(last.date)}</span></div>
        <div class="je-preview">${esc(last.body||'')}</div>
      </div>` : `<div class="empty-state"><i class="ti ti-notebook"></i>No journal entries yet.</div>`;
  }

  // Dash finance
  const dfEl = document.getElementById('dash-finance'); if (dfEl) {
    dfEl.innerHTML = expenses.slice(0,4).map(e=>`
      <div class="exp-item">
        <span class="exp-name">${esc(e.name)}</span>
        <span class="exp-amt">-${fmtAmt(e.amt)}</span>
      </div>`).join('') || `<div class="empty-state"><i class="ti ti-wallet"></i>No expenses yet.</div>`;
  }

  updateSidebarRing();
}

// ===================== SIDEBAR RING =====================
function updateSidebarRing() {
  const tt = todayTasks();
  const done = tt.filter(t=>t.done).length;
  const pct = tt.length ? Math.round(done/tt.length*100) : 0;
  document.getElementById('sb-ring-pct').textContent = pct+'%';
  const circ = 213.6;
  document.getElementById('sb-ring').setAttribute('stroke-dashoffset', (circ*(1-pct/100)).toFixed(1));
}

// ===================== GREETING / DATE =====================
function initMeta() {
  const h = new Date().getHours();
  const g = h < 12 ? 'Good morning ☀️' : h < 17 ? 'Good afternoon 🌤️' : 'Good evening 🌙';
  document.getElementById('sb-greeting').textContent = g;
  document.getElementById('greeting').textContent = g;
  const opts = {weekday:'long',year:'numeric',month:'long',day:'numeric'};
  const dateStr = new Date().toLocaleDateString('en-IN',opts);
  document.getElementById('sb-date').textContent = dateStr;
  const tdSub = document.getElementById('today-date-sub');
  if (tdSub) tdSub.textContent = dateStr;
  const jlbl = document.getElementById('journal-today-lbl');
  if (jlbl) jlbl.textContent = dateStr;
}

// ===================== SESSION TIMER =====================
function startTimer() {
  const start = Date.now();
  setInterval(() => {
    const s = Math.floor((Date.now()-start)/1000);
    const hh=Math.floor(s/3600), mm=Math.floor((s%3600)/60), ss=s%60;
    const el = document.getElementById('sb-timer');
    if (el) el.textContent = [hh,mm,ss].map(x=>String(x).padStart(2,'0')).join(':');
  }, 1000);
}

// ===================== EXPORT =====================
function exportData() {
  const data = { tasks, habits, goals, journal, expenses, health, notes, budget, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `worklife-planner-backup-${todayStr()}.json`;
  a.click();
  showToast('Data exported ✓');
}

// ===================== MIDNIGHT RESET =====================
function scheduleMidnightReset() {
  const now = new Date(), midnight = new Date(now);
  midnight.setHours(24,0,0,0);
  setTimeout(() => {
    tasks.forEach(t => { if (t.date===todayStr()) t.done = false; });
    habits.forEach(h => h.doneToday = false);
    health.water = 0; health.steps = 0;
    save('tasks',tasks); save('habits',habits); save('health',health);
    renderDashboard(); renderToday(); renderHabits(); renderHealth();
    scheduleMidnightReset();
  }, midnight - now);
}

// ===================== INIT =====================
initMeta();
startTimer();
scheduleMidnightReset();
renderDashboard();
renderToday();
