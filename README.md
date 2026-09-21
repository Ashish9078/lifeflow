# ⚡ LifeFlow — Student Life Operating System

<div align="center">

![LifeFlow Banner](icon.svg)

### All-in-one productivity, attendance, finance, and academic tracking dashboard for university students.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-emerald.svg)](manifest.json)
[![Status: Production](https://img.shields.io/badge/Status-Production%20Ready-success.svg)](#)
[![JavaScript: Vanilla](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)](#)
[![TailwindCSS: 3.x](https://img.shields.io/badge/TailwindCSS-v3-38bdf8.svg)](#)

[Features](#-key-features) • [Quick Start](#-quick-start) • [Deployment](#-deployment) • [Architecture](#-project-architecture) • [Security & Privacy](#-data-privacy--multi-account-isolation)

</div>

---

## 📖 Overview

**LifeFlow** is a comprehensive, client-side web application and Progressive Web App (PWA) designed to solve the chaotic daily scheduling, academic tracking, and financial budgeting challenges faced by university students.

Built entirely with pure HTML5, vanilla JavaScript (ES6+), and responsive Tailwind CSS, LifeFlow offers zero-latency performance, offline-first capabilities, and privacy-first multi-user local storage isolation.

---

## ✨ Key Features

### 🎓 1. Class Attendance & Safe Bunk Calculator
- Track subject-by-subject attendance percentages in real-time.
- **Dynamic Bunk Intelligence**: Calculates exactly how many classes you can safely skip while staying above your minimum threshold (e.g. 75%), or how many consecutive classes you must attend to recover.
- **Academic PDF Transcript**: One-click download of an official formatted attendance report card (`.pdf`) or spreadsheet export (`.csv`).

### 📊 2. Semester SGPA & CGPA Degree Calculator
- 10-point university grading scale support ($O=10, A+=9, A=8, B+=7, B=6, C=5, P=4, F=0$).
- Live weighted SGPA projection based on course credit hours.
- Degree Cumulative CGPA tracker across past semesters.
- **Target CGPA Goal Planner**: Calculates the required SGPA needed in upcoming semesters to graduate with your target honors grade.

### 💰 3. Finances, Pocket Money & Budgeting
- Visual expense and income tracking categorized by Food, Books, Rent, Travel, etc.
- Real-time monthly spending vs. budget gauges with visual alerts.
- Cashflow analytics and net savings calculations.

### 🤝 4. Friends Lending & Udhar Manager
- Track money lent to friends or borrowed from classmates.
- One-click WhatsApp settlement reminders with pre-filled messages.
- Settlement status tracking and balance breakdown.

### ⏱️ 5. Pomodoro Study Hub & Time OS
- Customizable Pomodoro focus timer with audible bell notifications.
- Study session logs categorized by subject and topic.
- Daily Circadian Rhythm and Day Elapsed progress visualization.

### ⚡ 6. Daily Habit Routines & Streak Multiplier
- Structured morning, afternoon, evening, and night habit checklists.
- Habit streak counter with consistency tracking and motivational nudges.

### 🎯 7. Goals & Quarterly Milestones
- Long-term academic, career, and personal milestone roadmap.
- Progress bars, due dates, and milestone completion status.

### 🏆 8. Weekly Performance Recap & Achievement Badges
- Weekly composite productivity scorecard grading ($A+, A, B, C$).
- 8 unlockable milestone achievement badges (e.g. *Attendance Champion*, *Safe Zone Master*, *Budget Ninja*, *Data Vault Master*).

### 💾 9. 1-Click Full Backup & Restore
- Export entire application state into a single encrypted JSON snapshot file.
- Non-destructive merge or complete restore options.
- Protected factory reset mechanism.

### 📱 10. Native Mobile PWA & 1-Thumb Bottom Dock
- Installable on iOS (Safari) and Android (Chrome) as a standalone native app without browser URL bars.
- Ergonomic bottom navigation dock with a quick-action `+` floating trigger and slide-up drawer for one-handed mobile use.

---

## 🔐 Data Privacy & Multi-Account Isolation

- **Zero Server Snooping**: All personal data is encrypted and saved directly in your browser's local storage.
- **User-Scoped Architecture**: Each registered user account is completely isolated under unique user namespaces (`key_userId`).
- **Clean Slate for New Users**: Registering a new account gives you a 100% clean dashboard (zero courses, zero expenses, clean routine).
- **Persistent Sessions**: Logging out and logging back in fully restores all your data without loss.
- **Isolated Demo Mode**: Log in with `demo@lifeflow.app` (Password: `demo123`) to explore the app with rich sample mock data without altering real accounts.

---

## 🚀 Quick Start

### Running Locally

LifeFlow is 100% static and requires no build tools or package managers.

```bash
# Clone the repository
git clone https://github.com/<your-username>/lifeflow.git

# Navigate into the project folder
cd lifeflow

# Start a lightweight local server (Python 3)
python3 -m http.server 8080
```

Open your browser and navigate to:
```
http://localhost:8080
```

---

## 🌐 Deployment

### 1. Deploying to GitHub Pages (Automatic)
This repository includes a preconfigured GitHub Actions workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

1. Push this repository to GitHub:
   ```bash
   git remote add origin https://github.com/<your-username>/lifeflow.git
   git branch -M main
   git push -u origin main
   ```
2. In your GitHub repository, go to **Settings** > **Pages**.
3. Under **Build and deployment** > **Source**, select **GitHub Actions**.
4. Your site will automatically build and deploy to:
   `https://<your-username>.github.io/lifeflow/`

### 2. Deploying to Netlify
1. Go to [app.netlify.com/drop](https://app.netlify.com/drop).
2. Drag and drop this project folder or the repository.
3. Your site is instantly live with a free custom SSL domain!

### 3. Deploying to Vercel
1. Go to [vercel.com](https://vercel.com) > **Add New Project**.
2. Select this GitHub repository and click **Deploy**.

---

## 📁 Project Architecture

```
lifeflow/
├── index.html              # Core application structure & modals
├── app.js                  # UI controllers, rendering logic, navigation & PWA
├── data.js                 # Data layer, authentication, calculations & local storage
├── styles.css              # Custom styling, animations, mobile layout & dark mode
├── manifest.json           # PWA metadata for native mobile installation
├── sw.js                   # Service worker for offline caching
├── icon.svg                # Vector app icon
├── .gitignore              # Git ignore rules
├── LICENSE                 # MIT License
└── .github/
    └── workflows/
        └── deploy.yml      # GitHub Actions automatic deployment workflow
```

---

## 🛠️ Built With

- **HTML5 & CSS3** — Semantic layout with responsive flexbox and grid layouts.
- **Vanilla JavaScript (ES6+)** — Modern async/await architecture with zero heavy framework bloat.
- **Tailwind CSS (CDN)** — Utility-first styling with custom dark-mode support.
- **Lucide Icons** — Clean, modern vector iconography.
- **html2pdf.js** — Client-side academic PDF generation.
- **Canvas Confetti** — Delightful gamified reward micro-interactions.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
