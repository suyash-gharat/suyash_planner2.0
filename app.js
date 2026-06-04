// Global Application State
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let habits = JSON.parse(localStorage.getItem('habits')) || [];
let dailyLogs = JSON.parse(localStorage.getItem('dailyLogs')) || [];
let activeTab = 'dashboard';
let currentDate = new Date();

// Theme Configuration
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
updateThemeIcons(savedTheme);

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Render Cycles
    renderDashboard();
    renderTasksList();
    renderHabitsList();
    renderLogTable();
    updateUIForActiveTab();
    
    // 2. Setup Event Handlers
    setupEventListeners();
    setupProfileHandlers();
    
    // 3. Set Current Date Display
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = new Date().toLocaleDateString('en-US', dateOptions);
    const dateEl = document.getElementById('current-date-display');
    if (dateEl) dateEl.textContent = dateString;
});

// App Layout & Tab Navigation Engine
function setupEventListeners() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const clickedItem = e.currentTarget;
            const tabId = clickedItem.getAttribute('data-tab');
            
            if (tabId) {
                navItems.forEach(n => n.classList.remove('active'));
                clickedItem.classList.add('active');
                activeTab = tabId;
                updateUIForActiveTab();
            }
        });
    });

    // Theme Toggle Listening System
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'theme-light';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcons(newTheme);
        });
    }

    // Task Creation Event Form Submissions
    const quickTaskForm = document.getElementById('quick-task-form');
    if (quickTaskForm) {
        quickTaskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('quick-task-input');
            const text = input.value.trim();
            if (!text) return;

            const newTask = {
                id: 'task_' + Date.now(),
                text: text,
                completed: false,
                date: new Date().toISOString().split('T')[0],
                priority: 'medium',
                category: 'work'
            };

            tasks.push(newTask);
            localStorage.setItem('tasks', JSON.stringify(tasks));
            input.value = '';
            
            renderDashboard();
            renderTasksList();
            renderLogTable();
        });
    }

    // Modal Operations for Task Generation
    const openTaskModalBtn = document.getElementById('open-task-modal-btn');
    const closeTaskModalBtn = document.getElementById('close-task-modal-btn');
    const taskModal = document.getElementById('task-modal');
    const modalTaskForm = document.getElementById('modal-task-form');

    if (openTaskModalBtn && taskModal) {
        openTaskModalBtn.addEventListener('click', () => taskModal.classList.add('active'));
    }
    if (closeTaskModalBtn && taskModal) {
        closeTaskModalBtn.addEventListener('click', () => taskModal.classList.remove('active'));
    }
    if (taskModal) {
        taskModal.addEventListener('click', (e) => {
            if (e.target === taskModal) taskModal.classList.remove('active');
        });
    }

    if (modalTaskForm && taskModal) {
        modalTaskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = document.getElementById('modal-task-text').value.trim();
            const date = document.getElementById('modal-task-date').value || new Date().toISOString().split('T')[0];
            const priority = document.getElementById('modal-task-priority').value;
            const category = document.getElementById('modal-task-category').value;

            if (!text) return;

            const newTask = {
                id: 'task_' + Date.now(),
                text,
                completed: false,
                date,
                priority,
                category
            };

            tasks.push(newTask);
            localStorage.setItem('tasks', JSON.stringify(tasks));
            modalTaskForm.reset();
            taskModal.classList.remove('active');

            renderDashboard();
            renderTasksList();
            renderLogTable();
        });
    }

    // Habit Modal Operations
    const openHabitModalBtn = document.getElementById('open-habit-modal-btn');
    const closeHabitModalBtn = document.getElementById('close-habit-modal-btn');
    const habitModal = document.getElementById('habit-modal');
    const modalHabitForm = document.getElementById('modal-habit-form');

    if (openHabitModalBtn && habitModal) {
        openHabitModalBtn.addEventListener('click', () => habitModal.classList.add('active'));
    }
    if (closeHabitModalBtn && habitModal) {
        closeHabitModalBtn.addEventListener('click', () => habitModal.classList.remove('active'));
    }

    if (modalHabitForm && habitModal) {
        modalHabitForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('modal-habit-name').value.trim();
            const frequency = document.getElementById('modal-habit-frequency').value;
            const color = document.getElementById('modal-habit-color').value;

            if (!name) return;

            const newHabit = {
                id: 'habit_' + Date.now(),
                name,
                frequency,
                color,
                streak: 0,
                history: {} // Tracking records by dynamic date keys
            };

            habits.push(newHabit);
            localStorage.setItem('habits', JSON.stringify(habits));
            modalHabitForm.reset();
            habitModal.classList.remove('active');

            renderDashboard();
            renderHabitsList();
        });
    }

    // Daily Task Log Controls
    const addTodayLogBtn = document.getElementById('add-today-log-btn');
    if (addTodayLogBtn) {
        addTodayLogBtn.addEventListener('click', () => {
            const todayStr = getLocalDateString(new Date());
            const logsExist = dailyLogs.some(l => l.date === todayStr);
            if (!logsExist) {
                dailyLogs.unshift({
                    id: 'log_' + Date.now(),
                    date: todayStr,
                    tasks: ['', '', '', '']
                });
                localStorage.setItem('dailyLogs', JSON.stringify(dailyLogs));
                renderLogTable();
            } else {
                alert('Today\'s entry already exists in the log list!');
            }
        });
    }

    const logPickDateInput = document.getElementById('log-pick-date');
    if (logPickDateInput) {
        logPickDateInput.addEventListener('change', (e) => {
            const chosenVal = e.target.value;
            if (!chosenVal) return;
            const customDateStr = getLocalDateString(new Date(chosenVal));
            const logsExist = dailyLogs.some(l => l.date === customDateStr);
            if (!logsExist) {
                dailyLogs.unshift({
                    id: 'log_' + Date.now(),
                    date: customDateStr,
                    tasks: ['', '', '', '']
                });
                localStorage.setItem('dailyLogs', JSON.stringify(dailyLogs));
                renderLogTable();
            }
            e.target.value = '';
        });
    }

    const exportLogCsvBtn = document.getElementById('export-log-csv-btn');
    if (exportLogCsvBtn) {
        exportLogCsvBtn.addEventListener('click', () => {
            if (dailyLogs.length === 0) {
                alert('No logged entries available to export to CSV.');
                return;
            }
            let csvContent = "data:text/csv;charset=utf-8,Date,Task 1,Task 2,Task 3,Task 4\n";
            dailyLogs.forEach(row => {
                const escapedTasks = row.tasks.map(t => `"${t.replace(/"/g, '""')}"`);
                csvContent += `${row.date},${escapedTasks.join(',')}\n`;
            });
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `daily_task_logs_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }
}

function updateThemeIcons(theme) {
    const sunIcon = document.getElementById('theme-sun-icon');
    const moonIcon = document.getElementById('theme-moon-icon');
    if (!sunIcon || !moonIcon) return;
    if (theme === 'light' || theme === 'theme-light') {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
    } else {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
    }
}

function updateUIForActiveTab() {
    const viewSections = document.querySelectorAll('.view-section');
    viewSections.forEach(sec => sec.classList.remove('active'));

    const targetSec = document.getElementById(`${activeTab}-view`);
    if (targetSec) targetSec.classList.add('active');
}

function getLocalDateString(dateObj) {
    const d = new Date(dateObj);
    const day = d.getDate();
    const year = d.getFullYear();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthStr = months[d.getMonth()];
    
    let suffix = 'th';
    if (day === 1 || day === 21 || day === 31) suffix = 'st';
    else if (day === 2 || day === 22) suffix = 'nd';
    else if (day === 3 || day === 23) suffix = 'rd';

    return `${day}${suffix} ${monthStr} ${year}`;
}

// Profile Customizer Management
function setupProfileHandlers() {
    const editNameBtn = document.getElementById('edit-profile-name-btn');
    const profileNameDisplay = document.getElementById('profile-name-display');
    const sidebarAvatarContainer = document.getElementById('sidebar-avatar-container');
    const avatarUploadInput = document.getElementById('avatar-upload-input');
    const profileAvatarImg = document.getElementById('profile-avatar-img');

    const cachedName = localStorage.getItem('profileName') || 'Suyash Mahesh Ghadyalji';
    if (profileNameDisplay) profileNameDisplay.textContent = cachedName;

    const cachedAvatar = localStorage.getItem('profileAvatar');
    if (cachedAvatar && profileAvatarImg) profileAvatarImg.src = cachedAvatar;

    if (editNameBtn && profileNameDisplay) {
        editNameBtn.addEventListener('click', () => {
            const current = profileNameDisplay.textContent;
            const nextName = prompt("Update your account profile name:", current);
            if (nextName && nextName.trim() !== "") {
                const standardized = nextName.trim();
                profileNameDisplay.textContent = standardized;
                localStorage.setItem('profileName', standardized);
            }
        });
    }

    if (sidebarAvatarContainer && avatarUploadInput) {
        sidebarAvatarContainer.addEventListener('click', () => avatarUploadInput.click());
    }

    if (avatarUploadInput && profileAvatarImg) {
        avatarUploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64Data = reader.result;
                profileAvatarImg.src = base64Data;
                localStorage.setItem('profileAvatar', base64Data);
            };
            reader.readAsDataURL(file);
        });
    }
}

// Render Dashboard Data Summary
function renderDashboard() {
    const totalTasksCount = tasks.length;
    const completedTasksCount = tasks.filter(t => t.completed).length;
    const taskPercent = totalTasksCount === 0 ? 0 : Math.round((completedTasksCount / totalTasksCount) * 100);

    const activeHabitsCount = habits.length;
    let completedHabitsCount = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    habits.forEach(h => {
        if (h.history && h.history[todayStr]) completedHabitsCount++;
    });
    const habitPercent = activeHabitsCount === 0 ? 0 : Math.round((completedHabitsCount / activeHabitsCount) * 100);

    const overallProgress = totalTasksCount === 0 && activeHabitsCount === 0 
        ? 0 
        : Math.round((taskPercent + habitPercent) / 2);

    // Dom Injections
    const dashProgressText = document.getElementById('dashboard-progress-text');
    if (dashProgressText) dashProgressText.textContent = `${overallProgress}%`;

    const circularProgress = document.getElementById('circular-progress-svg');
    if (circularProgress) {
        const circle = circularProgress.querySelector('.circle-progress');
        if (circle) {
            const circumference = 2 * Math.PI * 40; 
            const offset = circumference - (overallProgress / 100) * circumference;
            circle.style.strokeDashoffset = offset;
        }
    }

    const statTotalTasks = document.getElementById('stat-total-tasks');
    if (statTotalTasks) statTotalTasks.textContent = totalTasksCount;
    const statDoneTasks = document.getElementById('stat-done-tasks');
    if (statDoneTasks) statDoneTasks.textContent = completedTasksCount;
    const statTaskRate = document.getElementById('stat-task-rate');
    if (statTaskRate) statTaskRate.textContent = `${taskPercent}%`;

    const statActiveHabits = document.getElementById('stat-active-habits');
    if (statActiveHabits) statActiveHabits.textContent = activeHabitsCount;
    const statDoneHabits = document.getElementById('stat-done-habits');
    if (statDoneHabits) statDoneHabits.textContent = completedHabitsCount;
    const statHabitRate = document.getElementById('stat-habit-rate');
    if (statHabitRate) statHabitRate.textContent = `${habitPercent}%`;

    // Render Recent Checklist on Dashboard
    const recContainer = document.getElementById('recent-tasks-container');
    if (recContainer) {
        if (tasks.length === 0) {
            recContainer.innerHTML = `<div class="empty-state">No scheduled operational tasks tracked yet.</div>`;
        } else {
            recContainer.innerHTML = '';
            const copy = [...tasks].reverse().slice(0, 4);
            copy.forEach(t => {
                const item = document.createElement('div');
                item.className = `task-item priority-${t.priority || 'medium'}`;
                if (t.completed) item.classList.add('completed');

                item.innerHTML = `
                    <div class="task-item-left">
                        <input type="checkbox" class="task-checkbox" ${t.completed ? 'checked' : ''}>
                        <span class="task-text-span">${escapeHtml(t.text)}</span>
                    </div>
                `;

                const box = item.querySelector('.task-checkbox');
                box.addEventListener('change', () => {
                    t.completed = box.checked;
                    localStorage.setItem('tasks', JSON.stringify(tasks));
                    renderDashboard();
                    renderTasksList();
                    renderLogTable();
                });

                recContainer.appendChild(item);
            });
        }
    }
}

// Render Master Operational Task Sheet
function renderTasksList() {
    const listContainer = document.getElementById('master-tasks-list-container');
    if (!listContainer) return;

    if (tasks.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state">
                <p>Your task manager is empty.</p>
                <button class="btn btn-primary" id="empty-state-add-task-btn" style="margin-top: 1rem; padding: 0.5rem 1rem;">Create Task Record</button>
            </div>
        `;
        const innerBtn = document.getElementById('empty-state-add-task-btn');
        if (innerBtn) {
            innerBtn.addEventListener('click', () => {
                const modal = document.getElementById('task-modal');
                if (modal) modal.classList.add('active');
            });
        }
        return;
    }

    listContainer.innerHTML = '';
    const sortedTasks = [...tasks].sort((a, b) => b.id.localeCompare(a.id));

    sortedTasks.forEach(t => {
        const row = document.createElement('div');
        row.className = `task-item priority-${t.priority || 'medium'}`;
        if (t.completed) row.classList.add('completed');

        row.innerHTML = `
            <div class="task-item-left">
                <input type="checkbox" class="task-checkbox" ${t.completed ? 'checked' : ''}>
                <div class="task-details-wrapper">
                    <span class="task-text-span">${escapeHtml(t.text)}</span>
                    <div class="task-meta-tags">
                        <span class="meta-tag date-tag">📅 ${t.date || 'Today'}</span>
                        <span class="meta-tag category-tag">🏷️ ${t.category || 'General'}</span>
                        <span class="meta-tag priority-tag">${t.priority || 'medium'}</span>
                    </div>
                </div>
            </div>
            <button class="task-delete-btn" title="Remove Task Record">✕</button>
        `;

        const chk = row.querySelector('.task-checkbox');
        chk.addEventListener('change', () => {
            t.completed = chk.checked;
            localStorage.setItem('tasks', JSON.stringify(tasks));
            renderDashboard();
            renderTasksList();
            renderLogTable();
        });

        const del = row.querySelector('.task-delete-btn');
        del.addEventListener('click', () => {
            tasks = tasks.filter(item => item.id !== t.id);
            localStorage.setItem('tasks', JSON.stringify(tasks));
            renderDashboard();
            renderTasksList();
            renderLogTable();
        });

        listContainer.appendChild(row);
    });
}

// Render Habit Framework
function renderHabitsList() {
    const gridContainer = document.getElementById('habits-grid-container');
    if (!gridContainer) return;

    if (habits.length === 0) {
        gridContainer.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;">No habits tracked. Click "Add Habit" to build consistent routines!</div>`;
        return;
    }

    gridContainer.innerHTML = '';
    const todayStr = new Date().toISOString().split('T')[0];

    habits.forEach(h => {
        if (!h.history) h.history = {};
        const isDoneToday = !!h.history[todayStr];

        const card = document.createElement('div');
        card.className = 'habit-card';
        card.style.borderTop = `4px solid ${h.color || 'var(--accent-color)'}`;

        card.innerHTML = `
            <div class="habit-card-header">
                <h3 class="habit-title">${escapeHtml(h.name)}</h3>
                <span class="habit-freq-badge">${h.frequency || 'Daily'}</span>
            </div>
            <div class="habit-streak-counter">
                <span class="streak-num" style="color: ${h.color || 'var(--accent-color)'}">${h.streak || 0}</span>
                <span class="streak-label">day streak</span>
            </div>
            <div class="habit-actions">
                <button class="btn habit-check-btn ${isDoneToday ? 'completed' : ''}" style="background: ${isDoneToday ? 'var(--success-color)' : 'transparent'}; border-color: ${isDoneToday ? 'var(--success-color)' : 'var(--border-color)'}">
                    ${isDoneToday ? '✓ Completed Today' : 'Mark Complete'}
                </button>
                <button class="habit-delete-raw-btn" title="Remove Routine">✕</button>
            </div>
        `;

        const checkBtn = card.querySelector('.habit-check-btn');
        checkBtn.addEventListener('click', () => {
            if (h.history[todayStr]) {
                delete h.history[todayStr];
                h.streak = Math.max(0, (h.streak || 1) - 1);
            } else {
                h.history[todayStr] = true;
                h.streak = (h.streak || 0) + 1;
            }
            localStorage.setItem('habits', JSON.stringify(habits));
            renderDashboard();
            renderHabitsList();
        });

        const delRaw = card.querySelector('.habit-delete-raw-btn');
        delRaw.addEventListener('click', () => {
            if (confirm(`Are you sure you want to delete "${h.name}"?`)) {
                habits = habits.filter(item => item.id !== h.id);
                localStorage.setItem('habits', JSON.stringify(habits));
                renderDashboard();
                renderHabitsList();
            }
        });

        gridContainer.appendChild(card);
    });
}

// Render Daily Matrix Log Grid (Fixed Input Alignment)
function renderLogTable() {
    const tbody = document.getElementById('daily-log-table-body');
    if (!tbody) return;

    // Seed initial demo data values if array state is uninitialized
    if (dailyLogs.length === 0) {
        const today = new Date();
        const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
        const dayBefore = new Date(); dayBefore.setDate(today.getDate() - 3);

        dailyLogs = [
            { id: 'l1', date: getLocalDateString(today), tasks: ['', '', '', ''] },
            { id: 'l2', date: getLocalDateString(yesterday), tasks: ['SRPL Campaign done today', 'Helpdesk Article Bug finding', '', ''] },
            { id: 'l3', date: getLocalDateString(dayBefore), tasks: ['', '', '', ''] }
        ];
        localStorage.setItem('dailyLogs', JSON.stringify(dailyLogs));
    }

    // Refresh KPI Counter Modules
    updateLogStats();

    tbody.innerHTML = '';
    const currentTodayStr = getLocalDateString(new Date());

    dailyLogs.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        
        // Date Cell Structure Setup
        let dateCellMarkup = `<td><span class="log-date-txt">${row.date}</span>`;
        if (row.date === currentTodayStr) {
            dateCellMarkup += `<span class="badge badge-today" style="margin-left:8px; font-size:10px; padding:2px 6px;">TODAY</span>`;
        }
        dateCellMarkup += `</td>`;

        let tasksMarkup = '';
        for (let i = 0; i < 4; i++) {
            const txtVal = row.tasks[i] || '';
            const isCompleted = txtVal.startsWith('✅ ');
            const cleanTxt = isCompleted ? txtVal.replace('✅ ', '') : txtVal;

            tasksMarkup += `
                <td>
                    <div class="log-cell-container">
                        <input type="checkbox" class="log-cell-checkbox" ${isCompleted ? 'checked' : ''}>
                        <input type="text" class="log-cell-input ${isCompleted ? 'completed-text' : ''}" 
                               placeholder="Write task..." value="${escapeHtml(cleanTxt)}">
                    </div>
                </td>
            `;
        }

        // Action Column Append Clean Control
        const actionsMarkup = `
            <td style="text-align:center; width:60px;">
                <button class="log-row-del-btn" title="Delete Row entry" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer; font-size:14px;">✕</button>
            </td>
        `;

        tr.innerHTML = dateCellMarkup + tasksMarkup + actionsMarkup;

        // Dynamic Subsystem Input Binding listeners
        const inputs = tr.querySelectorAll('.log-cell-input');
        const checkboxes = tr.querySelectorAll('.log-cell-checkbox');

        inputs.forEach((inputEl, cellIdx) => {
            inputEl.addEventListener('change', () => {
                const currentCheckbox = checkboxes[cellIdx];
                let valueToSave = inputEl.value.trim();
                
                if (valueToSave && currentCheckbox.checked) {
                    valueToSave = '✅ ' + valueToSave;
                }
                
                row.tasks[cellIdx] = valueToSave;
                localStorage.setItem('dailyLogs', JSON.stringify(dailyLogs));
                updateLogStats();
            });
        });

        checkboxes.forEach((chkEl, cellIdx) => {
            chkEl.addEventListener('change', () => {
                const companionInput = inputs[cellIdx];
                let rawVal = companionInput.value.trim();
                
                if (chkEl.checked) {
                    companionInput.classList.add('completed-text');
                    if (rawVal && !rawVal.startsWith('✅ ')) {
                        row.tasks[cellIdx] = '✅ ' + rawVal;
                    }
                } else {
                    companionInput.classList.remove('completed-text');
                    row.tasks[cellIdx] = rawVal;
                }
                
                localStorage.setItem('dailyLogs', JSON.stringify(dailyLogs));
                updateLogStats();
            });
        });

        const rowDeleteBtn = tr.querySelector('.log-row-del-btn');
        rowDeleteBtn.addEventListener('click', () => {
            if (confirm(`Remove entire log entry for ${row.date}?`)) {
                dailyLogs.splice(rowIndex, 1);
                localStorage.setItem('dailyLogs', JSON.stringify(dailyLogs));
                renderLogTable();
            }
        });

        tbody.appendChild(tr);
    });
}

// Secondary calculation for KPI boxes inside operational framework
function updateLogStats() {
    const daysLogged = dailyLogs.length;
    let totalTasksCount = 0;
    let completedTasksCount = 0;

    dailyLogs.forEach(row => {
        row.tasks.forEach(t => {
            if (t && t.trim() !== '') {
                totalTasksCount++;
                if (t.startsWith('✅ ')) {
                    completedTasksCount++;
                }
            }
        });
    });

    const rate = totalTasksCount === 0 ? 0 : Math.round((completedTasksCount / totalTasksCount) * 100);

    const elDays = document.getElementById('log-stat-days');
    if (elDays) elDays.textContent = daysLogged;

    const elDone = document.getElementById('log-stat-done');
    if (elDone) elDone.textContent = completedTasksCount;

    const elTotal = document.getElementById('log-stat-total');
    if (elTotal) elTotal.textContent = totalTasksCount;

    const elRate = document.getElementById('log-stat-rate');
    if (elRate) elRate.textContent = `${rate}%`;

    const elStreak = document.getElementById('log-stat-streak');
    if (elStreak) elStreak.textContent = daysLogged > 0 ? Math.min(daysLogged, 5) : 0;
}

// XSS Sanitizer Helper Engine
function escapeHtml(str) {
    if (!str) return '';
    return str
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}
