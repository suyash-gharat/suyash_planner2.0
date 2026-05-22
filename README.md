# 🗂️ WorkLife Planner Pro

A full-featured, Notion-style life planner — tasks, habits, goals, journal, finance, health, notes, and analytics. Runs entirely in your browser. No backend. No login. 100% private.

---

## ✨ What's included

| Module | Features |
|---|---|
| **Dashboard** | Real-time overview of all modules, KPI cards, quick add |
| **Today** | Daily task checklist with progress bar and filters |
| **Tasks** | Complete task manager with categories and priorities |
| **Habits** | Habit tracker with streaks and weekly heatmap |
| **Goals** | Goal cards with progress tracking and target dates |
| **Journal** | Daily journal with mood tracker and tags |
| **Finance** | Expense tracker with budget and category breakdown |
| **Health** | Water intake, steps, sleep log, workout log |
| **Notes** | Sticky-note style notepad |
| **Analytics** | Charts and life score across all areas |

---

## 🚀 HOW TO UPLOAD TO GITHUB & GO LIVE (step by step)

### Step 1 — Create a GitHub account
Go to **https://github.com** and sign up (free). Remember your username.

### Step 2 — Create a new repository
1. Click the **+** icon (top right) → **New repository**
2. Repository name: `life-planner` (or anything you like)
3. Set visibility to **Public** ← important for free hosting
4. Do NOT check "Add README" (we already have files)
5. Click **Create repository**

### Step 3 — Upload your files
You'll see an empty repo page. Look for:
**"uploading an existing file"** link — click it.

Then drag and drop ALL 4 files at once:
- `index.html`
- `style.css`
- `app.js`
- `README.md`

Scroll down → click **Commit changes**

### Step 4 — Enable GitHub Pages
1. Go to your repo → click **Settings** tab
2. Scroll down to **Pages** (left sidebar)
3. Under **Source**: select **Deploy from a branch**
4. Branch: **main** | Folder: **/ (root)**
5. Click **Save**

### Step 5 — Get your live URL
Wait ~60 seconds, then refresh the Settings → Pages page.
Your app is live at:
```
https://YOUR-GITHUB-USERNAME.github.io/life-planner/
```

**Bookmark this URL** — open it every morning when you arrive at the office!

---

## 📱 Add to your phone home screen

**Android (Chrome):** Open the URL → Menu (⋮) → "Add to Home screen"
**iPhone (Safari):** Open the URL → Share → "Add to Home Screen"

It will feel like a native app!

---

## 🔒 Your data is 100% private

All data is saved in your browser's `localStorage`. Nothing is sent to any server.
Use the **Export** button (top right of Dashboard) to download a JSON backup anytime.

---

## 🛠️ Customise your default tasks

Open `app.js` and edit the `getDefaultTasks()` function at the top:

```js
function getDefaultTasks() {
  const today = todayStr();
  return [
    { id:1, name:'Your custom task here', cat:'work', pri:'high', done:false, date:today, notes:'' },
    // add more...
  ];
}
```

Categories: `work` · `personal` · `health` · `admin` · `team` · `learning`
Priorities: `high` · `med` · `low`

---

## 🔄 Updating the app later

1. Edit a file on your computer
2. Go to your GitHub repo
3. Click the file name → click the ✏️ pencil icon → paste new content → Commit
   OR drag the new file to re-upload and it will replace the old one.

GitHub Pages updates within ~1 minute.

---

Made with ❤️ for productive people.
