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
      if(!show) return `<td class="check-cell${isToday?' today-check':''}"><span style="color:#e2e8f0;font-size:11px">—</span></td>`;
      return `<td class="check-cell${isToday?' today-check':''}" onclick="toggleGrid(${row.id},'${ds}')">
        <div class="grid-chk${checked?' checked':''}" id="gc_${row.id}_${ds.replace(/-/g,'_')}">
          <i class="ti ti-check"></i>
        </div>
      </td>`;
    }).join('');
    const catColor={work:'#dbeafe',personal:'#fef3c7',health:'#dcfce7',admin:'#e0e7ff',team:'#fce7f3'}[row.cat]||'#f1f5f9';
    const catTxt={work:'#1d4ed8',personal:'#b45309',health:'#15803d',admin:'#4338ca',team:'#be185d'}[row.cat]||'#475569';
    return `<tr>
      <td class="task-name-cell">
        <span class="row-icon">📋</span>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">
            <div style="font-size:13px;font-weight:600;color:#0f1f4b;line-height:1.3">${esc(row.name)}</div>
            <span style="font-size:10px;padding:1px 7px;border-radius:6px;font-weight:700;background:${catColor};color:${catTxt};white-space:nowrap;flex-shrink:0">${row.cat}</span>
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
const CAT_C={work:'#1d4ed8',personal:'#b45309',health:'#15803d',admin:'#4338ca',team:'#be185d',learning:'#0f766e'};

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
        <span style="font-size:11px;color:#94a3b8">Progress:</span>
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
      <div class="je-meta"><span>${fmtDate(j.date)}</span><span>${moodE[j.mood]||''}</span>${j.tags.map(t=>`<span style="color:#1d4ed8;font-size:10px;font-weight:600">#${esc(t)}</span>`).join('')}</div>
      <div class="je-preview">${esc(j.body||'')}</div>
    </div>`).join('')
    :`<div class="empty-st"><i class="ti ti-notebook"></i>No entries yet.</div>`;
}

// ===== FINANCE =====
const EXP_C={food:'#16a34a',transport:'#0284c7',shopping:'#d97706',bills:'#dc2626',health:'#0d9488',other:'#7c3aed'};
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
    const bg=EXP_C[e.cat]||'#64748b';
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
  const sh=document.getElementById('sleep-hist');if(sh)sh.innerHTML=(health.sleep||[]).slice(-5).reverse().map(s=>`<div class="sl-item"><span>${fmtDate(s.date)}</span><span>${s.bed}→${s.wake}</span><span style="font-weight:600;color:#0f1f4b">${s.hours}h</span></div>`).join('');
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
  bars('ana-cat',Object.entries(cats).map(([k,v])=>({label:CAT_L[k]||k,val:v.done,total:v.total,color:CAT_C[k]||'#1d4ed8'})));
  // Pri bars
  const pris={high:{label:'High',total:0,done:0},med:{label:'Medium',total:0,done:0},low:{label:'Low',total:0,done:0}};
  tasks.forEach(t=>{if(pris[t.pri]){pris[t.pri].total++;if(t.done)pris[t.pri].done++;}});
  bars('ana-pri',Object.entries(pris).map(([k,v])=>({label:v.label,val:v.done,total:v.total,color:k==='high'?'#dc2626':k==='med'?'#d97706':'#16a34a'})));
  // Habits
  const hel=document.getElementById('ana-hab');
  if(hel)hel.innerHTML=habits.length?habits.map(h=>{const p=h.target?Math.round(h.weekLog.length/h.target*100):0;return `<div class="ana-bar-row"><span class="ana-lbl">${h.icon} ${esc(h.name)}</span><div class="ana-track"><div class="ana-fill" style="width:${p}%;background:#0f1f4b"></div></div><span class="ana-val">${h.weekLog.length}/${h.target}</span></div>`}).join(''):`<div class="empty-st" style="padding:12px">No habits.</div>`;
  // Finance
  const finCats={};expenses.forEach(e=>{finCats[e.cat]=(finCats[e.cat]||0)+e.amt;});
  const finMax=Math.max(...Object.values(finCats),1);
  const fel=document.getElementById('ana-fin');
  if(fel)fel.innerHTML=Object.keys(finCats).length?Object.entries(finCats).map(([cat,amt])=>`<div class="ana-bar-row"><span class="ana-lbl">${cat}</span><div class="ana-track"><div class="ana-fill" style="width:${Math.round(amt/finMax*100)}%;background:${EXP_C[cat]||'#0f1f4b'}"></div></div><span class="ana-val">${fmtAmt(amt)}</span></div>`).join(''):`<div class="empty-st" style="padding:12px">No expenses.</div>`;
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
      <tr>${DAY_SHORT.map((d,i)=>{const ds=dates[i].toISOString().slice(0,10);return `<th style="padding:4px 6px;text-align:center;color:${ds===todayS?'#0284c7':'#64748b'};font-weight:700">${d}</th>`}).join('')}</tr>
      <tr>${dates.map((d,i)=>{
        const ds=d.toISOString().slice(0,10);
        const done=daily.filter(ft=>gridChecks[`${ft.id}_${ds}`]).length;
        const pct=daily.length?Math.round(done/daily.length*100):0;
        const isToday=ds===todayS;
        return `<td style="padding:6px 4px;text-align:center"><div style="font-size:14px;font-weight:700;color:${isToday?'#0f1f4b':'#64748b'}">${done}</div><div style="font-size:10px;color:#94a3b8">${pct}%</div></td>`;
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
      <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600;color:#0f1f4b;margin-bottom:4px"><span>${esc(g.title)}</span><span style="color:#94a3b8">${g.progress}%</span></div>
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
  document.getElementById('sb-greeting').textContent=g;
  document.getElementById('greeting').textContent=g;
  const ds=new Date().toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  document.getElementById('sb-date').textContent=ds;
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
