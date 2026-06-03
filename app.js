'use strict';
// ===== STORAGE =====
const SK = 'wlp2-';
function load(k,d){try{const r=localStorage.getItem(SK+k);return r?JSON.parse(r):d;}catch{return d;}}
function save(k,v){try{localStorage.setItem(SK+k,JSON.stringify(v));}catch{}}

// ===== STATE =====
let tasks    = load('tasks', defaultTasks());
let fixedTasks = load('fixedTasks', defaultFixedTasks()); // weekly grid rows
let gridChecks = load('gridChecks', {}); // {taskId_dateStr: bool}
let habits   = load('habits', defaultHabits());
let goals    = load('goals', defaultGoals());
let journal  = load('journal', []);
let expenses = load('expenses', []);
let health   = load('health', {water:0,steps:0,sleep:[],workouts:[]});
let notes    = load('notes', []);
let budget   = load('budget', 30000);
let journalTags = [];
let selectedMood = 5;
let taskFilter = 'all', taskFilter2 = 'all';
let weekOffset = 0; // 0 = current week
let nextId = load('nextId', 200);
function uid(){const id=++nextId;save('nextId',nextId);return id;}

// ===== DEFAULT DATA =====
function defaultTasks(){
  const t = todayStr();
  return [
    {id:1,name:'Check & respond to overnight emails',cat:'work',pri:'high',done:false,date:t,notes:''},
    {id:2,name:'Review today\'s calendar & meetings',cat:'admin',pri:'high',done:false,date:t,notes:''},
    {id:3,name:'Daily standup with team',cat:'team',pri:'med',done:false,date:t,notes:''},
    {id:4,name:'Update project tracker',cat:'work',pri:'med',done:false,date:t,notes:''},
    {id:5,name:'Morning water + stretch',cat:'health',pri:'low',done:false,date:t,notes:''},
    {id:6,name:'Set top 3 priorities for the day',cat:'personal',pri:'high',done:false,date:t,notes:''},
  ];
}
function defaultFixedTasks(){
  return [
    {id:101,name:'techalphawaba count',cat:'work',type:'daily',days:[]},
    {id:102,name:'TechalphaRCS count',cat:'work',type:'daily',days:[]},
    {id:103,name:'SRPL_Group Count',cat:'work',type:'daily',days:[]},
    {id:104,name:'SRPL_Group Campaign',cat:'work',type:'daily',days:[]},
    {id:105,name:'Angelone 655 utility Sheet',cat:'work',type:'daily',days:[]},
    {id:106,name:'Angelone 3 month sms + whatsApp + RCS Sheet',cat:'work',type:'daily',days:[]},
    {id:107,name:'Check daily report & send to manager',cat:'admin',type:'daily',days:[]},
    {id:108,name:'Weekly team meeting',cat:'team',type:'weekly',days:[0]},
    {id:109,name:'Monthly report preparation',cat:'admin',type:'weekly',days:[4]},
    {id:110,name:'Client follow-up calls',cat:'work',type:'weekly',days:[1,3]},
  ];
}
function defaultHabits(){
  return [
    {id:1,name:'Morning meditation',icon:'🧘',streak:0,target:7,doneToday:false,weekLog:[]},
    {id:2,name:'Exercise 30 mins',icon:'🏋️',streak:0,target:5,doneToday:false,weekLog:[]},
    {id:3,name:'Read 20 minutes',icon:'📚',streak:0,target:7,doneToday:false,weekLog:[]},
  ];
}
function defaultGoals(){
  return [
    {id:1,cat:'career',title:'Achieve quarterly sales target',desc:'Hit 120% of Q3 target.',progress:40,date:'2025-09-30'},
    {id:2,cat:'health',title:'Run 5km without stopping',desc:'Train daily for 8 weeks.',progress:25,date:'2025-10-01'},
    {id:3,cat:'finance',title:'Save ₹5L emergency fund',desc:'₹40,000/month savings.',progress:55,date:'2025-12-31'},
  ];
}

// ===== UTILS =====
function todayStr(){return new Date().toISOString().slice(0,10);}
function fmtDate(d){return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});}
function fmtAmt(n){return '₹'+Number(n).toLocaleString('en-IN');}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600);}

// ===== NAVIGATION =====
function switchView(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.sb-link').forEach(l=>l.classList.remove('active'));
  const v=document.getElementById('view-'+name);if(v)v.classList.add('active');
  const l=document.querySelector(`.sb-link[data-view="${name}"]`);if(l)l.classList.add('active');
  if(name==='weekly')    renderWeeklyGrid();
  if(name==='today')     renderToday();
  if(name==='tasks')     renderAllTasks();
  if(name==='habits')    renderHabits();
  if(name==='goals')     renderGoals();
  if(name==='journal')   renderJournal();
  if(name==='finance')   renderFinance();
  if(name==='health')    renderHealth();
  if(name==='notes')     renderNotes();
  if(name==='analytics') renderAnalytics();
  if(name==='dashboard') renderDashboard();
}
document.querySelectorAll('.sb-link').forEach(el=>{
  el.addEventListener('click',e=>{e.preventDefault();switchView(el.dataset.view);});
});

// ===== MODAL =====
function openModal(id){document.getElementById(id).classList.add('open');}
function closeModal(id){document.getElementById(id).classList.remove('open');}
function closeBg(e,id){if(e.target.id===id)closeModal(id);}

// ===== FIXED TASK TYPE TOGGLE =====
document.getElementById('m-ft-type').addEventListener('change',function(){
  document.getElementById('day-picker').style.display=this.value==='weekly'?'block':'none';
});

// ===== WEEKLY GRID =====
function getWeekDates(offset){
  const today=new Date();
  const dow=(today.getDay()+6)%7; // Mon=0
  const monday=new Date(today);
  monday.setDate(today.getDate()-dow+offset*7);
  return Array.from({length:7},(_,i)=>{const d=new Date(monday);d.setDate(monday.getDate()+i);return d;});
}
const DAY_SHORT=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DAY_FULL=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function renderWeeklyGrid(){
  const dates=getWeekDates(weekOffset);
  const todayS=todayStr();

  // Week label
  const wl=document.getElementById('week-nav-label');
  if(wl)wl.textContent=`📅 Week of ${dates[0].toLocaleDateString('en-IN',{day:'numeric',month:'long'})} – ${dates[6].toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}`;

  buildGridTable('daily-thead','daily-tbody', fixedTasks.filter(t=>t.type==='daily'), dates, todayS, true);
  buildGridTable('weekly-thead2','weekly-tbody', fixedTasks.filter(t=>t.type==='weekly'), dates, todayS, false);
  renderWeekSummary(dates, todayS);
}

function buildGridTable(theadId, tbodyId, rows, dates, todayS, isDaily){
  const thead=document.getElementById(theadId);
  const tbody=document.getElementById(tbodyId);
  if(!thead||!tbody)return;

  // Header
  thead.innerHTML=`<tr>
    <th class="task-col"><i class="ti ti-list" style="margin-right:6px;color:rgba(255,255,255,.6)"></i>Task</th>
    ${dates.map((d,i)=>{
      const ds=d.toISOString().slice(0,10);
      const isToday=ds===todayS;
      return `<th class="${isToday?'today-col':''}">${DAY_SHORT[i]}<br><span style="font-size:9px;font-weight:400;opacity:.7">${d.getDate()}/${d.getMonth()+1}</span></th>`;
    }).join('')}
    <th style="width:40px"></th>
  </tr>`;

  if(!rows.length){
    tbody.innerHTML=`<tr><td colspan="9" style="padding:28px;text-align:center;color:#94a3b8;font-size:13px"><i class="ti ti-plus-square" style="margin-right:6px"></i>No tasks yet — click "Add task row" to add one.</td></tr>`;
    return;
  }

  tbody.innerHTML=rows.map(row=>{
    const cells=dates.map((d,i)=>{
      const ds=d.toISOString().slice(0,10);
      const isToday=ds===todayS;
      // For weekly tasks, only show checkbox on selected days
      const show=isDaily || row.days.includes(i);
      const key=`${row.id}_${ds}`;
      const checked=gridChecks[key]||false;
      if(!show) return `<td class="check-cell${isToday?' today-check':''}"><span class="grid-na-dash">—</span></td>`;
      return `<td class="check-cell${isToday?' today-check':''}" onclick="toggleGrid(${row.id},'${ds}')">
        <div class="grid-chk${checked?' checked':''}" id="gc_${row.id}_${ds.replace(/-/g,'_')}">
          <i class="ti ti-check"></i>
        </div>
      </td>`;
    }).join('');
    const catCls = 'cat-badge-'+(row.cat||'work');
    return `<tr>
      <td class="task-name-cell">
        <span class="row-icon">📋</span>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">
            <div class="grid-task-name" style="font-size:13px;font-weight:700;line-height:1.3">${esc(row.name)}</div>
            <span class="${catCls}" style="font-size:10px;padding:2px 9px;border-radius:6px;font-weight:700;white-space:nowrap;flex-shrink:0">${row.cat}</span>
          </div>
          ${row.note?`<div class="row-note"><i class="ti ti-notes" style="font-size:10px;margin-right:3px"></i>${esc(row.note)}</div>`:''}
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0">
          <button class="row-edit" onclick="openEditFixedTask(${row.id})" title="Edit"><i class="ti ti-edit"></i></button>
          <button class="row-del" onclick="deleteFixedTask(${row.id})" title="Remove"><i class="ti ti-trash"></i></button>
        </div>
      </td>
      ${cells}
      <td></td>
    </tr>`;
  }).join('');
}

function toggleGrid(taskId, dateStr){
  const key=`${taskId}_${dateStr}`;
  gridChecks[key]=!gridChecks[key];
  save('gridChecks',gridChecks);
  const elId=`gc_${taskId}_${dateStr.replace(/-/g,'_')}`;
  const el=document.getElementById(elId);
  if(el){
    if(gridChecks[key])el.classList.add('checked');
    else el.classList.remove('checked');
  }
  renderWeekSummary(getWeekDates(weekOffset),todayStr());
  updateSbRing();
  toast(gridChecks[key]?'Task checked ✓':'Task unchecked');
}

function renderWeekSummary(dates,todayS){
  const el=document.getElementById('week-summary-row');if(!el)return;
  const daily=fixedTasks.filter(t=>t.type==='daily');
  el.innerHTML=dates.map((d,i)=>{
    const ds=d.toISOString().slice(0,10);
    const isToday=ds===todayS;
    let total=0,done=0;
    fixedTasks.forEach(ft=>{
      const relevant=ft.type==='daily'||ft.days.includes(i);
      if(!relevant)return;
      total++;
      if(gridChecks[`${ft.id}_${ds}`])done++;
    });
    const pct=total?Math.round(done/total*100):0;
    return `<div class="day-summary${isToday?' today-summary':''}">
      <div class="ds-day">${DAY_SHORT[i]}</div>
      <div class="ds-count">${done}</div>
      <div class="ds-label">of ${total} done</div>
      <div class="ds-pct">${pct}%</div>
    </div>`;
  }).join('');
}

function prevWeek(){weekOffset--;renderWeeklyGrid();}
function nextWeek(){weekOffset++;renderWeeklyGrid();}
function goToday(){weekOffset=0;renderWeeklyGrid();}

function addFixedTask(){
  const name=document.getElementById('m-ft-name').value.trim();
  if(!name){toast('Enter task name');return;}
  const type=document.getElementById('m-ft-type').value;
  const days=type==='weekly'
    ?Array.from(document.querySelectorAll('#day-checks input:checked')).map(i=>parseInt(i.value))
    :[];
  fixedTasks.push({id:uid(),name,cat:document.getElementById('m-ft-cat').value,type,days});
  save('fixedTasks',fixedTasks);
  document.getElementById('m-ft-name').value='';
  document.querySelectorAll('#day-checks input').forEach(i=>i.checked=false);
  closeModal('fixed-task-modal');
  renderWeeklyGrid();
  renderDashboard();
  toast('Task added to grid ✓');
}
function deleteFixedTask(id){
  fixedTasks=fixedTasks.filter(x=>x.id!==id);
  save('fixedTasks',fixedTasks);
  renderWeeklyGrid();
  toast('Removed from grid');
}

// ===== TASKS (regular) =====
const CAT_L={work:'Work',personal:'Personal',health:'Health',admin:'Admin',team:'Team',learning:'Learning'};
const PRI_L={high:'High',med:'Medium',low:'Low'};
const CAT_C={work:'#60a5fa',personal:'#fbbf24',health:'#34d399',admin:'#a78bfa',team:'#f472b6',learning:'#2dd4bf'};

function todayTasks(){return tasks.filter(t=>t.date===todayStr());}

function addTaskModal(){
  const name=document.getElementById('m-t-name').value.trim();
  if(!name){toast('Enter task name');return;}
  tasks.push({id:uid(),name,cat:document.getElementById('m-t-cat').value,
    pri:document.getElementById('m-t-pri').value,done:false,date:todayStr(),
    notes:document.getElementById('m-t-notes').value.trim()});
  save('tasks',tasks);
  document.getElementById('m-t-name').value='';
  document.getElementById('m-t-notes').value='';
  closeModal('task-modal');
  renderDashboard();renderToday();renderAllTasks();updateSbRing();
  toast('Task added ✓');
}
function quickAdd(){
  const name=document.getElementById('t-name').value.trim();if(!name)return;
  tasks.push({id:uid(),name,cat:document.getElementById('t-cat').value,
    pri:document.getElementById('t-pri').value,done:false,date:todayStr(),notes:''});
  save('tasks',tasks);document.getElementById('t-name').value='';
  renderAllTasks();renderDashboard();renderToday();updateSbRing();toast('Task added ✓');
}
function toggleTask(id){
  const t=tasks.find(x=>x.id===id);if(t){t.done=!t.done;save('tasks',tasks);renderDashboard();renderToday();renderAllTasks();updateSbRing();}
}
function delTask(id){
  tasks=tasks.filter(x=>x.id!==id);save('tasks',tasks);renderDashboard();renderToday();renderAllTasks();updateSbRing();toast('Removed');
}
function resetToday(){todayTasks().forEach(t=>t.done=false);save('tasks',tasks);renderToday();renderDashboard();updateSbRing();}

function taskHTML(t){
  return `<div class="task-item${t.done?' done':''}" onclick="toggleTask(${t.id})">
    <div class="chk"><i class="ti ti-check"></i></div>
    <div class="t-body">
      <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">
        <div class="t-name" style="margin:0">${esc(t.name)}</div>
        <span class="badge b-${t.cat}" style="flex-shrink:0">${CAT_L[t.cat]||t.cat}</span>
        <div style="display:flex;align-items:center;gap:4px;flex-shrink:0"><div class="pdot p-${t.pri}"></div><span class="pt">${PRI_L[t.pri]||t.pri}</span></div>
      </div>
      ${t.notes?`<div class="t-note">${esc(t.notes)}</div>`:''}
    </div>
    <button class="del-btn" onclick="event.stopPropagation();delTask(${t.id})"><i class="ti ti-trash"></i></button>
  </div>`;
}

function renderList(elId,list){
  const el=document.getElementById(elId);if(!el)return;
  if(!list.length){el.innerHTML=`<div class="empty-st"><i class="ti ti-clipboard"></i>No tasks here.</div>`;return;}
  const pending=list.filter(t=>!t.done),done=list.filter(t=>t.done);
  let h=pending.map(taskHTML).join('');
  if(done.length)h+=`<div class="sec-sep">Completed (${done.length})</div>`+done.map(taskHTML).join('');
  el.innerHTML=h;
}

// Today filter tabs
document.getElementById('today-filters').addEventListener('click',e=>{
  const btn=e.target.closest('.ftab');if(!btn)return;
  document.querySelectorAll('#today-filters .ftab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');taskFilter=btn.dataset.f;renderToday();
});
document.getElementById('task-filters').addEventListener('click',e=>{
  const btn=e.target.closest('.ftab');if(!btn)return;
  document.querySelectorAll('#task-filters .ftab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');taskFilter2=btn.dataset.f2;renderAllTasks();
});

function renderToday(){
  let list=todayTasks();
  if(taskFilter==='pending')list=list.filter(t=>!t.done);
  if(taskFilter==='done')list=list.filter(t=>t.done);
  if(taskFilter==='high')list=list.filter(t=>t.pri==='high');
  renderList('today-task-list',list);
  const all=todayTasks(),done=all.filter(t=>t.done).length,pct=all.length?Math.round(done/all.length*100):0;
  document.getElementById('today-prog').style.width=pct+'%';
  document.getElementById('today-prog-lbl').textContent=`${done} of ${all.length} complete · ${pct}%`;
}
function renderAllTasks(){
  let list=[...tasks].sort((a,b)=>a.date<b.date?1:-1);
  if(taskFilter2!=='all')list=list.filter(t=>t.cat===taskFilter2);
  renderList('all-task-list',list);
}

// ===== HABITS =====
function addHabit(){
  const name=document.getElementById('m-h-name').value.trim();if(!name){toast('Enter name');return;}
  habits.push({id:uid(),name,icon:document.getElementById('m-h-icon').value||'✅',streak:0,
    target:parseInt(document.getElementById('m-h-tgt').value)||7,doneToday:false,weekLog:[]});
  save('habits',habits);document.getElementById('m-h-name').value='';closeModal('habit-modal');
  renderHabits();renderDashboard();toast('Habit added ✓');
}
function toggleHabit(id){
  const h=habits.find(x=>x.id===id);if(!h)return;
  h.doneToday=!h.doneToday;
  if(h.doneToday){h.streak++;h.weekLog.push(todayStr());}
  else{h.streak=Math.max(0,h.streak-1);h.weekLog=h.weekLog.filter(d=>d!==todayStr());}
  save('habits',habits);renderHabits();renderDashboard();updateSbRing();
}
function delHabit(id){habits=habits.filter(x=>x.id!==id);save('habits',habits);renderHabits();renderDashboard();toast('Removed');}
function renderHabits(){
  const el=document.getElementById('habits-grid');if(!el)return;
  el.innerHTML=habits.length?habits.map(h=>`
    <div class="habit-card${h.doneToday?' done-today':''}">
      <button class="habit-del" onclick="delHabit(${h.id})"><i class="ti ti-x"></i></button>
      <div class="habit-emoji">${h.icon}</div>
      <div class="habit-name">${esc(h.name)}</div>
      <div class="habit-streak">🔥 ${h.streak} day streak · ${h.target}×/wk</div>
      <button class="habit-btn" onclick="toggleHabit(${h.id})">
        <i class="ti ti-${h.doneToday?'check':'circle'}"></i>${h.doneToday?'Done today!':'Mark done'}
      </button>
    </div>`).join('')
    :`<div class="empty-st"><i class="ti ti-repeat"></i>No habits yet.</div>`;

  // Heatmap
  const wm=document.getElementById('habit-week-map');if(!wm)return;
  const today=new Date(),dow=(today.getDay()+6)%7;
  const weekDates=DAY_SHORT.map((_,i)=>{const d=new Date(today);d.setDate(d.getDate()-dow+i);return d.toISOString().slice(0,10);});
  wm.innerHTML=habits.map(h=>`
    <div class="hw-row">
      <div class="hw-name">${h.icon} ${esc(h.name)}</div>
      <div class="hw-days">${weekDates.map((d,i)=>`<div class="hw-day${h.weekLog.includes(d)?' done':''}" title="${DAY_FULL[i]}">${DAY_SHORT[i][0]}</div>`).join('')}</div>
    </div>`).join('');
}

// ===== GOALS =====
function addGoal(){
  const title=document.getElementById('m-g-title').value.trim();if(!title){toast('Enter title');return;}
  goals.push({id:uid(),title,cat:document.getElementById('m-g-cat').value,
    date:document.getElementById('m-g-date').value,
    progress:parseInt(document.getElementById('m-g-prog').value)||0,
    desc:document.getElementById('m-g-desc').value.trim()});
  save('goals',goals);document.getElementById('m-g-title').value='';document.getElementById('m-g-desc').value='';
  closeModal('goal-modal');renderGoals();renderDashboard();toast('Goal added ✓');
}
function updateGoalProg(id,v){const g=goals.find(x=>x.id===id);if(g){g.progress=Math.min(100,Math.max(0,parseInt(v)||0));save('goals',goals);renderGoals();}}
function delGoal(id){goals=goals.filter(x=>x.id!==id);save('goals',goals);renderGoals();renderDashboard();toast('Removed');}
function renderGoals(){
  const el=document.getElementById('goals-grid');if(!el)return;
  el.innerHTML=goals.length?goals.map(g=>`
    <div class="goal-card">
      <button class="goal-del" onclick="delGoal(${g.id})"><i class="ti ti-trash"></i></button>
      <span class="goal-badge gc-${g.cat}">${g.cat}</span>
      <div class="goal-title">${esc(g.title)}</div>
      <div class="goal-desc">${esc(g.desc||'')}</div>
      <div class="goal-prog-track"><div class="goal-prog-fill" style="width:${g.progress}%"></div></div>
      <div class="goal-meta"><span>${g.progress}% complete</span>${g.date?`<span>Due ${fmtDate(g.date)}</span>`:''}</div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
        <span style="font-size:11px;color:var(--text3)">Progress:</span>
        <input class="goal-prog-inp" type="number" min="0" max="100" value="${g.progress}"
          onchange="updateGoalProg(${g.id},this.value)" onclick="event.stopPropagation()"/>
        <span style="font-size:11px;color:#94a3b8">%</span>
      </div>
    </div>`).join('')
    :`<div class="empty-st"><i class="ti ti-target"></i>No goals yet.</div>`;
}

// ===== JOURNAL =====
document.getElementById('mood-btns').addEventListener('click',e=>{
  const btn=e.target.closest('.mood-btn');if(!btn)return;
  document.querySelectorAll('.mood-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');selectedMood=parseInt(btn.dataset.mood);
});
function addTag(e){
  if(e.key!=='Enter')return;
  const v=e.target.value.trim();if(!v)return;
  if(!journalTags.includes(v))journalTags.push(v);
  renderTagsList();e.target.value='';
}
function removeTag(t){journalTags=journalTags.filter(x=>x!==t);renderTagsList();}
function renderTagsList(){
  const el=document.getElementById('j-tags-list');if(!el)return;
  el.innerHTML=journalTags.map(t=>`<span class="tag-pill">#${esc(t)}<button onclick="removeTag('${esc(t)}')"><i class="ti ti-x"></i></button></span>`).join('');
}
function saveJournal(){
  const title=document.getElementById('j-title').value.trim(),body=document.getElementById('j-body').value.trim();
  if(!title&&!body){toast('Write something first!');return;}
  journal.unshift({id:uid(),title,body,mood:selectedMood,tags:[...journalTags],date:new Date().toISOString()});
  save('journal',journal);document.getElementById('j-title').value='';document.getElementById('j-body').value='';
  journalTags=[];renderTagsList();renderJournal();renderDashboard();toast('Entry saved ✓');
}
function renderJournal(){
  const el=document.getElementById('j-date-lbl');if(el)el.textContent=new Date().toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  const jl=document.getElementById('journal-list');if(!jl)return;
  const moodE={5:'😄',4:'🙂',3:'😐',2:'😔',1:'😞'};
  jl.innerHTML=journal.length?journal.map(j=>`
    <div class="je">
      <div class="je-title">${esc(j.title||'Untitled')}</div>
      <div class="je-meta"><span>${fmtDate(j.date)}</span><span>${moodE[j.mood]||''}</span>${j.tags.map(t=>`<span style="color:var(--sky2);font-size:10px;font-weight:600">#${esc(t)}</span>`).join('')}</div>
      <div class="je-preview">${esc(j.body||'')}</div>
    </div>`).join('')
    :`<div class="empty-st"><i class="ti ti-notebook"></i>No entries yet.</div>`;
}

// ===== FINANCE =====
const EXP_C={food:'#16a34a',transport:'#38bdf8',shopping:'#d97706',bills:'#dc2626',health:'#0d9488',other:'#7c3aed'};
function setBudget(){const v=parseFloat(document.getElementById('budget-inp').value);if(!v)return;budget=v;save('budget',budget);renderFinance();toast('Budget set ✓');}
function addExp(){
  const name=document.getElementById('e-name').value.trim(),amt=parseFloat(document.getElementById('e-amt').value);
  if(!name||!amt){toast('Fill description and amount');return;}
  expenses.unshift({id:uid(),name,amt,cat:document.getElementById('e-cat').value,date:new Date().toISOString()});
  save('expenses',expenses);document.getElementById('e-name').value='';document.getElementById('e-amt').value='';
  renderFinance();renderDashboard();toast('Expense added ✓');
}
function addExpModal(){
  const name=document.getElementById('m-e-name').value.trim(),amt=parseFloat(document.getElementById('m-e-amt').value);
  if(!name||!amt){toast('Fill all fields');return;}
  expenses.unshift({id:uid(),name,amt,cat:document.getElementById('m-e-cat').value,date:new Date().toISOString()});
  save('expenses',expenses);document.getElementById('m-e-name').value='';document.getElementById('m-e-amt').value='';
  closeModal('exp-modal');renderFinance();renderDashboard();toast('Expense added ✓');
}
function delExp(id){expenses=expenses.filter(x=>x.id!==id);save('expenses',expenses);renderFinance();renderDashboard();}
function renderFinance(){
  const mo=new Date().toISOString().slice(0,7);
  const mExp=expenses.filter(e=>e.date.slice(0,7)===mo);
  const spent=mExp.reduce((s,e)=>s+e.amt,0),rem=Math.max(0,budget-spent);
  const todaySpent=expenses.filter(e=>e.date.slice(0,10)===todayStr()).reduce((s,e)=>s+e.amt,0);
  document.getElementById('fin-budget').textContent=fmtAmt(budget);
  document.getElementById('fin-spent').textContent=fmtAmt(spent);
  document.getElementById('fin-rem').textContent=fmtAmt(rem);
  document.getElementById('fin-today').textContent=fmtAmt(todaySpent);
  document.getElementById('kpi-budget').textContent=fmtAmt(todaySpent);
  const el=document.getElementById('exp-list');if(!el)return;
  el.innerHTML=expenses.length?expenses.slice(0,40).map(e=>{
    const bg=EXP_C[e.cat]||'#94a3b8';
    return `<div class="exp-row">
      <span class="exp-name">${esc(e.name)}</span>
      <span class="exp-cat-b" style="background:${bg}22;color:${bg}">${e.cat}</span>
      <span class="exp-date">${fmtDate(e.date)}</span>
      <span class="exp-amt">-${fmtAmt(e.amt)}</span>
      <button class="del-exp" onclick="delExp(${e.id})"><i class="ti ti-trash"></i></button>
    </div>`;}).join('')
    :`<div class="empty-st"><i class="ti ti-wallet"></i>No expenses yet.</div>`;
}

// ===== HEALTH =====
function renderHealth(){
  const el=document.getElementById('water-cups');if(el){
    el.innerHTML=Array.from({length:8},(_,i)=>`<div class="cup${i<health.water?' filled':''}" onclick="setWater(${i+1})">💧</div>`).join('');
  }
  const wl=document.getElementById('water-lbl');if(wl)wl.textContent=`${health.water} / 8 glasses`;
  const sv=document.getElementById('steps-val');if(sv)sv.textContent=health.steps.toLocaleString('en-IN');
  const sr=document.getElementById('steps-ring');if(sr){const p=Math.min(1,health.steps/10000);sr.setAttribute('stroke-dashoffset',(289*(1-p)).toFixed(1));}
  const sh=document.getElementById('sleep-hist');if(sh)sh.innerHTML=(health.sleep||[]).slice(-5).reverse().map(s=>`<div class="sl-item"><span>${fmtDate(s.date)}</span><span>${s.bed}→${s.wake}</span><span style="font-weight:700;color:#38bdf8">${s.hours}h</span></div>`).join('');
  const wl2=document.getElementById('workout-list');if(wl2)wl2.innerHTML=(health.workouts||[]).slice(-5).reverse().map(w=>`<div class="wk-item"><span class="wk-name">💪 ${esc(w.name)}</span><span class="wk-dur">${w.duration} min</span></div>`).join('');
}
function setWater(n){health.water=n;save('health',health);renderHealth();toast(`${n} glasses logged 💧`);}
function logSteps(){const v=parseInt(document.getElementById('steps-inp').value)||0;health.steps=v;save('health',health);renderHealth();toast('Steps logged ✓');}
function logSleep(){
  const bed=document.getElementById('sl-bed').value,wake=document.getElementById('sl-wake').value;
  const bH=+bed.split(':')[0],bM=+bed.split(':')[1],wH=+wake.split(':')[0],wM=+wake.split(':')[1];
  let mins=(wH*60+wM)-(bH*60+bM);if(mins<0)mins+=1440;
  const hours=(mins/60).toFixed(1);
  if(!health.sleep)health.sleep=[];
  health.sleep.push({date:todayStr(),bed,wake,hours});save('health',health);
  const sr=document.getElementById('sleep-result');if(sr)sr.textContent=`${hours} hours sleep`;
  renderHealth();toast('Sleep logged ✓');
}
function logWorkout(){
  const name=document.getElementById('wk-name').value.trim(),dur=parseInt(document.getElementById('wk-dur').value)||0;
  if(!name){toast('Enter workout name');return;}
  if(!health.workouts)health.workouts=[];
  health.workouts.push({name,duration:dur,date:todayStr()});save('health',health);
  document.getElementById('wk-name').value='';document.getElementById('wk-dur').value='';
  renderHealth();toast('Workout logged 💪');
}

// ===== NOTES =====
function addNote(){
  notes.unshift({id:uid(),title:'',body:'',date:new Date().toISOString()});
  save('notes',notes);renderNotes();
}
function updateNote(id,field,val){const n=notes.find(x=>x.id===id);if(n){n[field]=val;save('notes',notes);}}
function delNote(id){notes=notes.filter(x=>x.id!==id);save('notes',notes);renderNotes();toast('Note deleted');}
function renderNotes(){
  const el=document.getElementById('notes-grid');if(!el)return;
  el.innerHTML=notes.length?notes.map(n=>`
    <div class="note-card">
      <button class="note-del" onclick="delNote(${n.id})"><i class="ti ti-trash"></i></button>
      <input class="note-title-inp" value="${esc(n.title)}" placeholder="Title…" oninput="updateNote(${n.id},'title',this.value)" onclick="event.stopPropagation()"/>
      <textarea class="note-body-inp" placeholder="Write here…" oninput="updateNote(${n.id},'body',this.value)" onclick="event.stopPropagation()">${esc(n.body)}</textarea>
      <div class="note-date">${fmtDate(n.date)}</div>
    </div>`).join('')
    :`<div class="empty-st"><i class="ti ti-notes"></i>No notes yet. Click "+ New note".</div>`;
}

// ===== ANALYTICS =====
function renderAnalytics(){
  // Cat bars
  const cats={};tasks.forEach(t=>{cats[t.cat]=cats[t.cat]||{total:0,done:0};cats[t.cat].total++;if(t.done)cats[t.cat].done++;});
  bars('ana-cat',Object.entries(cats).map(([k,v])=>({label:CAT_L[k]||k,val:v.done,total:v.total,color:CAT_C[k]||'#60a5fa'})));
  // Pri bars
  const pris={high:{label:'High',total:0,done:0},med:{label:'Medium',total:0,done:0},low:{label:'Low',total:0,done:0}};
  tasks.forEach(t=>{if(pris[t.pri]){pris[t.pri].total++;if(t.done)pris[t.pri].done++;}});
  bars('ana-pri',Object.entries(pris).map(([k,v])=>({label:v.label,val:v.done,total:v.total,color:k==='high'?'#dc2626':k==='med'?'#d97706':'#16a34a'})));
  // Habits
  const hel=document.getElementById('ana-hab');
  if(hel)hel.innerHTML=habits.length?habits.map(h=>{const p=h.target?Math.round(h.weekLog.length/h.target*100):0;return `<div class="ana-bar-row"><span class="ana-lbl">${h.icon} ${esc(h.name)}</span><div class="ana-track"><div class="ana-fill" style="width:${p}%;background:linear-gradient(90deg,#38bdf8,#818cf8)"></div></div><span class="ana-val">${h.weekLog.length}/${h.target}</span></div>`}).join(''):`<div class="empty-st" style="padding:12px">No habits.</div>`;
  // Finance
  const finCats={};expenses.forEach(e=>{finCats[e.cat]=(finCats[e.cat]||0)+e.amt;});
  const finMax=Math.max(...Object.values(finCats),1);
  const fel=document.getElementById('ana-fin');
  if(fel)fel.innerHTML=Object.keys(finCats).length?Object.entries(finCats).map(([cat,amt])=>`<div class="ana-bar-row"><span class="ana-lbl">${cat}</span><div class="ana-track"><div class="ana-fill" style="width:${Math.round(amt/finMax*100)}%;background:${EXP_C[cat]||'#818cf8'}"></div></div><span class="ana-val">${fmtAmt(amt)}</span></div>`).join(''):`<div class="empty-st" style="padding:12px">No expenses.</div>`;
  // Life score
  const tt=todayTasks(),done=tt.filter(t=>t.done).length;
  const taskScore=tt.length?Math.round(done/tt.length*100):0;
  const habitScore=habits.length?Math.round(habits.filter(h=>h.doneToday).length/habits.length*100):0;
  const goalScore=goals.length?Math.round(goals.reduce((s,g)=>s+g.progress,0)/goals.length):0;
  const mo=new Date().toISOString().slice(0,7),spent=expenses.filter(e=>e.date.slice(0,7)===mo).reduce((s,e)=>s+e.amt,0);
  const finScore=budget?Math.round(Math.max(0,(1-spent/budget))*100):50;
  const wellScore=Math.round((health.water/8*50)+(Math.min(health.steps,10000)/10000*50));
  const overall=Math.round((taskScore+habitScore+goalScore+finScore+wellScore)/5);
  const lsg=document.getElementById('life-score');
  if(lsg)lsg.innerHTML=[{l:'Overall',s:overall},{l:'Productivity',s:taskScore},{l:'Habits',s:habitScore},{l:'Goals',s:goalScore},{l:'Finance',s:finScore},{l:'Wellness',s:wellScore}]
    .map(x=>`<div class="ls-card"><div class="ls-score">${x.s}</div><div class="ls-lbl">${x.l}</div></div>`).join('');
}
function bars(elId,items){
  const el=document.getElementById(elId);if(!el)return;
  const max=Math.max(...items.map(i=>i.total),1);
  el.innerHTML=items.map(i=>`<div class="ana-bar-row"><span class="ana-lbl">${i.label}</span><div class="ana-track"><div class="ana-fill" style="width:${Math.round(i.val/max*100)}%;background:${i.color}"></div></div><span class="ana-val">${i.val}/${i.total}</span></div>`).join('');
}

// ===== DASHBOARD =====
function renderDashboard(){
  const tt=todayTasks(),done=tt.filter(t=>t.done).length;
  document.getElementById('kpi-tasks').textContent=tt.length;
  document.getElementById('kpi-tasks-sub').textContent=`${done} done`;
  const th=habits.length,dh=habits.filter(h=>h.doneToday).length;
  document.getElementById('kpi-habits').textContent=th?Math.round(dh/th*100)+'%':'—';
  document.getElementById('kpi-habits-sub').textContent=`${dh}/${th} habits`;
  document.getElementById('kpi-goals').textContent=goals.length;
  document.getElementById('kpi-goals-sub').textContent=goals.filter(g=>g.progress<100).length+' in progress';

  // Tasks
  renderList('dash-task-list',tt.slice(0,5));

  // Week mini
  const dates=getWeekDates(0),todayS=todayStr();
  const wm=document.getElementById('dash-week-mini');
  if(wm){
    const daily=fixedTasks.filter(t=>t.type==='daily');
    wm.innerHTML=`<table style="width:100%;border-collapse:collapse;font-size:11px">
      <tr>${DAY_SHORT.map((d,i)=>{const ds=dates[i].toISOString().slice(0,10);return `<th style="padding:4px 6px;text-align:center;color:${ds===todayS?'#38bdf8':'#7dd3fc'};font-weight:700">${d}</th>`}).join('')}</tr>
      <tr>${dates.map((d,i)=>{
        const ds=d.toISOString().slice(0,10);
        const done=daily.filter(ft=>gridChecks[`${ft.id}_${ds}`]).length;
        const pct=daily.length?Math.round(done/daily.length*100):0;
        const isToday=ds===todayS;
        return `<td style="padding:6px 4px;text-align:center"><div style="font-size:14px;font-weight:700;color:${isToday?'#38bdf8':'#94a3b8'}">${done}</div><div style="font-size:10px;color:#94a3b8">${pct}%</div></td>`;
      }).join('')}</tr>
    </table>`;
  }

  // Habits
  const dh2=document.getElementById('dash-habits');
  if(dh2)dh2.innerHTML=habits.slice(0,4).map(h=>`
    <div class="task-item" onclick="toggleHabit(${h.id})" style="cursor:pointer">
      <div class="chk${h.doneToday?' done':''}"><i class="ti ti-check" ${h.doneToday?'':'style="display:none"'}></i></div>
      <div class="t-body"><div class="t-name">${h.icon} ${esc(h.name)}</div><div class="t-meta"><span style="font-size:11px;color:#94a3b8">🔥 ${h.streak} day streak</span></div></div>
    </div>`).join('')||`<div class="empty-st"><i class="ti ti-repeat"></i>No habits.</div>`;

  // Goals
  const dg=document.getElementById('dash-goals');
  if(dg)dg.innerHTML=goals.slice(0,4).map(g=>`
    <div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600;color:var(--text);margin-bottom:4px"><span>${esc(g.title)}</span><span style="color:#94a3b8">${g.progress}%</span></div>
      <div class="goal-prog-track"><div class="goal-prog-fill" style="width:${g.progress}%"></div></div>
    </div>`).join('')||`<div class="empty-st"><i class="ti ti-target"></i>No goals.</div>`;

  // Finance
  const df=document.getElementById('dash-finance');
  if(df)df.innerHTML=expenses.slice(0,4).map(e=>`
    <div class="exp-row"><span class="exp-name">${esc(e.name)}</span><span class="exp-amt">-${fmtAmt(e.amt)}</span></div>`).join('')
    ||`<div class="empty-st"><i class="ti ti-wallet"></i>No expenses.</div>`;

  updateSbRing();
}

// ===== SIDEBAR RING =====
function updateSbRing(){
  const tt=todayTasks(),done=tt.filter(t=>t.done).length;
  // Also count daily grid tasks for today
  const daily=fixedTasks.filter(t=>t.type==='daily');
  const gridDone=daily.filter(ft=>gridChecks[`${ft.id}_${todayStr()}`]).length;
  const total=tt.length+daily.length,allDone=done+gridDone;
  const pct=total?Math.round(allDone/total*100):0;
  document.getElementById('sb-ring-pct').textContent=pct+'%';
  document.getElementById('sb-ring').setAttribute('stroke-dashoffset',(188.5*(1-pct/100)).toFixed(1));
}

// ===== EXPORT =====
function exportData(){
  const data={tasks,fixedTasks,gridChecks,habits,goals,journal,expenses,health,notes,budget,exported:new Date().toISOString()};
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  a.download=`worklife-planner-${todayStr()}.json`;a.click();toast('Data exported ✓');
}

// ===== INIT =====
function initMeta(){
  const h=new Date().getHours();
  const g=h<12?'Good morning ☀️':h<17?'Good afternoon 🌤️':'Good evening 🌙';
  
  
  const ds=new Date().toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  
  const tdl=document.getElementById('today-date-lbl');if(tdl)tdl.textContent=ds;
  const jd=document.getElementById('j-date-lbl');if(jd)jd.textContent=ds;
}
function startTimer(){
  const s=Date.now();
  setInterval(()=>{
    const sec=Math.floor((Date.now()-s)/1000),hh=Math.floor(sec/3600),mm=Math.floor((sec%3600)/60),ss=sec%60;
    const el=document.getElementById('sb-timer');
    if(el)el.textContent=[hh,mm,ss].map(x=>String(x).padStart(2,'0')).join(':');
  },1000);
}
function midnightReset(){
  const now=new Date(),mid=new Date(now);mid.setHours(24,0,0,0);
  setTimeout(()=>{
    tasks.forEach(t=>{if(t.date===todayStr())t.done=false;});
    habits.forEach(h=>h.doneToday=false);
    health.water=0;health.steps=0;
    save('tasks',tasks);save('habits',habits);save('health',health);
    renderDashboard();renderToday();renderHabits();renderHealth();renderWeeklyGrid();
    midnightReset();
  },mid-now);
}

initMeta();
startTimer();
midnightReset();
renderDashboard();
renderToday();

// ===== EDIT FIXED TASK =====
function openEditFixedTask(id){
  const row=fixedTasks.find(x=>x.id===id);if(!row)return;
  document.getElementById('ef-id').value=id;
  document.getElementById('ef-name').value=row.name;
  document.getElementById('ef-cat').value=row.cat||'work';
  document.getElementById('ef-note').value=row.note||'';
  const typeEl=document.getElementById('ef-type');
  typeEl.value=row.type||'daily';
  const picker=document.getElementById('ef-day-picker');
  picker.style.display=row.type==='weekly'?'block':'none';
  document.querySelectorAll('#ef-day-checks input').forEach(cb=>{
    cb.checked=(row.days||[]).includes(parseInt(cb.value));
  });
  openModal('edit-fixed-modal');
}

function saveEditFixedTask(){
  const id=parseInt(document.getElementById('ef-id').value);
  const name=document.getElementById('ef-name').value.trim();
  if(!name){toast('Enter task name');return;}
  const type=document.getElementById('ef-type').value;
  const days=type==='weekly'
    ?Array.from(document.querySelectorAll('#ef-day-checks input:checked')).map(i=>parseInt(i.value))
    :[];
  const row=fixedTasks.find(x=>x.id===id);
  if(!row){toast('Task not found');return;}
  row.name=name;
  row.cat=document.getElementById('ef-cat').value;
  row.type=type;
  row.days=days;
  row.note=document.getElementById('ef-note').value.trim();
  save('fixedTasks',fixedTasks);
  closeModal('edit-fixed-modal');
  renderWeeklyGrid();
  renderDashboard();
  toast('Task updated ✓');
}

// ===== PREMIUM UI ENHANCEMENTS =====
document.addEventListener('click', function(e) {
  const btn = e.target.closest('.btn-primary, .btn-outline');
  if (!btn) return;
  const r = document.createElement('span');
  r.className = 'ripple-effect';
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  r.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px;position:absolute;border-radius:50%;background:rgba(255,255,255,0.25);transform:scale(0);animation:ripple 0.55s linear;pointer-events:none`;
  btn.appendChild(r);
  setTimeout(() => r.remove(), 600);
});

// Count-up KPI animation
function animateCountUp(el, target, duration) {
  if (!el) return;
  duration = duration || 700;
  const isPercent = String(target).includes('%');
  const isDash = target === '—';
  if (isDash) return;
  const num = parseInt(target) || 0;
  const start = performance.now();
  function step(now) {
    const p = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(num * ease) + (isPercent ? '%' : '');
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = target;
  }
  requestAnimationFrame(step);
}

// Patch renderDashboard for count-up + ring pulse
const __rd = renderDashboard;
window.renderDashboard = function() {
  __rd();
  setTimeout(function() {
    ['kpi-tasks','kpi-habits','kpi-goals'].forEach(function(id) {
      const el = document.getElementById(id);
      if (el) animateCountUp(el, el.textContent);
    });
    const ring = document.querySelector('.sb-ring-wrap svg');
    if (ring) {
      const pct = parseInt(document.getElementById('sb-ring-pct').textContent) || 0;
      if (pct >= 50) ring.classList.add('glow-ring');
      else ring.classList.remove('glow-ring');
    }
  }, 60);
};

// ===== LIGHT / DARK THEME TOGGLE =====
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('wlp-theme', theme);
  // swap visible icon
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) btn.setAttribute('data-theme', theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

// On load — read saved preference, default dark
(function() {
  const saved = localStorage.getItem('wlp-theme') || 'dark';
  applyTheme(saved);
})();

// ===== PREMIUM CARD CLICK EFFECTS =====
document.addEventListener('click', function(e) {
  const card = e.target.closest(
    '.kpi, .card, .fkpi, .habit-card, .goal-card, .day-summary, .je, .note-card, .ls-card'
  );
  if (!card) return;

  // Make sure card has position:relative for ripple to work
  const pos = getComputedStyle(card).position;
  if (pos === 'static') card.style.position = 'relative';
  card.style.overflow = 'hidden';

  // Ripple at click position
  const ripple = document.createElement('span');
  ripple.className = 'card-ripple-effect';
  const rect = card.getBoundingClientRect();
  ripple.style.left = (e.clientX - rect.left) + 'px';
  ripple.style.top  = (e.clientY - rect.top)  + 'px';
  card.appendChild(ripple);
  setTimeout(() => ripple.remove(), 700);

  // Glow pulse
  card.classList.remove('card-clicked');
  void card.offsetWidth; // reflow to restart animation
  card.classList.add('card-clicked');
  setTimeout(() => card.classList.remove('card-clicked'), 600);
});


// ===== MOBILE SIDEBAR OPEN / CLOSE =====
function openMobileSidebar(){
  document.getElementById('sidebar').classList.add('open');
  const ov=document.getElementById('mob-overlay');
  if(ov){ov.classList.add('visible');}
  document.body.style.overflow='hidden'; // prevent background scroll
}
function closeMobileSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  const ov=document.getElementById('mob-overlay');
  if(ov){ov.classList.remove('visible');}
  document.body.style.overflow='';
}
// Close sidebar when a nav link is clicked on mobile
document.querySelectorAll('.sb-link, .sb-child-link').forEach(function(el){
  el.addEventListener('click',function(){
    if(window.innerWidth<=900) closeMobileSidebar();
  });
});
// Close on Escape key
document.addEventListener('keydown',function(e){
  if(e.key==='Escape') closeMobileSidebar();
});

// ===== PROFILE PICTURE FEATURE =====
function triggerProfileUpload(){
  document.getElementById('profile-upload-input').click();
}
function handleProfileUpload(e){
  const file=e.target.files[0];
  if(!file)return;
  const allowed=['image/png','image/jpeg'];
  if(!allowed.includes(file.type)){toast('Only PNG, JPG, JPEG allowed ✕');e.target.value='';return;}
  if(file.size>2*1024*1024){toast('Image too large! Max 2MB ✕');e.target.value='';return;}
  const reader=new FileReader();
  reader.onload=function(ev){
    const b64=ev.target.result;
    localStorage.setItem('profilePic',b64);
    applyProfilePic(b64);
    toast('Profile picture updated ✓');
  };
  reader.readAsDataURL(file);
  e.target.value='';
}
function applyProfilePic(src){
  const img=document.getElementById('sb-profile-img');
  const ini=document.getElementById('sb-profile-initials');
  if(!img||!ini)return;
  if(src){
    // Add cache-buster to force browser to reload image URL
    const finalSrc = src.startsWith('http') ? src+'?t='+Date.now() : src;
    img.onload = function(){ img.style.display='block'; ini.style.display='none'; };
    img.onerror = function(){ img.style.display='none'; ini.style.display='flex'; };
    img.src = finalSrc;
    img.style.display='block';
    ini.style.display='none';
  } else {
    img.style.display='none';
    ini.style.display='flex';
  }
}
function getInitials(name){
  const parts=name.trim().split(/\s+/);
  return parts.length>1?(parts[0][0]+parts[parts.length-1][0]).toUpperCase():name.slice(0,2).toUpperCase();
}
function updateSbGreeting(){
  const h=new Date().getHours();
  const time=h<12?'Good morning ☀️':h<17?'Good afternoon 🌤️':'Good evening 🌙';
  const name=localStorage.getItem('profileName')||'User';
  const greetEl=document.getElementById('sb-greeting');
  const greetNameEl=document.getElementById('sb-greeting-name');
  if(greetEl){
    // Set the plain text part (time + comma)
    greetEl.childNodes[0].textContent=time+', ';
  }
  if(greetNameEl)greetNameEl.textContent=name;
  const mainGreet=document.getElementById('greeting');
  if(mainGreet)mainGreet.textContent=`${time}, ${name}`;
}
function editProfileName(){
  const panel=document.getElementById('sb-name-edit-panel');
  const btn=document.getElementById('sb-edit-name-btn');
  const inp=document.getElementById('sb-profile-name-input');
  if(!panel)return;
  const currentName=localStorage.getItem('profileName')||'User';
  inp.value=currentName;
  panel.style.display='flex';
  btn.style.display='none';
  inp.focus();inp.select();
}
function saveProfileName(){
  const inp=document.getElementById('sb-profile-name-input');
  const panel=document.getElementById('sb-name-edit-panel');
  const btn=document.getElementById('sb-edit-name-btn');
  const val=inp.value.trim();
  if(!val){toast('Please enter a name');inp.focus();return;}
  localStorage.setItem('profileName',val);
  // Update initials
  const iniEl=document.getElementById('sb-profile-initials');
  if(iniEl)iniEl.textContent=getInitials(val);
  panel.style.display='none';
  btn.style.display='inline-flex';
  updateSbGreeting();
  toast('Name saved ✓');
}
function cancelEditName(){
  const panel=document.getElementById('sb-name-edit-panel');
  const btn=document.getElementById('sb-edit-name-btn');
  panel.style.display='none';
  btn.style.display='inline-flex';
}
function initProfile(){
  const savedName=localStorage.getItem('profileName')||'User';
  // Set initials
  const iniEl=document.getElementById('sb-profile-initials');
  if(iniEl)iniEl.textContent=getInitials(savedName);
  // Load saved picture
  const savedPic=localStorage.getItem('profilePic');
  if(savedPic)applyProfilePic(savedPic);
  // Update greeting
  updateSbGreeting();
  // Keyboard shortcut: Enter to save in name input
  const inp=document.getElementById('sb-profile-name-input');
  if(inp){
    inp.addEventListener('keydown',e=>{
      if(e.key==='Enter')saveProfileName();
      if(e.key==='Escape')cancelEditName();
    });
  }
}
document.addEventListener('DOMContentLoaded', initProfile);
if(document.readyState!=='loading') initProfile();

// ===== TEAMMATE / MEMBER PLANNER =====
let teammates = load('teammates', []); // [{id,name,role,color}]
let memberFixedTasks = load('memberFixedTasks', {}); // {memberId: [{...}]}
let memberGridChecks = load('memberGridChecks', {}); // {memberId: {taskId_date: bool}}
let activeMemberId = 'main'; // 'main' or teammate id
let tmSelectedColor = '#0ea5e9';

const MEMBER_COLORS = ['#0ea5e9','#818cf8','#10b981','#f59e0b','#f43f5e'];

function getInitialsFromName(name){
  const p=name.trim().split(/\s+/);
  return p.length>1?(p[0][0]+p[p.length-1][0]).toUpperCase():name.slice(0,2).toUpperCase();
}

// --- Sidebar group toggle ---
function toggleWeeklyGroup(e){
  e.preventDefault();
  const children=document.getElementById('sb-weekly-children');
  const toggle=document.querySelector('.sb-group-toggle');
  const chevron=document.getElementById('sb-weekly-chevron');
  const isOpen=children.classList.contains('open');
  if(isOpen){
    children.classList.remove('open');
    toggle.classList.remove('group-open');
  } else {
    children.classList.add('open');
    toggle.classList.add('group-open');
  }
}

// --- Render teammate sidebar links ---
function renderTeammateLinks(){
  const container=document.getElementById('sb-teammate-links');
  if(!container)return;
  // Update main user link name
  const mainName=localStorage.getItem('profileName')||'My Planner';
  const mainLink=document.getElementById('sb-main-child-name');
  if(mainLink)mainLink.textContent=mainName;

  container.innerHTML=teammates.map(tm=>`
    <a class="sb-child-link${activeMemberId===tm.id?' active-child':''}" id="sb-child-${tm.id}" onclick="switchMemberView('${tm.id}',event)">
      <span class="sb-child-dot" style="background:${tm.color};box-shadow:0 0 6px ${tm.color}88"></span>
      <span class="sb-child-name">${esc(tm.name)}</span>
      <button class="sb-child-remove" onclick="removeTeammate('${tm.id}',event)" title="Remove teammate"><i class="ti ti-x"></i></button>
    </a>
  `).join('');

  // Show/hide add button (max 5 teammates)
  const addBtn=document.getElementById('sb-add-teammate-btn');
  if(addBtn)addBtn.style.display=teammates.length>=5?'none':'flex';
}

// --- Switch active member view ---
function switchMemberView(memberId, e){
  if(e)e.preventDefault();
  activeMemberId=memberId;

  // Update active-child highlight
  document.querySelectorAll('.sb-child-link').forEach(l=>l.classList.remove('active-child'));
  const target = memberId==='main'
    ? document.getElementById('sb-main-user-link')
    : document.getElementById('sb-child-'+memberId);
  if(target)target.classList.add('active-child');

  // Update member context bar
  updateMemberContextBar();

  // Switch to weekly view and re-render
  switchView('weekly');
}

function updateMemberContextBar(){
  const avEl=document.getElementById('mcb-avatar');
  const labelEl=document.getElementById('mcb-label');
  const subEl=document.getElementById('mcb-sub');
  const actionsEl=document.getElementById('mcb-actions');

  if(activeMemberId==='main'){
    const name=localStorage.getItem('profileName')||'My Planner';
    if(avEl){
      avEl.textContent=getInitialsFromName(name);
      avEl.style.background='';
      avEl.className='mcb-avatar';
      // Try to show profile pic
      const pic=localStorage.getItem('profilePic');
      if(pic){
        avEl.innerHTML=`<img src="${pic}" style="width:44px;height:44px;object-fit:cover;border-radius:50%"/>`;
      }
    }
    if(labelEl)labelEl.textContent=name+"'s Planner";
    if(subEl)subEl.textContent='Your personal weekly & daily task grid';
    if(actionsEl)actionsEl.innerHTML='';
  } else {
    const tm=teammates.find(t=>t.id===activeMemberId);
    if(!tm)return;
    if(avEl){
      avEl.innerHTML=getInitialsFromName(tm.name);
      avEl.style.cssText=`background:${tm.color};box-shadow:0 4px 14px ${tm.color}55;width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#fff;flex-shrink:0;`;
    }
    if(labelEl)labelEl.textContent=tm.name+"'s Planner";
    if(subEl)subEl.textContent=(tm.role?tm.role+' · ':'')+'Weekly & daily task grid';
    if(actionsEl)actionsEl.innerHTML=`
      <button class="btn-outline" style="font-size:11px;padding:5px 12px" onclick="openModal('fixed-task-modal')">
        <i class="ti ti-plus"></i> Add task
      </button>`;
  }
}

// --- Get active member's data ---
function getActiveTasks(){
  if(activeMemberId==='main') return fixedTasks;
  if(!memberFixedTasks[activeMemberId]) memberFixedTasks[activeMemberId]=[];
  return memberFixedTasks[activeMemberId];
}
function getActiveChecks(){
  if(activeMemberId==='main') return gridChecks;
  if(!memberGridChecks[activeMemberId]) memberGridChecks[activeMemberId]={};
  return memberGridChecks[activeMemberId];
}
function saveActiveData(){
  if(activeMemberId==='main'){
    save('fixedTasks',fixedTasks);
  } else {
    save('memberFixedTasks',memberFixedTasks);
  }
}
function saveActiveChecks(){
  if(activeMemberId==='main'){
    save('gridChecks',gridChecks);
  } else {
    save('memberGridChecks',memberGridChecks);
  }
}

// --- Add teammate ---
function openAddTeammate(){
  if(teammates.length>=5){toast('Maximum 5 teammates allowed');return;}
  tmSelectedColor='#0ea5e9';
  document.querySelectorAll('.tm-color-btn').forEach(b=>{
    b.classList.toggle('selected',b.dataset.color==='#0ea5e9');
  });
  document.getElementById('tm-name').value='';
  document.getElementById('tm-role').value='';
  openModal('add-teammate-modal');
}
function selectTmColor(color, btn){
  tmSelectedColor=color;
  document.querySelectorAll('.tm-color-btn').forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
}
function addTeammate(){
  const name=document.getElementById('tm-name').value.trim();
  if(!name){toast('Enter teammate name');return;}
  if(teammates.length>=5){toast('Maximum 5 teammates allowed');return;}
  const tm={id:'tm_'+Date.now(),name,role:document.getElementById('tm-role').value.trim(),color:tmSelectedColor};
  teammates.push(tm);
  memberFixedTasks[tm.id]=[];
  memberGridChecks[tm.id]={};
  save('teammates',teammates);
  save('memberFixedTasks',memberFixedTasks);
  save('memberGridChecks',memberGridChecks);
  closeModal('add-teammate-modal');
  renderTeammateLinks();
  toast(`${name} added as teammate ✓`);
}
function removeTeammate(id, e){
  if(e){e.preventDefault();e.stopPropagation();}
  const tm=teammates.find(t=>t.id===id);
  if(!tm)return;
  if(!confirm(`Remove ${tm.name} from teammates? Their tasks will be deleted.`))return;
  teammates=teammates.filter(t=>t.id!==id);
  delete memberFixedTasks[id];
  delete memberGridChecks[id];
  save('teammates',teammates);
  save('memberFixedTasks',memberFixedTasks);
  save('memberGridChecks',memberGridChecks);
  if(activeMemberId===id){ activeMemberId='main'; }
  renderTeammateLinks();
  if(document.getElementById('view-weekly').classList.contains('active')){
    updateMemberContextBar();
    renderWeeklyGrid();
  }
  toast(`${tm.name} removed`);
}

// --- Patch renderWeeklyGrid to use active member data ---
const _origRenderWeeklyGrid = renderWeeklyGrid;
renderWeeklyGrid = function(){
  const dates=getWeekDates(weekOffset);
  const todayS=todayStr();
  const wl=document.getElementById('week-nav-label');
  if(wl)wl.textContent=`📅 Week of ${dates[0].toLocaleDateString('en-IN',{day:'numeric',month:'long'})} – ${dates[6].toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}`;
  const tasks=getActiveTasks();
  const checks=getActiveChecks();
  buildGridTableForMember('daily-thead','daily-tbody', tasks.filter(t=>t.type==='daily'), dates, todayS, true, checks);
  buildGridTableForMember('weekly-thead2','weekly-tbody', tasks.filter(t=>t.type==='weekly'), dates, todayS, false, checks);
  renderWeekSummary(dates, todayS);
  updateMemberContextBar();
};

function buildGridTableForMember(theadId, tbodyId, rows, dates, todayS, isDaily, checks){
  const thead=document.getElementById(theadId);
  const tbody=document.getElementById(tbodyId);
  if(!thead||!tbody)return;
  const DAY_SHORT=['MON','TUE','WED','THU','FRI','SAT','SUN'];
  thead.innerHTML=`<tr>
    <th class="task-col"><i class="ti ti-list" style="margin-right:6px;color:rgba(255,255,255,.6)"></i>Task</th>
    ${dates.map((d,i)=>{
      const ds=d.toISOString().slice(0,10);
      const isToday=ds===todayS;
      return `<th class="${isToday?'today-col':''}">${DAY_SHORT[i]}<br><span style="font-size:9px;font-weight:400;opacity:.7">${d.getDate()}/${d.getMonth()+1}</span></th>`;
    }).join('')}
    <th style="width:40px"></th>
  </tr>`;
  if(!rows.length){
    tbody.innerHTML=`<tr><td colspan="9" style="padding:28px;text-align:center;color:#94a3b8;font-size:13px"><i class="ti ti-plus-square" style="margin-right:6px"></i>No tasks yet — click "Add task row" to add one.</td></tr>`;
    return;
  }
  tbody.innerHTML=rows.map(row=>{
    const cells=dates.map((d,i)=>{
      const ds=d.toISOString().slice(0,10);
      const isToday=ds===todayS;
      const show=isDaily||row.days.includes(i);
      const key=`${row.id}_${ds}`;
      const checked=checks[key]||false;
      if(!show) return `<td class="check-cell${isToday?' today-check':''}"><span class="grid-na-dash">—</span></td>`;
      return `<td class="check-cell${isToday?' today-check':''}" onclick="toggleGridMember(${row.id},'${ds}')">
        <div class="grid-chk${checked?' checked':''}" id="gc_${row.id}_${ds.replace(/-/g,'_')}">
          <i class="ti ti-check"></i>
        </div>
      </td>`;
    }).join('');
    const catCls='cat-badge-'+(row.cat||'work');
    return `<tr>
      <td class="task-name-cell">
        <span class="row-icon">📋</span>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">
            <div class="grid-task-name" style="font-size:13px;font-weight:700;line-height:1.3">${esc(row.name)}</div>
            <span class="${catCls}" style="font-size:10px;padding:2px 9px;border-radius:6px;font-weight:700;white-space:nowrap;flex-shrink:0">${row.cat}</span>
          </div>
          ${row.note?`<div class="row-note"><i class="ti ti-notes" style="font-size:10px;margin-right:3px"></i>${esc(row.note)}</div>`:''}
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0">
          <button class="row-edit" onclick="openEditFixedTask(${row.id})" title="Edit"><i class="ti ti-edit"></i></button>
          <button class="row-del" onclick="deleteMemberTask(${row.id})" title="Remove"><i class="ti ti-trash"></i></button>
        </div>
      </td>
      ${cells}
      <td></td>
    </tr>`;
  }).join('');
}

function toggleGridMember(taskId, dateStr){
  const checks=getActiveChecks();
  const key=`${taskId}_${dateStr}`;
  checks[key]=!checks[key];
  saveActiveChecks();
  const el=document.getElementById(`gc_${taskId}_${dateStr.replace(/-/g,'_')}`);
  if(el){
    if(checks[key])el.classList.add('checked');
    else el.classList.remove('checked');
  }
  renderWeekSummary(getWeekDates(weekOffset),todayStr());
  if(activeMemberId==='main')updateSbRing();
  toast(checks[key]?'Task checked ✓':'Task unchecked');
}

function deleteMemberTask(id){
  if(activeMemberId==='main'){
    fixedTasks=fixedTasks.filter(x=>x.id!==id);
    save('fixedTasks',fixedTasks);
  } else {
    if(!memberFixedTasks[activeMemberId]) return;
    memberFixedTasks[activeMemberId]=memberFixedTasks[activeMemberId].filter(x=>x.id!==id);
    save('memberFixedTasks',memberFixedTasks);
  }
  renderWeeklyGrid();
}

// Patch addFixedTask to save to active member
const _origAddFixedTask = typeof addFixedTask === 'function' ? addFixedTask : null;
function addFixedTask(){
  const name=document.getElementById('m-ft-name').value.trim();
  if(!name){toast('Enter task name');return;}
  const type=document.getElementById('m-ft-type').value;
  const days=type==='weekly'
    ?Array.from(document.querySelectorAll('#day-checks input:checked')).map(i=>parseInt(i.value))
    :[];
  const newTask={id:uid(),name,cat:document.getElementById('m-ft-cat').value,type,days};
  if(activeMemberId==='main'){
    fixedTasks.push(newTask);
    save('fixedTasks',fixedTasks);
  } else {
    if(!memberFixedTasks[activeMemberId]) memberFixedTasks[activeMemberId]=[];
    memberFixedTasks[activeMemberId].push(newTask);
    save('memberFixedTasks',memberFixedTasks);
  }
  closeModal('fixed-task-modal');
  document.getElementById('m-ft-name').value='';
  toast('Task added ✓');
  renderWeeklyGrid();
}

// Patch openEditFixedTask / saveEditFixedTask for members
const _origOpenEdit = openEditFixedTask;
openEditFixedTask = function(id){
  const tasks=getActiveTasks();
  const row=tasks.find(x=>x.id===id);
  if(!row)return;
  document.getElementById('ef-id').value=id;
  document.getElementById('ef-name').value=row.name;
  document.getElementById('ef-cat').value=row.cat||'work';
  document.getElementById('ef-note').value=row.note||'';
  const typeEl=document.getElementById('ef-type');
  typeEl.value=row.type||'daily';
  const picker=document.getElementById('ef-day-picker');
  picker.style.display=row.type==='weekly'?'block':'none';
  document.querySelectorAll('#ef-day-checks input').forEach(cb=>{
    cb.checked=(row.days||[]).includes(parseInt(cb.value));
  });
  openModal('edit-fixed-modal');
};

const _origSaveEdit = saveEditFixedTask;
saveEditFixedTask = function(){
  const id=parseInt(document.getElementById('ef-id').value);
  const name=document.getElementById('ef-name').value.trim();
  if(!name){toast('Enter task name');return;}
  const type=document.getElementById('ef-type').value;
  const days=type==='weekly'
    ?Array.from(document.querySelectorAll('#ef-day-checks input:checked')).map(i=>parseInt(i.value))
    :[];
  const tasks=getActiveTasks();
  const row=tasks.find(x=>x.id===id);
  if(!row){toast('Task not found');return;}
  row.name=name;
  row.cat=document.getElementById('ef-cat').value;
  row.type=type;
  row.days=days;
  row.note=document.getElementById('ef-note').value.trim();
  saveActiveData();
  closeModal('edit-fixed-modal');
  renderWeeklyGrid();
  toast('Task updated ✓');
};

// Init on load
document.addEventListener('DOMContentLoaded', function(){
  renderTeammateLinks();
  // Auto-open the weekly group if on weekly view
  const children=document.getElementById('sb-weekly-children');
  const toggle=document.querySelector('.sb-group-toggle');
  if(children){ children.classList.add('open'); }
  if(toggle){ toggle.classList.add('group-open'); }
});
if(document.readyState!=='loading'){
  renderTeammateLinks();
  const children=document.getElementById('sb-weekly-children');
  const toggle=document.querySelector('.sb-group-toggle');
  if(children) children.classList.add('open');
  if(toggle) toggle.classList.add('group-open');
}

// =============================================
//  NOTEBOOK — Premium Digital Planner
// =============================================

// --- State ---
let nbChapters = load('wlp-notebook', []).chapters || load('wlp-notebook', {chapters:[]}).chapters;
// Fix: ensure proper structure
(function(){
  const raw = load('wlp-notebook', null);
  if(raw && Array.isArray(raw.chapters)) nbChapters = raw.chapters;
  else nbChapters = [];
})();

let nbActiveId = null;
let nbSaveTimer = null;
let nbCurrentStyle = 'blank';

const NB_STICKER_COLORS = [
  {bg:'rgba(14,165,233,0.2)',color:'#38bdf8'},
  {bg:'rgba(129,140,248,0.2)',color:'#a5b4fc'},
  {bg:'rgba(16,185,129,0.2)',color:'#6ee7b7'},
  {bg:'rgba(245,158,11,0.2)',color:'#fcd34d'},
  {bg:'rgba(244,63,94,0.2)',color:'#fda4af'},
  {bg:'rgba(168,85,247,0.2)',color:'#d8b4fe'},
];

const NB_EMOJIS = {
  Smileys: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🥴','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤧','🥵','🥶','🥳','🤠','😎','🤓','🧐','😕','😟','🙁','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱'],
  Nature: ['🌸','🌺','🌻','🌹','🌷','🌿','🍀','🌱','🌲','🌳','🌴','🌵','🎋','🎍','🍃','🍂','🍁','🍄','🐚','🌾','💐','🌞','🌝','🌛','🌜','🌚','🌕','🌈','⛅','🌤️','🌥️','🌦️','🌧️','🌨️','🌩️','🌪️','🌫️','🌬️','🌊','🌀'],
  Food: ['🍕','🍔','🍟','🌭','🍿','🧂','🥓','🥚','🍳','🧇','🥞','🧈','🍞','🥐','🥖','🫓','🥨','🧀','🥗','🍜','🍝','🍛','🍲','🫕','🥘','🍤','🍣','🍱','🍙','🍚','🍘','🍥','🥟','🦪','🍦','🍧','🍨','🍩','🍪','🎂','🍰','🧁','🥧','🍫','🍬','🍭','🍮','🍯','☕','🧋','🍵','🥤'],
  Travel: ['✈️','🚀','🛸','🚁','🛶','⛵','🚢','🛳️','🚂','🚃','🚄','🚅','🚆','🚇','🚈','🚉','🚊','🚝','🚞','🚋','🚌','🚍','🚎','🏎️','🚐','🚑','🚒','🚓','🚔','🚕','🚖','🚗','🚘','🏔️','⛰️','🌋','🗻','🏕️','🏖️','🏜️','🏝️','🏞️','🏟️','🏛️','🗼','🗽','🗺️'],
  Objects: ['💡','🔦','🕯️','📱','💻','⌨️','🖥️','🖨️','🖱️','💾','💿','📀','📷','📸','📹','🎥','📡','☎️','📞','📟','📠','📺','📻','🧭','⏱️','⏰','⏲️','🕰️','⌚','📅','📆','📇','📉','📊','📈','📋','📁','📂','🗂️','📓','📔','📒','📕','📗','📘','📙','📚','📖','🔖','🏷️','💰','💳','📝','✏️','🖊️','🖋️','📌','📍','📎','🖇️','📐','📏','✂️','🔑','🗝️'],
  Symbols: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','✡️','🔯','🕎','☯️','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆒','🆓','🆕','🆖','🆗','🆙','🆚','🈶','🈯','🉐','🈹','🈚','🈲','🉑','🈸','🈴','🈳','㊗️','㊙️','🈺','🈵','▶️','⏭️','⏯️','◀️','⏮️','🔼','⏫','🔽','⏬','⏸️','⏹️','⏺️','🎦','🔅','🔆','📶','📳','📴','♀️','♂️','⚕️','♾️','♻️','⚜️','🔱','📛','🔰','⭕','✅','☑️','✔️','❎','🔲','🔳'],
};

const NB_COVER_EMOJIS = ['📓','📔','📒','📕','📗','📘','📙','📚','📖','📝','✏️','🖊️','🖋️','📌','📍','🗒️','📋','🗃️','🗂️','📁','📂','💡','🌟','⭐','✨','🎯','🏆','🎨','🎭','🎬','🎮','🎵','🎶','🌈','☀️','🌙','❤️','💙','💜','🧡','💚','🌸','🌺','🌻','🌹','🌿','🍀','🚀','🌊','🔥','💎','🦋','🦄','🌍','🌏','🏔️','🗺️'];

// --- Helpers ---
function nbSave() {
  save('wlp-notebook', { chapters: nbChapters });
}
function nbActiveChapter() {
  return nbChapters.find(c => c.id === nbActiveId) || null;
}
function nbFmtDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}
function nbTimeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return Math.floor(diff/60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff/3600000) + 'h ago';
  return Math.floor(diff/86400000) + 'd ago';
}
function nbWordCount(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

// --- Render chapter list ---
function nbRenderChapters() {
  const list = document.getElementById('nb-chapter-list');
  if (!list) return;
  if (!nbChapters.length) {
    list.innerHTML = '<div style="padding:20px 12px;text-align:center;font-size:12px;color:var(--text3)">No chapters yet</div>';
    return;
  }
  list.innerHTML = nbChapters.map(ch => `
    <div class="nb-chapter-card${ch.id===nbActiveId?' active':''}" onclick="nbOpenChapter('${ch.id}')">
      <div class="nb-chapter-top">
        <div class="nb-chapter-emoji-big">${ch.emoji||'📄'}</div>
        <div class="nb-chapter-info">
          <div class="nb-chapter-name">${esc(ch.title||'Untitled Chapter')}</div>
          <div class="nb-chapter-meta">
            <span>${nbWordCount(ch.content?.replace?.(/<[^>]+>/g,'')??'')} words · ${nbTimeAgo(ch.updatedAt)}</span>
          </div>
        </div>
        <div class="nb-chapter-color-dot" style="background:${ch.color||'var(--sky)'}"></div>
      </div>
      <button class="nb-chapter-del" onclick="nbDeleteChapter('${ch.id}',event)" title="Delete chapter">
        <i class="ti ti-trash"></i>
      </button>
    </div>
  `).join('');
}

// --- New chapter ---
function nbNewChapter() {
  const ch = {
    id: 'nb_' + uid(),
    title: '',
    emoji: '📄',
    content: '',
    font: 'default',
    pageStyle: 'blank',
    color: '#0ea5e9',
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    wordCount: 0,
  };
  nbChapters.unshift(ch);
  nbSave();
  nbOpenChapter(ch.id);
  setTimeout(() => {
    const ti = document.getElementById('nb-chapter-title-input');
    if (ti) ti.focus();
  }, 100);
}

// --- Open chapter ---
function nbOpenChapter(id) {
  // Save current before switching
  if (nbActiveId && nbActiveId !== id) nbSaveCurrentChapter();

  nbActiveId = id;
  const ch = nbActiveChapter();
  if (!ch) return;

  // Show editor, hide empty state
  document.getElementById('nb-empty-state').style.display = 'none';
  document.getElementById('nb-page').style.display = 'block';
  document.getElementById('nb-toolbar').style.display = 'flex';

  // Set content
  document.getElementById('nb-chapter-title-input').value = ch.title || '';
  document.getElementById('nb-chapter-emoji').textContent = ch.emoji || '📄';
  document.getElementById('nb-editor').innerHTML = ch.content || '';

  // Font
  nbSetFont(ch.font || 'default', false);
  const fs = document.getElementById('nb-font-select');
  if (fs) fs.value = ch.font || 'default';

  // Page style
  nbSetPageStyle(ch.pageStyle || 'blank', null, false);
  document.querySelectorAll('.nb-style-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.style === (ch.pageStyle || 'blank'));
  });

  // Color tags
  document.querySelectorAll('.nb-ct-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.color === ch.color);
  });

  // Tags
  nbRenderTags(ch.tags || []);

  // Stats
  nbUpdateStats();

  // Meta info
  const ca = document.getElementById('nb-created-at');
  const ua = document.getElementById('nb-updated-at');
  if (ca) ca.textContent = nbFmtDate(ch.createdAt);
  if (ua) ua.textContent = nbFmtDate(ch.updatedAt);

  // Highlight active chapter
  nbRenderChapters();
}

// --- Save current chapter ---
function nbSaveCurrentChapter() {
  const ch = nbActiveChapter();
  if (!ch) return;
  const titleInp = document.getElementById('nb-chapter-title-input');
  const editor = document.getElementById('nb-editor');
  if (titleInp) ch.title = titleInp.value;
  if (editor) ch.content = editor.innerHTML;
  ch.updatedAt = Date.now();
  ch.wordCount = nbWordCount((editor?.innerHTML||'').replace(/<[^>]+>/g,''));
  nbSave();
}

// --- Debounced auto-save ---
function nbDebounceSave() {
  if (nbSaveTimer) clearTimeout(nbSaveTimer);
  nbSaveTimer = setTimeout(() => {
    nbSaveCurrentChapter();
    nbUpdateStats();
    nbRenderChapters();
    // Show saved indicator
    const ind = document.getElementById('nb-save-indicator');
    if (ind) {
      ind.textContent = 'Saved';
      ind.classList.add('show');
      setTimeout(() => ind.classList.remove('show'), 2000);
    }
  }, 1500);
}

// --- Update stats ---
function nbUpdateStats() {
  const editor = document.getElementById('nb-editor');
  if (!editor) return;
  const text = editor.innerText || '';
  const words = nbWordCount(text);
  const chars = text.replace(/\s/g,'').length;
  const readMin = Math.max(1, Math.ceil(words / 200));
  const wc = document.getElementById('nb-word-count');
  const rt = document.getElementById('nb-read-time');
  const cc = document.getElementById('nb-char-count');
  if (wc) wc.textContent = words;
  if (rt) rt.textContent = readMin + ' min';
  if (cc) cc.textContent = chars;
}

// --- Delete chapter ---
function nbDeleteChapter(id, e) {
  e.stopPropagation();
  const ch = nbChapters.find(c => c.id === id);
  if (!ch) return;
  if (!confirm(`Delete "${ch.title || 'Untitled Chapter'}"? This cannot be undone.`)) return;
  nbChapters = nbChapters.filter(c => c.id !== id);
  nbSave();
  if (nbActiveId === id) {
    nbActiveId = null;
    if (nbChapters.length) nbOpenChapter(nbChapters[0].id);
    else {
      document.getElementById('nb-empty-state').style.display = 'flex';
      document.getElementById('nb-page').style.display = 'none';
    }
  } else {
    nbRenderChapters();
  }
  toast('Chapter deleted');
}

// --- execCommand wrapper ---
function nbExec(cmd, val) {
  const editor = document.getElementById('nb-editor');
  if (!editor) return;
  editor.focus();
  document.execCommand(cmd, false, val || null);
  nbDebounceSave();
}

// --- Insert heading / blockquote blocks ---
function nbInsertBlock(tag) {
  const editor = document.getElementById('nb-editor');
  if (!editor) return;
  editor.focus();
  document.execCommand('formatBlock', false, tag);
  nbDebounceSave();
}

// --- Insert checklist ---
function nbInsertChecklist() {
  const editor = document.getElementById('nb-editor');
  if (!editor) return;
  editor.focus();
  const item = document.createElement('div');
  item.className = 'nb-checklist-item';
  item.innerHTML = '<input type="checkbox" onchange="this.parentElement.classList.toggle(\'checked\',this.checked)"><span>New item</span>';
  const sel = window.getSelection();
  if (sel.rangeCount) {
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(item);
    range.setStartAfter(item);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  } else {
    editor.appendChild(item);
  }
  nbDebounceSave();
}

function nbHandleChecklistClick(e) {
  if (e.target.type === 'checkbox') {
    const item = e.target.closest('.nb-checklist-item');
    if (item) item.classList.toggle('checked', e.target.checked);
    nbDebounceSave();
  }
}

// --- Insert code block ---
function nbInsertCode() {
  const sel = window.getSelection();
  const text = sel.rangeCount ? sel.toString() : '';
  const code = document.createElement('code');
  code.textContent = text || 'code here';
  if (sel.rangeCount) {
    const range = sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(code);
    range.setStartAfter(code);
    sel.removeAllRanges();
    sel.addRange(range);
  } else {
    document.getElementById('nb-editor')?.appendChild(code);
  }
  nbDebounceSave();
}

// --- Insert divider ---
function nbInsertDivider() {
  nbExec('insertHTML', '<hr/>');
}

// --- Insert link ---
function nbInsertLink() {
  const url = prompt('Enter URL:', 'https://');
  if (!url) return;
  const label = prompt('Link text:', url);
  nbExec('insertHTML', `<a href="${url}" target="_blank" rel="noopener">${esc(label||url)}</a>`);
}

// --- Insert image ---
function nbInsertImage(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { toast('Please select an image file'); return; }
  if (file.size > 2*1024*1024) { toast('Image too large! Max 2MB'); e.target.value=''; return; }
  const reader = new FileReader();
  reader.onload = ev => {
    const html = `<img src="${ev.target.result}" alt="image" style="max-width:100%;border-radius:12px"/><div class="nb-img-caption" contenteditable="true">Caption…</div>`;
    nbExec('insertHTML', html);
    toast('Image inserted ✓');
  };
  reader.readAsDataURL(file);
  e.target.value = '';
}

// --- Sticker ---
function nbInsertSticker() {
  const text = prompt('Sticker text:', 'Note');
  if (!text) return;
  const c = NB_STICKER_COLORS[Math.floor(Math.random()*NB_STICKER_COLORS.length)];
  nbExec('insertHTML', `<span class="nb-sticker" style="background:${c.bg};color:${c.color}">${esc(text)}</span>&nbsp;`);
}

// --- Keyboard shortcuts ---
function nbHandleKey(e) {
  if ((e.ctrlKey||e.metaKey)) {
    if (e.key==='b'){e.preventDefault();nbExec('bold');}
    else if(e.key==='i'){e.preventDefault();nbExec('italic');}
    else if(e.key==='u'){e.preventDefault();nbExec('underline');}
    else if(e.key==='s'){e.preventDefault();nbSaveCurrentChapter();
      const ind=document.getElementById('nb-save-indicator');
      if(ind){ind.textContent='Saved';ind.classList.add('show');setTimeout(()=>ind.classList.remove('show'),2000);}
    }
  }
}

// --- Font ---
function nbSetFont(fontVal, save_=true) {
  const editor = document.getElementById('nb-editor');
  if (!editor) return;
  const fontClasses = ['nb-font-caveat','nb-font-dancing','nb-font-patrick','nb-font-mono','nb-font-lora','nb-font-playfair','nb-font-nunito','nb-font-dmsans','nb-font-baskerville'];
  const fontMap = {
    'Caveat':'nb-font-caveat','Dancing Script':'nb-font-dancing','Patrick Hand':'nb-font-patrick',
    'JetBrains Mono':'nb-font-mono','Lora':'nb-font-lora','Playfair Display':'nb-font-playfair',
    'Nunito':'nb-font-nunito','DM Sans':'nb-font-dmsans','Libre Baskerville':'nb-font-baskerville'
  };
  fontClasses.forEach(c => editor.classList.remove(c));
  if (fontMap[fontVal]) editor.classList.add(fontMap[fontVal]);
  if (save_ && nbActiveId) {
    const ch = nbActiveChapter();
    if (ch) { ch.font = fontVal; nbDebounceSave(); }
  }
}

// --- Font size ---
function nbSetSize(size) {
  const editor = document.getElementById('nb-editor');
  if (!editor) return;
  editor.focus();
  document.execCommand('fontSize', false, '7');
  editor.querySelectorAll('font[size="7"]').forEach(el => {
    el.removeAttribute('size');
    el.style.fontSize = size + 'px';
  });
  nbDebounceSave();
}

// --- Page style ---
function nbSetPageStyle(style, btn, saveIt=true) {
  const wrap = document.getElementById('nb-page-wrap');
  if (wrap) {
    wrap.classList.remove('nb-bg-blank','nb-bg-lined','nb-bg-dot','nb-bg-grid');
    wrap.classList.add('nb-bg-' + (style==='dot'?'dot':style==='grid'?'grid':style==='lined'?'lined':'blank'));
  }
  nbCurrentStyle = style;
  if (btn) {
    document.querySelectorAll('.nb-style-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  if (saveIt && nbActiveId) {
    const ch = nbActiveChapter();
    if (ch) { ch.pageStyle = style; nbDebounceSave(); }
  }
}

// --- Color tag ---
function nbSetColor(color, btn) {
  document.querySelectorAll('.nb-ct-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (nbActiveId) {
    const ch = nbActiveChapter();
    if (ch) { ch.color = color; nbDebounceSave(); nbRenderChapters(); }
  }
}

// --- Tags ---
function nbAddTag(e) {
  if (e.key !== 'Enter') return;
  const inp = document.getElementById('nb-tags-input');
  const val = inp.value.trim();
  if (!val || !nbActiveId) return;
  const ch = nbActiveChapter();
  if (!ch) return;
  if (!ch.tags) ch.tags = [];
  if (!ch.tags.includes(val)) {
    ch.tags.push(val);
    nbDebounceSave();
    nbRenderTags(ch.tags);
  }
  inp.value = '';
}
function nbRemoveTag(tag) {
  const ch = nbActiveChapter();
  if (!ch) return;
  ch.tags = (ch.tags||[]).filter(t => t !== tag);
  nbDebounceSave();
  nbRenderTags(ch.tags);
}
function nbRenderTags(tags) {
  const list = document.getElementById('nb-tags-list');
  if (!list) return;
  list.innerHTML = (tags||[]).map(t => `
    <span class="nb-tag">#${esc(t)}<button onclick="nbRemoveTag('${esc(t)}')" title="Remove">×</button></span>
  `).join('');
}

// --- Share chapter ---
function nbShareChapter() {
  const ch = nbActiveChapter();
  if (!ch) { toast('No chapter open'); return; }
  const text = (ch.title ? ch.title + '\n\n' : '') +
    (document.getElementById('nb-editor')?.innerText || ch.content.replace(/<[^>]+>/g,''));
  navigator.clipboard.writeText(text).then(() => toast('Copied to clipboard ✓')).catch(() => {
    prompt('Copy this text:', text);
  });
}

// --- Emoji picker ---
let nbEmojiCat = 'Smileys';
function nbToggleEmojiPicker() {
  const picker = document.getElementById('nb-emoji-picker');
  if (!picker) return;
  const isOpen = picker.style.display !== 'none';
  picker.style.display = isOpen ? 'none' : 'flex';
  if (!isOpen) nbRenderEmojiPicker();
}
function nbRenderEmojiPicker() {
  // Categories
  const cats = document.getElementById('nb-emoji-cats');
  if (cats) {
    cats.innerHTML = Object.keys(NB_EMOJIS).map(cat =>
      `<button class="nb-emoji-cat-btn${cat===nbEmojiCat?' active':''}" onclick="nbEmojiCatSwitch('${cat}')">${cat}</button>`
    ).join('');
  }
  // Grid
  const grid = document.getElementById('nb-emoji-grid');
  if (grid) {
    grid.innerHTML = (NB_EMOJIS[nbEmojiCat]||[]).map(em =>
      `<button class="nb-emoji-btn" onclick="nbPickEmoji('${em}')">${em}</button>`
    ).join('');
  }
}
function nbEmojiCatSwitch(cat) {
  nbEmojiCat = cat;
  nbRenderEmojiPicker();
}
function nbPickEmoji(em) {
  nbExec('insertText', em);
  document.getElementById('nb-emoji-picker').style.display = 'none';
}

// --- Chapter emoji cover picker ---
function nbOpenEmojiCover() {
  const picker = document.getElementById('nb-cover-picker');
  if (!picker) return;
  const grid = document.getElementById('nb-cover-emoji-grid');
  if (grid) {
    grid.innerHTML = NB_COVER_EMOJIS.map(em =>
      `<button class="nb-emoji-btn" onclick="nbPickCoverEmoji('${em}')" style="font-size:26px;width:40px;height:40px">${em}</button>`
    ).join('');
  }
  picker.style.display = 'flex';
}
function nbPickCoverEmoji(em) {
  document.getElementById('nb-chapter-emoji').textContent = em;
  document.getElementById('nb-cover-picker').style.display = 'none';
  const ch = nbActiveChapter();
  if (ch) { ch.emoji = em; nbDebounceSave(); nbRenderChapters(); }
}

// --- Mobile chapters toggle ---
function nbToggleMobileChapters() {
  const panel = document.getElementById('nb-chapters');
  if (panel) panel.classList.toggle('mob-open');
}

// --- Init on notebook view open ---
function nbInit() {
  nbRenderChapters();
  if (nbChapters.length && !nbActiveId) {
    nbOpenChapter(nbChapters[0].id);
  } else if (!nbChapters.length) {
    document.getElementById('nb-empty-state').style.display = 'flex';
    document.getElementById('nb-page').style.display = 'none';
  }
}

// Hook into switchView
const _origSwitchView = switchView;
switchView = function(name) {
  // Save current notebook chapter before leaving
  if (document.getElementById('view-notebook')?.classList.contains('active') && nbActiveId) {
    nbSaveCurrentChapter();
  }
  _origSwitchView(name);
  if (name === 'notebook') {
    setTimeout(nbInit, 50);
  }
};

// Also handle initial load if notebook is navigated to via sidebar
document.addEventListener('DOMContentLoaded', () => {
  // Pre-render chapters so sidebar feels live
  nbRenderChapters();
});
if (document.readyState !== 'loading') nbRenderChapters();

// =============================================
//  SUPABASE INTEGRATION — Batch 4
// =============================================
let _currentUser = null;

// ── Auth guard: redirect to login if not logged in ──
async function initAuth() {
  const { data:{ session } } = await _supa.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return; }

  _currentUser = await getCurrentUserProfile();

  // Clear localStorage if a different user logged in
  const storedUserId = localStorage.getItem('wlp-active-user');
  if (storedUserId && storedUserId !== _currentUser.id) {
    // Different user — wipe all cached data
    const keysToKeep = ['wlp-theme'];
    const savedTheme = localStorage.getItem('wlp-theme');
    localStorage.clear();
    if (savedTheme) localStorage.setItem('wlp-theme', savedTheme);
    // Reset in-memory state
    fixedTasks = []; gridChecks = {};
    teammates = []; memberFixedTasks = {}; memberGridChecks = {};
    nbChapters = []; nbActiveId = null;
  }
  localStorage.setItem('wlp-active-user', _currentUser.id);

  // Show logout btn
  const lb = document.getElementById('logout-btn');
  if (lb) lb.style.display = 'flex';

  // Apply saved name & photo
  const nameEl = document.getElementById('sb-profile-name');
  if (nameEl) nameEl.textContent = _currentUser.name;
  localStorage.setItem('profileName', _currentUser.name);

  const iniEl = document.getElementById('sb-profile-initials');
  if (iniEl) {
    const p = _currentUser.name.trim().split(/\s+/);
    iniEl.textContent = p.length>1 ? (p[0][0]+p[p.length-1][0]).toUpperCase() : _currentUser.name.slice(0,2).toUpperCase();
  }
  const picSrc = _currentUser.avatar_url || localStorage.getItem('profilePic');
  if (picSrc) applyProfilePic(picSrc);

  updateSbGreeting();
  await supaLoadAll();
}

// ── Load all data from Supabase ──
async function supaLoadAll() {
  if (!_currentUser) return;
  const oid = _currentUser.id;
  try {
    // Tasks (main user)
    const { data: dbTasks } = await _supa.from('tasks').select('*').eq('owner_id',oid).eq('teammate_id','main');
    if (dbTasks?.length) {
      fixedTasks = dbTasks.map(t=>({id:t.id,name:t.name,cat:t.cat,type:t.type,days:t.days||[],note:t.note||''}));
      save('fixedTasks', fixedTasks);
    }
    // Grid checks
    const { data: dbChecks } = await _supa.from('grid_checks').select('*').eq('owner_id',oid).eq('teammate_id','main');
    if (dbChecks?.length) {
      gridChecks = {};
      dbChecks.forEach(c => { gridChecks[`${c.task_id}_${c.check_date}`] = c.checked; });
      save('gridChecks', gridChecks);
    }
    // Teammates
    const { data: dbTM } = await _supa.from('teammates').select('*').eq('owner_id',oid);
    if (dbTM?.length) {
      teammates = dbTM.map(t=>({id:t.id,name:t.name,role:t.role||'',color:t.color||'#0ea5e9',avatar_url:t.avatar_url||null}));
      save('teammates', teammates);
    }
    // Notebook chapters
    const { data: dbCh } = await _supa.from('notebook_chapters').select('*').eq('owner_id',oid).order('updated_at',{ascending:false});
    if (dbCh?.length) {
      nbChapters = dbCh.map(c=>({
        id:c.id,title:c.title||'',emoji:c.emoji||'📄',content:c.content||'',
        font:c.font||'default',pageStyle:c.page_style||'blank',color:c.color||'#0ea5e9',
        tags:c.tags||[],wordCount:c.word_count||0,
        createdAt:new Date(c.created_at).getTime(),updatedAt:new Date(c.updated_at).getTime()
      }));
      save('wlp-notebook',{chapters:nbChapters});
    }
    // Re-render
    if(typeof renderDashboard==='function') renderDashboard();
    if(typeof renderToday==='function') renderToday();
    if(typeof renderTeammateLinks==='function') renderTeammateLinks();
    if(typeof nbRenderChapters==='function') nbRenderChapters();
  } catch(e){ console.error('Supabase load error:',e); }
}

// ── Save helpers ──
async function supaSaveTask(task, tmId='main') {
  if(!_currentUser) return;
  await _supa.from('tasks').upsert({id:task.id,owner_id:_currentUser.id,teammate_id:tmId,name:task.name,cat:task.cat,type:task.type,days:task.days||[],note:task.note||''});
}
async function supaDeleteTask(id) {
  if(!_currentUser) return;
  await _supa.from('tasks').delete().eq('id',id).eq('owner_id',_currentUser.id);
}
async function supaSaveCheck(taskId, dateStr, checked, tmId='main') {
  if(!_currentUser) return;
  await _supa.from('grid_checks').upsert({owner_id:_currentUser.id,teammate_id:tmId,task_id:taskId,check_date:dateStr,checked},{onConflict:'owner_id,teammate_id,task_id,check_date'});
}
async function supaSaveChapter(ch) {
  if(!_currentUser) return;
  await _supa.from('notebook_chapters').upsert({id:ch.id,owner_id:_currentUser.id,title:ch.title||'',emoji:ch.emoji||'📄',content:ch.content||'',font:ch.font||'default',page_style:ch.pageStyle||'blank',color:ch.color||'#0ea5e9',tags:ch.tags||[],word_count:ch.wordCount||0,updated_at:new Date().toISOString()});
}
async function supaDeleteChapter(id) {
  if(!_currentUser) return;
  await _supa.from('notebook_chapters').delete().eq('id',id).eq('owner_id',_currentUser.id);
}
async function supaSaveTeammate(tm) {
  if(!_currentUser) return;
  await _supa.from('teammates').upsert({id:tm.id,owner_id:_currentUser.id,name:tm.name,role:tm.role||'',color:tm.color||'#0ea5e9',avatar_url:tm.avatar_url||null});
}
async function supaDeleteTeammate(id) {
  if(!_currentUser) return;
  await _supa.from('teammates').delete().eq('id',id).eq('owner_id',_currentUser.id);
  await _supa.from('tasks').delete().eq('teammate_id',id).eq('owner_id',_currentUser.id);
  await _supa.from('grid_checks').delete().eq('teammate_id',id).eq('owner_id',_currentUser.id);
}

// ── Profile picture upload to Supabase Storage ──
const _origHandleProfileUpload = handleProfileUpload;
handleProfileUpload = async function(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (!['image/png','image/jpeg'].includes(file.type)) { toast('Only PNG/JPG allowed'); e.target.value=''; return; }
  if (file.size > 2*1024*1024) { toast('Max 2MB'); e.target.value=''; return; }
  if (_currentUser) {
    try {
      toast('Uploading...');
      const ext = file.name.split('.').pop();
      const path = `${_currentUser.id}/avatar.${ext}`;
      await _supa.storage.from('avatars').upload(path, file, {upsert:true});
      const { data } = _supa.storage.from('avatars').getPublicUrl(path);
      await _supa.from('profiles').update({avatar_url:data.publicUrl}).eq('id',_currentUser.id);
      _currentUser.avatar_url = data.publicUrl;
      localStorage.setItem('profilePic', data.publicUrl);
      applyProfilePic(data.publicUrl);
      toast('Profile picture updated ✓');
    } catch(err) { toast('Upload failed'); }
  } else { _origHandleProfileUpload(e); }
  e.target.value = '';
};

// ── Notebook: patch save+delete to sync Supabase ──
const _origNbSave = nbSaveCurrentChapter;
nbSaveCurrentChapter = function() {
  _origNbSave();
  const ch = nbActiveChapter();
  if (ch && _currentUser) supaSaveChapter(ch);
};
const _origNbDel = nbDeleteChapter;
nbDeleteChapter = function(id, e) {
  if (_currentUser) supaDeleteChapter(id);
  _origNbDel(id, e);
};

// ── PDF/CSV upload in Notebook ──
function nbInsertFileUpload() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.pdf,.csv';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10*1024*1024) { toast('Max 10MB'); return; }
    if (!nbActiveId) { toast('Open a chapter first'); return; }
    if (!_currentUser) { toast('Login required'); return; }
    try {
      toast('Uploading...');
      const path = `${_currentUser.id}/${nbActiveId}/${Date.now()}_${file.name}`;
      await _supa.storage.from('notebook-files').upload(path, file, {upsert:true});
      const { data } = _supa.storage.from('notebook-files').getPublicUrl(path);
      await _supa.from('notebook_files').insert({chapter_id:nbActiveId,owner_id:_currentUser.id,file_name:file.name,file_type:file.type,file_url:data.publicUrl,file_size:file.size});
      const isPdf = file.type==='application/pdf';
      nbExec('insertHTML', `<div class="nb-file-embed"><div class="nb-file-icon">${isPdf?'📄':'📊'}</div><div class="nb-file-info"><div class="nb-file-name">${esc(file.name)}</div><div class="nb-file-size">${(file.size/1024).toFixed(1)} KB · ${isPdf?'PDF':'CSV'}</div></div><a href="${data.publicUrl}" target="_blank" class="nb-file-open-btn">${isPdf?'Open PDF':'Download CSV'}</a></div>`);
      toast(file.name + ' uploaded ✓');
    } catch(err) { toast('Upload failed: '+err.message); }
  };
  input.click();
}

// ── Logout button CSS ──
(function(){
  const s = document.createElement('style');
  s.textContent = `.logout-btn{width:28px;height:28px;border-radius:8px;background:rgba(244,63,94,0.1);border:1px solid rgba(244,63,94,0.2);color:rgba(244,63,94,0.7);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;}.logout-btn:hover{background:rgba(244,63,94,0.22);color:#f43f5e;}`;
  document.head.appendChild(s);
})();

// ── Boot ──
document.addEventListener('DOMContentLoaded', initAuth);
if (document.readyState !== 'loading') initAuth();

// =============================================
//  DAILY LOG — Premium UI
// =============================================
const DL_MAX_TASKS = 8;
let dlData = load('dailyLog', { cols:['Task 1','Task 2','Task 3'], rows:[] });

function dlSave(){ save('dailyLog', dlData); }

function dlFmtDate(d){
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const day=d.getDate();
  const s=day===1||day===21||day===31?'st':day===2||day===22?'nd':day===3||day===23?'rd':'th';
  return `${day}${s} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
function dlIsToday(label){ return label===dlFmtDate(new Date()); }

function dlUpdateStats(){
  const totalDays = dlData.rows.length;
  let totalTasks=0, doneTasks=0;
  dlData.rows.forEach(r => {
    dlData.cols.forEach((_,ci) => {
      const t=r.tasks[ci];
      if(t && t.text.trim()){ totalTasks++; if(t.done) doneTasks++; }
    });
  });
  const pct = totalTasks ? Math.round(doneTasks/totalTasks*100) : 0;
  const sd=document.getElementById('dl-stat-days');
  const st=document.getElementById('dl-stat-done');
  const stt=document.getElementById('dl-stat-total');
  const sp=document.getElementById('dl-stat-pct');
  if(sd) sd.textContent=totalDays;
  if(st) st.textContent=doneTasks;
  if(stt) stt.textContent=totalTasks;
  if(sp) sp.textContent=pct+'%';
}

function dlRender(){
  const empty=document.getElementById('dl-empty');
  const wrap=document.getElementById('dl-table-wrap');
  const thead=document.getElementById('dl-thead-row');
  const tbody=document.getElementById('dl-tbody');
  if(!tbody) return;

  dlUpdateStats();

  const hasRows=dlData.rows.length>0;
  if(empty) empty.style.display=hasRows?'none':'flex';
  if(wrap)  wrap.style.display=hasRows?'block':'none';
  if(!hasRows) return;

  // Build header
  const colsHtml=dlData.cols.map((col,ci)=>`
    <th class="dl-th-task">
      <div class="dl-th-task-inner">
        <input class="dl-col-name-inp" value="${esc(col)}" title="Click to rename"
          onchange="dlRenameCol(${ci},this.value)"
          onblur="dlRenameCol(${ci},this.value)"/>
        <button class="dl-col-del-btn" onclick="dlDeleteCol(${ci})" title="Delete column">
          <i class="ti ti-x"></i>
        </button>
      </div>
    </th>`).join('');

  thead.innerHTML=`
    <th class="dl-th-date">Date</th>
    ${colsHtml}
    <th class="dl-th-actions">
      <button class="dl-add-col-btn" onclick="dlAddTaskCol()"
        ${dlData.cols.length>=DL_MAX_TASKS?'disabled':''}>
        <i class="ti ti-plus"></i> Add Task
      </button>
    </th>
    <th class="dl-th-dl"><i class="ti ti-download"></i></th>`;

  // Build rows
  tbody.innerHTML=dlData.rows.map((row,ri)=>{
    const isToday=dlIsToday(row.dateLabel);
    const taskCells=dlData.cols.map((_,ci)=>{
      const t=row.tasks[ci]||{text:'',done:false};
      return `<td class="dl-td-task">
        <div class="dl-task-wrap">
          <input type="checkbox" class="dl-check" ${t.done?'checked':''}
            onchange="dlToggleTask(${ri},${ci},this.checked)"/>
          <textarea class="dl-task-inp${t.done?' done-inp':''}" rows="1"
            placeholder="Write task…"
            oninput="dlUpdateTask(${ri},${ci},this.value);dlAutoResize(this)"
            onfocus="dlAutoResize(this)"
            onblur="dlSave()"
            >${esc(t.text)}</textarea>
        </div>
      </td>`;
    }).join('');

    return `<tr class="${isToday?'dl-today-row':''}" id="dl-row-${row.id}">
      <td class="dl-td-date">
        <div class="dl-date-inner">
          <div class="dl-date-badge">
            <div class="dl-date-dot"></div>
            ${esc(row.dateLabel)}
          </div>
          ${isToday?'<span class="dl-today-tag">Today</span>':''}
          <button class="dl-row-del-btn" onclick="dlDeleteRow('${row.id}')" title="Delete row">
            <i class="ti ti-trash"></i>
          </button>
        </div>
      </td>
      ${taskCells}
      <td class="dl-td-add"></td>
      <td class="dl-td-dl">
        <button class="dl-row-dl-btn" onclick="dlDownloadRow('${row.id}')" title="Download row">
          <i class="ti ti-download"></i>
        </button>
      </td>
    </tr>`;
  }).join('');

  setTimeout(()=>{ document.querySelectorAll('.dl-task-inp').forEach(dlAutoResize); }, 60);
}

function dlAutoResize(el){
  el.style.height='auto';
  el.style.height=Math.max(32,el.scrollHeight)+'px';
}

function dlAddToday(){
  const label=dlFmtDate(new Date());
  if(dlData.rows.find(r=>r.dateLabel===label)){ toast("Today's date already added"); return; }
  dlData.rows.unshift({id:'dl_'+Date.now(),dateLabel:label,tasks:dlData.cols.map(()=>({text:'',done:false}))});
  dlSave(); dlRender(); toast('Today added ✓');
}

function dlDeleteRow(id){
  if(!confirm('Delete this date row?')) return;
  dlData.rows=dlData.rows.filter(r=>r.id!==id);
  dlSave(); dlRender();
}

function dlAddTaskCol(){
  if(dlData.cols.length>=DL_MAX_TASKS){ toast('Maximum 8 task columns'); return; }
  dlData.cols.push('Task '+(dlData.cols.length+1));
  dlData.rows.forEach(r=>r.tasks.push({text:'',done:false}));
  dlSave(); dlRender();
}

function dlDeleteCol(ci){
  if(dlData.cols.length<=1){ toast('Need at least 1 column'); return; }
  if(!confirm(`Delete column "${dlData.cols[ci]}"?`)) return;
  dlData.cols.splice(ci,1);
  dlData.rows.forEach(r=>r.tasks.splice(ci,1));
  dlSave(); dlRender();
}

function dlRenameCol(ci,val){
  dlData.cols[ci]=val.trim()||`Task ${ci+1}`;
  dlSave();
}

function dlUpdateTask(ri,ci,val){
  if(!dlData.rows[ri]) return;
  if(!dlData.rows[ri].tasks[ci]) dlData.rows[ri].tasks[ci]={text:'',done:false};
  dlData.rows[ri].tasks[ci].text=val;
}

function dlToggleTask(ri,ci,done){
  if(!dlData.rows[ri]) return;
  if(!dlData.rows[ri].tasks[ci]) dlData.rows[ri].tasks[ci]={text:'',done:false};
  dlData.rows[ri].tasks[ci].done=done;
  // Toggle strikethrough class
  const inp=document.querySelector(`#dl-row-${dlData.rows[ri].id} .dl-td-task:nth-child(${ci+2}) .dl-task-inp`);
  if(inp) inp.classList.toggle('done-inp',done);
  dlSave(); dlUpdateStats();
}

function dlDownload(){
  if(!dlData.rows.length){ toast('No data to download'); return; }
  const headers=['Date',...dlData.cols];
  const rows=dlData.rows.map(row=>[
    row.dateLabel,
    ...dlData.cols.map((_,ci)=>{
      const t=row.tasks[ci]||{text:'',done:false};
      return t.done?`[Done] ${t.text}`:t.text;
    })
  ]);
  const csv=[headers,...rows].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([csv],{type:'text/csv'})),download:`daily-log-${new Date().toISOString().slice(0,10)}.csv`});
  a.click(); URL.revokeObjectURL(a.href);
  toast('Downloaded ✓');
}

function dlDownloadRow(id){
  const row=dlData.rows.find(r=>r.id===id);
  if(!row) return;
  const headers=['Date',...dlData.cols];
  const data=[row.dateLabel,...dlData.cols.map((_,ci)=>{const t=row.tasks[ci]||{text:'',done:false};return t.done?`[Done] ${t.text}`:t.text;})];
  const csv=[headers,data].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(new Blob([csv],{type:'text/csv'})),download:`log-${row.dateLabel.replace(/\s+/g,'-')}.csv`});
  a.click(); URL.revokeObjectURL(a.href);
  toast('Row downloaded ✓');
}

const _origSwitchViewDL = typeof _origSwitchViewDL !== 'undefined' ? _origSwitchViewDL : switchView;
switchView = function(name){
  _origSwitchViewDL(name);
  if(name==='dailylog') setTimeout(dlRender, 60);
};
// =============================================
//  SUPABASE INTEGRATION — Batch 4
// =============================================
let _currentUser = null;

// ── Auth guard: redirect to login if not logged in ──
async function initAuth() {
  const { data:{ session } } = await _supa.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return; }

  _currentUser = await getCurrentUserProfile();

  // Clear localStorage if a different user logged in
  const storedUserId = localStorage.getItem('wlp-active-user');
  if (storedUserId && storedUserId !== _currentUser.id) {
    // Different user — wipe all cached data
    const keysToKeep = ['wlp-theme'];
    const savedTheme = localStorage.getItem('wlp-theme');
    localStorage.clear();
    if (savedTheme) localStorage.setItem('wlp-theme', savedTheme);
    // Reset in-memory state
    fixedTasks = []; gridChecks = {};
    teammates = []; memberFixedTasks = {}; memberGridChecks = {};
    nbChapters = []; nbActiveId = null;
  }
  localStorage.setItem('wlp-active-user', _currentUser.id);

  // Show logout btn
  const lb = document.getElementById('logout-btn');
  if (lb) lb.style.display = 'flex';

  // Apply saved name & photo
  const nameEl = document.getElementById('sb-profile-name');
  if (nameEl) nameEl.textContent = _currentUser.name;
  localStorage.setItem('profileName', _currentUser.name);

  const iniEl = document.getElementById('sb-profile-initials');
  if (iniEl) {
    const p = _currentUser.name.trim().split(/\s+/);
    iniEl.textContent = p.length>1 ? (p[0][0]+p[p.length-1][0]).toUpperCase() : _currentUser.name.slice(0,2).toUpperCase();
  }
  const picSrc = _currentUser.avatar_url || localStorage.getItem('profilePic');
  if (picSrc) applyProfilePic(picSrc);

  updateSbGreeting();
  await supaLoadAll();
}

// ── Load all data from Supabase ──
async function supaLoadAll() {
  if (!_currentUser) return;
  const oid = _currentUser.id;
  try {
    // Tasks (main user)
    const { data: dbTasks } = await _supa.from('tasks').select('*').eq('owner_id',oid).eq('teammate_id','main');
    if (dbTasks?.length) {
      fixedTasks = dbTasks.map(t=>({id:t.id,name:t.name,cat:t.cat,type:t.type,days:t.days||[],note:t.note||''}));
      save('fixedTasks', fixedTasks);
    }
    // Grid checks
    const { data: dbChecks } = await _supa.from('grid_checks').select('*').eq('owner_id',oid).eq('teammate_id','main');
    if (dbChecks?.length) {
      gridChecks = {};
      dbChecks.forEach(c => { gridChecks[`${c.task_id}_${c.check_date}`] = c.checked; });
      save('gridChecks', gridChecks);
    }
    // Teammates
    const { data: dbTM } = await _supa.from('teammates').select('*').eq('owner_id',oid);
    if (dbTM?.length) {
      teammates = dbTM.map(t=>({id:t.id,name:t.name,role:t.role||'',color:t.color||'#0ea5e9',avatar_url:t.avatar_url||null}));
      save('teammates', teammates);
    }
    // Notebook chapters
    const { data: dbCh } = await _supa.from('notebook_chapters').select('*').eq('owner_id',oid).order('updated_at',{ascending:false});
    if (dbCh?.length) {
      nbChapters = dbCh.map(c=>({
        id:c.id,title:c.title||'',emoji:c.emoji||'📄',content:c.content||'',
        font:c.font||'default',pageStyle:c.page_style||'blank',color:c.color||'#0ea5e9',
        tags:c.tags||[],wordCount:c.word_count||0,
        createdAt:new Date(c.created_at).getTime(),updatedAt:new Date(c.updated_at).getTime()
      }));
      save('wlp-notebook',{chapters:nbChapters});
    }
    // Re-render
    if(typeof renderDashboard==='function') renderDashboard();
    if(typeof renderToday==='function') renderToday();
    if(typeof renderTeammateLinks==='function') renderTeammateLinks();
    if(typeof nbRenderChapters==='function') nbRenderChapters();
  } catch(e){ console.error('Supabase load error:',e); }
}

// ── Save helpers ──
async function supaSaveTask(task, tmId='main') {
  if(!_currentUser) return;
  await _supa.from('tasks').upsert({id:task.id,owner_id:_currentUser.id,teammate_id:tmId,name:task.name,cat:task.cat,type:task.type,days:task.days||[],note:task.note||''});
}
async function supaDeleteTask(id) {
  if(!_currentUser) return;
  await _supa.from('tasks').delete().eq('id',id).eq('owner_id',_currentUser.id);
}
async function supaSaveCheck(taskId, dateStr, checked, tmId='main') {
  if(!_currentUser) return;
  await _supa.from('grid_checks').upsert({owner_id:_currentUser.id,teammate_id:tmId,task_id:taskId,check_date:dateStr,checked},{onConflict:'owner_id,teammate_id,task_id,check_date'});
}
async function supaSaveChapter(ch) {
  if(!_currentUser) return;
  await _supa.from('notebook_chapters').upsert({id:ch.id,owner_id:_currentUser.id,title:ch.title||'',emoji:ch.emoji||'📄',content:ch.content||'',font:ch.font||'default',page_style:ch.pageStyle||'blank',color:ch.color||'#0ea5e9',tags:ch.tags||[],word_count:ch.wordCount||0,updated_at:new Date().toISOString()});
}
async function supaDeleteChapter(id) {
  if(!_currentUser) return;
  await _supa.from('notebook_chapters').delete().eq('id',id).eq('owner_id',_currentUser.id);
}
async function supaSaveTeammate(tm) {
  if(!_currentUser) return;
  await _supa.from('teammates').upsert({id:tm.id,owner_id:_currentUser.id,name:tm.name,role:tm.role||'',color:tm.color||'#0ea5e9',avatar_url:tm.avatar_url||null});
}
async function supaDeleteTeammate(id) {
  if(!_currentUser) return;
  await _supa.from('teammates').delete().eq('id',id).eq('owner_id',_currentUser.id);
  await _supa.from('tasks').delete().eq('teammate_id',id).eq('owner_id',_currentUser.id);
  await _supa.from('grid_checks').delete().eq('teammate_id',id).eq('owner_id',_currentUser.id);
}

// ── Profile picture upload to Supabase Storage ──
const _origHandleProfileUpload = handleProfileUpload;
handleProfileUpload = async function(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (!['image/png','image/jpeg'].includes(file.type)) { toast('Only PNG/JPG allowed'); e.target.value=''; return; }
  if (file.size > 2*1024*1024) { toast('Max 2MB'); e.target.value=''; return; }
  if (_currentUser) {
    try {
      toast('Uploading...');
      const ext = file.name.split('.').pop();
      const path = `${_currentUser.id}/avatar.${ext}`;
      await _supa.storage.from('avatars').upload(path, file, {upsert:true});
      const { data } = _supa.storage.from('avatars').getPublicUrl(path);
      await _supa.from('profiles').update({avatar_url:data.publicUrl}).eq('id',_currentUser.id);
      _currentUser.avatar_url = data.publicUrl;
      localStorage.setItem('profilePic', data.publicUrl);
      applyProfilePic(data.publicUrl);
      toast('Profile picture updated ✓');
    } catch(err) { toast('Upload failed'); }
  } else { _origHandleProfileUpload(e); }
  e.target.value = '';
};

// ── Notebook: patch save+delete to sync Supabase ──
const _origNbSave = nbSaveCurrentChapter;
nbSaveCurrentChapter = function() {
  _origNbSave();
  const ch = nbActiveChapter();
  if (ch && _currentUser) supaSaveChapter(ch);
};
const _origNbDel = nbDeleteChapter;
nbDeleteChapter = function(id, e) {
  if (_currentUser) supaDeleteChapter(id);
  _origNbDel(id, e);
};

// ── PDF/CSV upload in Notebook ──
function nbInsertFileUpload() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.pdf,.csv';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10*1024*1024) { toast('Max 10MB'); return; }
    if (!nbActiveId) { toast('Open a chapter first'); return; }
    if (!_currentUser) { toast('Login required'); return; }
    try {
      toast('Uploading...');
      const path = `${_currentUser.id}/${nbActiveId}/${Date.now()}_${file.name}`;
      await _supa.storage.from('notebook-files').upload(path, file, {upsert:true});
      const { data } = _supa.storage.from('notebook-files').getPublicUrl(path);
      await _supa.from('notebook_files').insert({chapter_id:nbActiveId,owner_id:_currentUser.id,file_name:file.name,file_type:file.type,file_url:data.publicUrl,file_size:file.size});
      const isPdf = file.type==='application/pdf';
      nbExec('insertHTML', `<div class="nb-file-embed"><div class="nb-file-icon">${isPdf?'📄':'📊'}</div><div class="nb-file-info"><div class="nb-file-name">${esc(file.name)}</div><div class="nb-file-size">${(file.size/1024).toFixed(1)} KB · ${isPdf?'PDF':'CSV'}</div></div><a href="${data.publicUrl}" target="_blank" class="nb-file-open-btn">${isPdf?'Open PDF':'Download CSV'}</a></div>`);
      toast(file.name + ' uploaded ✓');
    } catch(err) { toast('Upload failed: '+err.message); }
  };
  input.click();
}

// ── Logout button CSS ──
(function(){
  const s = document.createElement('style');
  s.textContent = `.logout-btn{width:28px;height:28px;border-radius:8px;background:rgba(244,63,94,0.1);border:1px solid rgba(244,63,94,0.2);color:rgba(244,63,94,0.7);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;}.logout-btn:hover{background:rgba(244,63,94,0.22);color:#f43f5e;}`;
  document.head.appendChild(s);
})();

// ── Boot ──
document.addEventListener('DOMContentLoaded', initAuth);
if (document.readyState !== 'loading') initAuth();

// =============================================
//  DAILY LOG
// =============================================
const DL_MAX_TASKS = 8;

let dlData = load('dailyLog', { cols: ['Task 1','Task 2','Task 3'], rows: [] });
// rows: [{ id, date, dateLabel, tasks: [{text,done},...] }]

function dlSave() { save('dailyLog', dlData); }

function dlFmtDate(d) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const day = d.getDate();
  const suffix = day===1||day===21||day===31?'st':day===2||day===22?'nd':day===3||day===23?'rd':'th';
  return `${day}${suffix} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function dlIsToday(dateLabel) {
  return dateLabel === dlFmtDate(new Date());
}

// ── Render ──────────────────────────────────
function dlRender() {
  const empty   = document.getElementById('dl-empty');
  const tableWrap = document.querySelector('.dl-table-wrap');
  const thead   = document.getElementById('dl-thead-row');
  const tbody   = document.getElementById('dl-tbody');
  const addBtn  = document.getElementById('dl-add-col-btn');
  if (!tbody) return;

  const hasRows = dlData.rows.length > 0;
  if (empty)    empty.style.display    = hasRows ? 'none' : 'flex';
  if (tableWrap) tableWrap.style.display = hasRows ? 'block' : 'none';

  if (!hasRows) return;

  // Build header columns
  const colsHtml = dlData.cols.map((col, ci) => `
    <th>
      <div class="dl-task-th-inner">
        <input class="dl-col-name" value="${esc(col)}" title="Click to rename"
          onchange="dlRenameCol(${ci},this.value)"
          onblur="dlRenameCol(${ci},this.value)"/>
        <button class="dl-col-del" onclick="dlDeleteCol(${ci})" title="Remove column">
          <i class="ti ti-x"></i>
        </button>
      </div>
    </th>
  `).join('');

  // Rebuild header (keep first date-th and last two cols)
  thead.innerHTML = `
    <th class="dl-date-th">Date</th>
    ${colsHtml}
    <th class="dl-add-col">
      <button class="dl-add-task-btn" onclick="dlAddTaskCol()" id="dl-add-col-btn"
        ${dlData.cols.length >= DL_MAX_TASKS ? 'disabled' : ''}>
        <i class="ti ti-plus"></i> Add Task
      </button>
    </th>
    <th class="dl-dl-col"><i class="ti ti-download"></i></th>
  `;

  // Build rows
  tbody.innerHTML = dlData.rows.map((row, ri) => {
    const isToday = dlIsToday(row.dateLabel);
    const taskCells = dlData.cols.map((_, ci) => {
      const task = row.tasks[ci] || { text:'', done:false };
      return `
        <td class="dl-task-cell">
          <div class="dl-task-wrap">
            <input type="checkbox" class="dl-check"
              ${task.done ? 'checked' : ''}
              onchange="dlToggleTask(${ri},${ci},this.checked)"/>
            <textarea class="dl-task-input" rows="1"
              placeholder="Write task…"
              oninput="dlUpdateTask(${ri},${ci},this.value);autoResize(this)"
              onfocus="autoResize(this)"
              onblur="dlSave()"
              >${esc(task.text)}</textarea>
          </div>
        </td>`;
    }).join('');

    return `
      <tr class="${isToday ? 'dl-today-row' : ''}" id="dl-row-${row.id}">
        <td class="dl-date-cell">
          <div class="dl-date-label">
            <div class="dl-date-dot"></div>
            <span>${esc(row.dateLabel)}</span>
            <button class="dl-date-del" onclick="dlDeleteRow('${row.id}')" title="Delete row">
              <i class="ti ti-trash"></i>
            </button>
          </div>
        </td>
        ${taskCells}
        <td></td>
        <td class="dl-row-dl-cell">
          <button class="dl-row-dl-btn" onclick="dlDownloadRow('${row.id}')" title="Download this row">
            <i class="ti ti-download"></i>
          </button>
        </td>
      </tr>`;
  }).join('');

  // Auto-resize all textareas
  setTimeout(() => {
    document.querySelectorAll('.dl-task-input').forEach(autoResize);
  }, 50);
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.max(32, el.scrollHeight) + 'px';
}

// ── Add today's date row ──────────────────────
function dlAddToday() {
  const label = dlFmtDate(new Date());
  // Don't add duplicate
  if (dlData.rows.find(r => r.dateLabel === label)) {
    toast('Today\'s date already added');
    return;
  }
  dlData.rows.unshift({
    id: 'dl_' + Date.now(),
    dateLabel: label,
    tasks: dlData.cols.map(() => ({ text:'', done:false }))
  });
  dlSave();
  dlRender();
  toast('Today added ✓');
}

// ── Add custom date row ───────────────────────
function dlAddDateRow(dateStr) {
  const d = new Date(dateStr);
  const label = dlFmtDate(d);
  if (dlData.rows.find(r => r.dateLabel === label)) {
    toast('Date already exists');
    return;
  }
  dlData.rows.unshift({
    id: 'dl_' + Date.now(),
    dateLabel: label,
    tasks: dlData.cols.map(() => ({ text:'', done:false }))
  });
  dlSave();
  dlRender();
}

// ── Delete row ────────────────────────────────
function dlDeleteRow(id) {
  if (!confirm('Delete this date row?')) return;
  dlData.rows = dlData.rows.filter(r => r.id !== id);
  dlSave();
  dlRender();
}

// ── Add task column ───────────────────────────
function dlAddTaskCol() {
  if (dlData.cols.length >= DL_MAX_TASKS) { toast('Maximum 8 task columns'); return; }
  const num = dlData.cols.length + 1;
  dlData.cols.push(`Task ${num}`);
  dlData.rows.forEach(r => r.tasks.push({ text:'', done:false }));
  dlSave();
  dlRender();
}

// ── Delete task column ────────────────────────
function dlDeleteCol(ci) {
  if (dlData.cols.length <= 1) { toast('Need at least 1 column'); return; }
  if (!confirm(`Delete column "${dlData.cols[ci]}"?`)) return;
  dlData.cols.splice(ci, 1);
  dlData.rows.forEach(r => r.tasks.splice(ci, 1));
  dlSave();
  dlRender();
}

// ── Rename column ─────────────────────────────
function dlRenameCol(ci, val) {
  dlData.cols[ci] = val.trim() || `Task ${ci+1}`;
  dlSave();
}

// ── Update task text ──────────────────────────
function dlUpdateTask(ri, ci, val) {
  if (!dlData.rows[ri]) return;
  if (!dlData.rows[ri].tasks[ci]) dlData.rows[ri].tasks[ci] = { text:'', done:false };
  dlData.rows[ri].tasks[ci].text = val;
}

// ── Toggle task done ──────────────────────────
function dlToggleTask(ri, ci, done) {
  if (!dlData.rows[ri]) return;
  if (!dlData.rows[ri].tasks[ci]) dlData.rows[ri].tasks[ci] = { text:'', done:false };
  dlData.rows[ri].tasks[ci].done = done;
  dlSave();
}

// ── Download ALL as CSV ───────────────────────
function dlDownload() {
  if (!dlData.rows.length) { toast('No data to download'); return; }
  const headers = ['Date', ...dlData.cols];
  const rows = dlData.rows.map(row => [
    row.dateLabel,
    ...dlData.cols.map((_, ci) => {
      const t = row.tasks[ci] || { text:'', done:false };
      return t.done ? `[✓] ${t.text}` : t.text;
    })
  ]);
  const csv = [headers, ...rows]
    .map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type:'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `daily-log-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Downloaded ✓');
}

// ── Download single row ───────────────────────
function dlDownloadRow(id) {
  const row = dlData.rows.find(r => r.id === id);
  if (!row) return;
  const headers = ['Date', ...dlData.cols];
  const data = [
    row.dateLabel,
    ...dlData.cols.map((_, ci) => {
      const t = row.tasks[ci] || { text:'', done:false };
      return t.done ? `[✓] ${t.text}` : t.text;
    })
  ];
  const csv = [headers, data]
    .map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type:'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `log-${row.dateLabel.replace(/\s+/g,'-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Row downloaded ✓');
}

// ── Init when view opens ──────────────────────
const _origSwitchViewDL = switchView;
switchView = function(name) {
  _origSwitchViewDL(name);
  if (name === 'dailylog') setTimeout(dlRender, 50);
};
