# 🗂️ WorkLife Planner Pro — Navy Edition

A professional Notion-style life + office planner with a **Weekly Task Grid** (just like your Notion Daily Task table), navy blue & white theme.

## ✨ Key Features

### 📅 Weekly Grid (NEW — matches your Notion layout)
- **Daily tasks** — same tasks shown every day (Mon–Sun) with checkboxes
- **Weekly tasks** — tasks assigned to specific days only
- Navigate weeks (Prev / Today / Next)
- Day-by-day completion summary at the bottom
- Pre-loaded with your real tasks: techalphawaba count, SRPL_Group, Angelone sheets etc.

### All modules
| Module | Features |
|---|---|
| Dashboard | KPIs, weekly mini-grid, habits, goals, finance overview |
| Weekly Grid | Notion-style table with daily + weekly task rows |
| Today | Filtered daily checklist with progress bar |
| Tasks | Full task manager |
| Habits | Streaks + weekly heatmap |
| Goals | Progress tracking |
| Journal | Mood + tags + history |
| Finance | Budget + expense log |
| Health | Water, steps, sleep, workouts |
| Notes | Sticky notes |
| Analytics | Charts + Life Score |

---

## 🚀 Upload to GitHub Pages (from Step 5)

You already did Steps 1–4! Now:

**Step 5** — After clicking Save in Pages settings, wait 60 seconds then refresh.

Your live URL:
```
https://YOUR-USERNAME.github.io/life-planner/
```

Bookmark it and open every morning when you arrive at office.

---

## 🛠️ Add your own recurring tasks to the Weekly Grid

Open `app.js`, find `function defaultFixedTasks()` and add rows:

```js
{id:111, name:'Your task name', cat:'work', type:'daily', days:[]},
// OR for specific days (0=Mon, 1=Tue, ... 6=Sun):
{id:112, name:'Weekly review', cat:'admin', type:'weekly', days:[4]}, // Every Friday
```

---
Made for productive office days. 🚀
