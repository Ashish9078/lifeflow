// LifeFlow App — Main Application Logic with Auth

let currentPage = 'dashboard';
let pomodoroInterval = null;
let pomodoroSeconds = 25 * 60;
let pomodoroRunning = false;
let pomodoroMode = 'work';
let chartInstances = {};

// ========== THEME ==========
function initTheme() {
  const t = getTheme();
  if (t === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}
function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  setThemePref(isDark ? 'dark' : 'light');
  if (currentPage === 'study' || currentPage === 'dashboard') {
    setTimeout(() => renderPage(currentPage), 100);
  }
}
initTheme();


// Ensure legacy device-phone-mode is cleared
try {
  localStorage.removeItem('lifeflow_device_mode');
  if (typeof document !== 'undefined' && document.body) {
    document.body.classList.remove('device-phone-mode');
  }
} catch (e) {}



// ========== AUTH UI ==========

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(el => el.classList.remove('active'));
  document.querySelector(`[data-auth-tab="${tab}"]`)?.classList.add('active');
  
  document.querySelectorAll('.auth-form').forEach(el => el.classList.add('hidden'));
  document.getElementById(tab === 'login' ? 'login-form' : 'signup-form')?.classList.remove('hidden');
  
  // Clear errors
  hideAuthError('login');
  hideAuthError('signup');
}

function showAuthError(form, message) {
  const el = document.getElementById(`${form}-error`);
  if (el) {
    el.textContent = message;
    el.classList.remove('hidden');
    el.closest('form')?.classList.add('shake');
    setTimeout(() => el.closest('form')?.classList.remove('shake'), 400);
  }
}

function hideAuthError(form) {
  const el = document.getElementById(`${form}-error`);
  if (el) el.classList.add('hidden');
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  // Swap icon
  const icon = btn.querySelector('i');
  if (icon) {
    icon.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
    lucide.createIcons();
  }
}

async function handleLogin(e) {
  e.preventDefault();
  hideAuthError('login');

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    showAuthError('login', 'Please fill in all fields.');
    return;
  }

  // Show loading state
  const btn = e.target.querySelector('button[type="submit"]');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<svg class="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="30 70" /></svg> Logging in...';
  btn.disabled = true;

  const result = await loginUser(email, password);

  if (result.success) {
    transitionToApp();
  } else {
    btn.innerHTML = originalText;
    btn.disabled = false;
    showAuthError('login', result.error);
  }
}

async function handleSignup(e) {
  e.preventDefault();
  hideAuthError('signup');

  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const confirm = document.getElementById('signup-confirm').value;

  if (!name || !email || !password || !confirm) {
    showAuthError('signup', 'Please fill in all fields.');
    return;
  }

  if (name.length < 2) {
    showAuthError('signup', 'Name must be at least 2 characters.');
    return;
  }

  if (password.length < 6) {
    showAuthError('signup', 'Password must be at least 6 characters.');
    return;
  }

  if (password !== confirm) {
    showAuthError('signup', 'Passwords do not match.');
    return;
  }

  // Simple email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showAuthError('signup', 'Please enter a valid email address.');
    return;
  }

  // Show loading
  const btn = e.target.querySelector('button[type="submit"]');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<svg class="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="30 70" /></svg> Creating account...';
  btn.disabled = true;

  const result = await registerUser(name, email, password);

  if (result.success) {
    transitionToApp();
  } else {
    btn.innerHTML = originalText;
    btn.disabled = false;
    showAuthError('signup', result.error);
  }
}

async function handleDemoLogin() {
  await ensureDemoAccount();
  const result = await loginUser('demo@lifeflow.app', 'demo123');
  if (result.success) {
    transitionToApp();
  }
}

function handleLogout() {
  logoutUser();
  // Transition back to auth
  const app = document.getElementById('app');
  const auth = document.getElementById('auth-screen');

  app.classList.add('auth-exit');
  setTimeout(() => {
    app.classList.add('hidden');
    app.classList.remove('auth-exit');
    auth.classList.remove('hidden');
    auth.classList.add('page-enter');
    lucide.createIcons();
    showToast('Logged out successfully', 'info');
  }, 350);

  // Clear form fields
  const fields = ['login-email', 'login-password', 'signup-name', 'signup-email', 'signup-password', 'signup-confirm'];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

function transitionToApp() {
  const auth = document.getElementById('auth-screen');
  const app = document.getElementById('app');

  // Animate auth out
  auth.classList.add('auth-exit');
  
  setTimeout(() => {
    auth.classList.add('hidden');
    auth.classList.remove('auth-exit');
    app.classList.remove('hidden');
    app.classList.add('app-enter');
    
    // Update sidebar with user info
    updateSidebarUser();
    
    // Init app
    navigateTo('dashboard');
    lucide.createIcons();
    
    setTimeout(() => app.classList.remove('app-enter'), 500);
  }, 350);
}

function updateSidebarUser() {
  const user = getCurrentUser();
  if (!user) return;

  const avatar = document.getElementById('sidebar-avatar');
  const username = document.getElementById('sidebar-username');
  const emailEl = document.getElementById('sidebar-email');

  if (avatar) {
    const initials = user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    avatar.textContent = initials;
  }
  if (username) username.textContent = user.name;
  if (emailEl) emailEl.textContent = user.email;
}

function getUserFirstName() {
  const user = getCurrentUser();
  if (!user) return 'User';
  return user.name.split(' ')[0];
}

// ========== SIDEBAR ==========
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  sidebar.classList.toggle('-translate-x-full');
  overlay.classList.toggle('hidden');
}

// ========== NAVIGATION ==========
function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
  document.querySelector(`[data-nav="${page}"]`)?.classList.add('active');

  // Update mobile bottom dock active state
  document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
    const target = btn.getAttribute('data-mobile-nav');
    if (target === page) {
      btn.classList.add('text-accent', 'font-bold');
      btn.classList.remove('text-gray-500', 'dark:text-gray-400');
    } else if (target) {
      btn.classList.remove('text-accent', 'font-bold');
      btn.classList.add('text-gray-500', 'dark:text-gray-400');
    }
  });

  
  const titles = {
    dashboard: ['Dashboard', 'Overview of your day'],
    progress: ['Progress Hub', 'Section-by-section progress circles, completion rings & performance bars'],
    routine: ['Daily Routine', 'Track your daily habits'],
    study: ['Study Tracker', 'Log sessions & stay focused'],
    expense: ['Money & Cashflow', 'Track income, expenses & net savings'],
    goals: ['Goals & Plans', 'Plan your future'],
    udhar: ['Friends Lending & Debt', 'Track loans, split bills & settlements with friends'],
    attendance: ['Class Attendance Tracker', 'Track class presence, calculate bunk allowance & exam eligibility'],
    grades: ['Academic Grades & CGPA Calculator', 'Calculate semester SGPA, cumulative CGPA, and project target grades'],
    achievements: ['Weekly Performance Recap & Badges', 'Weekly progress scorecard and gamified milestone achievements']
  };
  document.getElementById('page-title').textContent = titles[page]?.[0] || '';
  document.getElementById('page-subtitle').textContent = titles[page]?.[1] || '';
  const sidebar = document.getElementById('sidebar');
  if (!sidebar.classList.contains('-translate-x-full') && (window.innerWidth < 1024)) {
    toggleSidebar();
  }

  renderPage(page);
}

function renderPage(page) {
  const container = document.getElementById('page-content');
  Object.values(chartInstances).forEach(c => c.destroy());
  chartInstances = {};

  switch (page) {
    case 'dashboard': container.innerHTML = renderDashboard(); break;
    case 'progress': container.innerHTML = renderProgressHub(); break;
    case 'routine': container.innerHTML = renderRoutine(); break;
    case 'study': container.innerHTML = renderStudy(); break;
    case 'udhar': container.innerHTML = renderUdhar(); break;
    case 'attendance': container.innerHTML = renderAttendance(); break;
    case 'grades': container.innerHTML = renderGrades(); break;
    case 'achievements': container.innerHTML = renderAchievements(); break;
    case 'expense': container.innerHTML = renderExpense(); break;
    case 'goals': container.innerHTML = renderGoals(); break;
  }
  container.classList.remove('page-enter');
  void container.offsetWidth;
  container.classList.add('page-enter');

  lucide.createIcons();
  
  if (page === 'study' || page === 'dashboard') {
    setTimeout(initCharts, 50);
  }
}



// ========== PROGRESS HUB & SECTION COMPLETION SYSTEM ==========
let currentProgressFilter = 'all';

function setProgressFilter(filter) {
  currentProgressFilter = filter;
  renderPage('progress');
}

function renderProgressCircle(percent, size = 92, strokeWidth = 8, color = '#6366f1', label = '', centerSub = '') {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, Math.round(percent || 0)));
  const offset = circumference - (clamped / 100) * circumference;

  return `
    <div class="relative flex items-center justify-center shrink-0" style="width:${size}px; height:${size}px;">
      <svg width="${size}" height="${size}" class="transform -rotate-90">
        <circle cx="${size/2}" cy="${size/2}" r="${radius}" stroke="currentColor" stroke-width="${strokeWidth}" fill="transparent" class="text-gray-100 dark:text-surface-700/60" />
        <circle cx="${size/2}" cy="${size/2}" r="${radius}" stroke="${color}" stroke-width="${strokeWidth}" stroke-dasharray="${circumference.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}" stroke-linecap="round" fill="transparent" class="transition-all duration-700 ease-out" />
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
        <span class="font-black text-gray-900 dark:text-white leading-none tracking-tight" style="font-size:${size > 110 ? '1.5rem' : (size > 80 ? '1.15rem' : '0.85rem')}">${clamped}%</span>
        ${label ? `<span class="text-[9px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mt-0.5">${label}</span>` : ''}
        ${centerSub ? `<span class="text-[8px] text-gray-400 dark:text-gray-400 opacity-80 mt-0.5">${centerSub}</span>` : ''}
      </div>
    </div>
  `;
}

function renderProgressBar(percent, color = 'bg-accent', label = '', valueText = '', sublabel = '') {
  const clamped = Math.max(0, Math.min(100, Math.round(percent || 0)));
  return `
    <div class="space-y-1.5 w-full">
      <div class="flex items-center justify-between text-xs">
        <span class="font-semibold text-gray-700 dark:text-gray-200 truncate pr-2">${label}</span>
        <span class="font-bold text-gray-900 dark:text-white shrink-0">${valueText || (clamped + '%')}</span>
      </div>
      <div class="w-full h-2 bg-gray-100 dark:bg-surface-700/70 rounded-full overflow-hidden p-0.5 border border-gray-200/40 dark:border-surface-600/30">
        <div class="h-full rounded-full transition-all duration-700 ease-out ${color}" style="width:${clamped}%"></div>
      </div>
      ${sublabel ? `<div class="text-[10px] text-gray-400 dark:text-gray-400 leading-tight">${sublabel}</div>` : ''}
    </div>
  `;
}

function renderProgressHub() {
  const completion = getRoutineCompletion();
  const studyRoutinePct = getStudyRoutineCompletion();
  const studyHrs = parseFloat(getTodayStudyHours()) || 0;
  const budget = getBudget();
  const spent = getMonthlySpent();
  const remaining = budget - spent;
  const streak = getStreak();
  const lifeScoreObj = getLifeScore();
  const lifeScore = typeof lifeScoreObj === 'object' ? lifeScoreObj.score : lifeScoreObj;
  const lifeLabel = typeof lifeScoreObj === 'object' ? lifeScoreObj.label : 'Steady Flow';
  const lifeEmoji = typeof lifeScoreObj === 'object' ? lifeScoreObj.emoji : '⚡';
  const dayProgress = getDayProgress();

  const routine = getRoutine();
  const routineChecks = getTodayChecks();
  const studyRoutine = getStudyRoutine();
  const studyChecks = getTodayStudyChecks();
  const studySessions = getStudySessions();
  const expenses = getExpenses();
  const monthlyIncome = getMonthlyIncome();
  const netSavings = getNetSavings();
  const udharSummary = getUdharSummary();
  const udharRecords = getUdharRecords();
  const goals = getGoals();

  // 1. Routine Calculations
  const morningTasks = routine.filter(r => r.time === 'Morning');
  const afternoonTasks = routine.filter(r => r.time === 'Afternoon');
  const eveningTasks = routine.filter(r => r.time === 'Evening');
  const nightTasks = routine.filter(r => r.time === 'Night');

  const morningDone = morningTasks.filter(r => routineChecks[r.id]).length;
  const afternoonDone = afternoonTasks.filter(r => routineChecks[r.id]).length;
  const eveningDone = eveningTasks.filter(r => routineChecks[r.id]).length;
  const nightDone = nightTasks.filter(r => routineChecks[r.id]).length;

  const morningPct = morningTasks.length ? Math.round((morningDone / morningTasks.length) * 100) : 0;
  const afternoonPct = afternoonTasks.length ? Math.round((afternoonDone / afternoonTasks.length) * 100) : 0;
  const eveningPct = eveningTasks.length ? Math.round((eveningDone / eveningTasks.length) * 100) : 0;
  const nightPct = nightTasks.length ? Math.round((nightDone / nightTasks.length) * 100) : 0;
  const streakPct = Math.min(100, Math.round((streak / 30) * 100));

  // 2. Study Calculations
  const dailyStudyGoal = 4.0;
  const studyGoalPct = Math.min(100, Math.round((studyHrs / dailyStudyGoal) * 100));
  const slotsDone = studyRoutine.filter(s => studyChecks[s.id]).length;

  const subjectMins = {};
  studySessions.forEach(s => {
    subjectMins[s.subject] = (subjectMins[s.subject] || 0) + (s.duration || 0);
  });
  const topSubjects = Object.entries(subjectMins).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const maxSubjectMins = topSubjects.length && topSubjects[0][1] > 0 ? topSubjects[0][1] : 1;

  // 3. Finance Calculations
  const budgetUsedPct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const savingsRate = monthlyIncome > 0 ? Math.max(0, Math.min(100, Math.round((netSavings / monthlyIncome) * 100))) : 0;

  const catSpent = {};
  expenses.forEach(e => {
    catSpent[e.category] = (catSpent[e.category] || 0) + e.amount;
  });
  const topCategories = Object.entries(catSpent).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const maxCatSpent = spent > 0 ? spent : 1;

  // 4. Udhar Lending Calculations
  const settlePct = udharRecords.length > 0 ? Math.round((udharSummary.settledCount / udharRecords.length) * 100) : 100;
  const recoveryPct = (udharSummary.totalToGet + (udharSummary.pendingGaveCount || 0)) > 0
    ? Math.min(100, Math.round((udharSummary.settledCount / (udharRecords.length || 1)) * 100))
    : 100;
  const debtRepaidPct = udharSummary.totalToPay === 0 ? 100 : Math.max(0, 100 - Math.round((udharSummary.totalToPay / (udharSummary.totalToPay + 1000)) * 100));

  // 5. Goals Calculations
  const completedGoals = goals.filter(g => getGoalProgress(g) >= 100);
  const goalsCompletionPct = goals.length > 0 ? Math.round((completedGoals.length / goals.length) * 100) : 0;

  // Filter conditions
  const showHabits = currentProgressFilter === 'all' || currentProgressFilter === 'habits';
  const showStudy = currentProgressFilter === 'all' || currentProgressFilter === 'study';
  const showFinance = currentProgressFilter === 'all' || currentProgressFilter === 'finance';
  const showUdhar = currentProgressFilter === 'all' || currentProgressFilter === 'udhar';
  const showGoals = currentProgressFilter === 'all' || currentProgressFilter === 'goals';
  const showAttendance = currentProgressFilter === 'all' || currentProgressFilter === 'attendance';
  const attSummary = getAttendanceSummary();
  const attSubjects = getAttendanceSubjects();

  return `
    <div class="space-y-6 animate-in fade-in duration-300">
      <!-- Master Overview Hero Banner -->
      <div class="p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-indigo-950 via-surface-900 to-slate-900 border border-indigo-500/30 text-white shadow-xl relative overflow-hidden">
        <div class="absolute -top-16 -right-16 w-56 h-56 bg-accent/20 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-16 -left-16 w-56 h-56 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>

        <div class="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div class="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            ${renderProgressCircle(lifeScore, 120, 10, '#6366f1', 'Score', lifeEmoji)}
            <div class="space-y-1.5">
              <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${lifeScoreObj.badgeClass || 'bg-accent/20 text-accent'}">
                <span>${lifeEmoji}</span>
                <span>${lifeLabel}</span>
              </div>
              <h2 class="text-2xl font-black tracking-tight">LifeFlow Progress Hub</h2>
              <p class="text-xs text-gray-300 max-w-md leading-relaxed">
                Centralized multi-domain performance dashboard. Monitor your habits, study sessions, financial cashflow, friends lending ledger, and roadmap milestones in real-time.
              </p>
            </div>
          </div>

          <!-- Quick KPI Badges -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full lg:w-auto">
            <div class="p-3 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-center">
              <span class="text-[10px] uppercase font-bold text-gray-400">Habits Today</span>
              <p class="text-lg font-black text-indigo-400 mt-0.5">${completion}%</p>
              <span class="text-[9px] text-gray-400">${streak}d streak</span>
            </div>
            <div class="p-3 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-center">
              <span class="text-[10px] uppercase font-bold text-gray-400">Study Focus</span>
              <p class="text-lg font-black text-blue-400 mt-0.5">${studyHrs.toFixed(1)}h</p>
              <span class="text-[9px] text-gray-400">${studyRoutinePct}% slots</span>
            </div>
            <div class="p-3 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-center">
              <span class="text-[10px] uppercase font-bold text-gray-400">Cashflow</span>
              <p class="text-lg font-black text-emerald-400 mt-0.5">₹${(netSavings/1000).toFixed(1)}k</p>
              <span class="text-[9px] text-gray-400">${budgetUsedPct}% budget</span>
            </div>
            <div class="p-3 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-center">
              <span class="text-[10px] uppercase font-bold text-gray-400">Lending Settle</span>
              <p class="text-lg font-black text-amber-400 mt-0.5">${settlePct}%</p>
              <span class="text-[9px] text-gray-400">${udharSummary.settledCount} cleared</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Segmented Section Filters -->
      <div class="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button onclick="setProgressFilter('all')" class="px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${currentProgressFilter === 'all' ? 'bg-accent text-white shadow-xs' : 'bg-white dark:bg-surface-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-surface-700 hover:bg-gray-50 dark:hover:bg-surface-700'}">
          ✨ All Sections
        </button>
        <button onclick="setProgressFilter('habits')" class="px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${currentProgressFilter === 'habits' ? 'bg-accent text-white shadow-xs' : 'bg-white dark:bg-surface-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-surface-700 hover:bg-gray-50 dark:hover:bg-surface-700'}">
          🌟 Daily Routine & Habits
        </button>
        <button onclick="setProgressFilter('study')" class="px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${currentProgressFilter === 'study' ? 'bg-accent text-white shadow-xs' : 'bg-white dark:bg-surface-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-surface-700 hover:bg-gray-50 dark:hover:bg-surface-700'}">
          📚 Study Routine
        </button>
        <button onclick="setProgressFilter('finance')" class="px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${currentProgressFilter === 'finance' ? 'bg-accent text-white shadow-xs' : 'bg-white dark:bg-surface-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-surface-700 hover:bg-gray-50 dark:hover:bg-surface-700'}">
          💰 Money & Finance
        </button>
        <button onclick="setProgressFilter('udhar')" class="px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${currentProgressFilter === 'udhar' ? 'bg-accent text-white shadow-xs' : 'bg-white dark:bg-surface-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-surface-700 hover:bg-gray-50 dark:hover:bg-surface-700'}">
          🤝 Friends Lending
        </button>
        <button onclick="setProgressFilter('goals')" class="px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${currentProgressFilter === 'goals' ? 'bg-accent text-white shadow-xs' : 'bg-white dark:bg-surface-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-surface-700 hover:bg-gray-50 dark:hover:bg-surface-700'}">
          🎯 Goals & Milestones
        </button>
        <button onclick="setProgressFilter('attendance')" class="px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${currentProgressFilter === 'attendance' ? 'bg-accent text-white shadow-xs' : 'bg-white dark:bg-surface-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-surface-700 hover:bg-gray-50 dark:hover:bg-surface-700'}">
          🎓 Class Attendance
        </button>
      </div>

      <!-- Section Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        <!-- 1. Daily Routine & Habits Card -->
        ${showHabits ? `
        <div class="p-5 rounded-2xl bg-white dark:bg-surface-800 border border-gray-100 dark:border-surface-700 shadow-sm space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-surface-700">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <i data-lucide="check-circle-2" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="font-bold text-sm text-gray-900 dark:text-white">Daily Routine & Habits</h3>
                <p class="text-[11px] text-gray-400">Consistency & checklist completion</p>
              </div>
            </div>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300">
              ${streak} Day Streak
            </span>
          </div>

          <div class="flex flex-col sm:flex-row items-center gap-5 pt-1">
            ${renderProgressCircle(completion, 100, 8, '#6366f1', 'Habits', completion + '%')}
            <div class="flex-1 space-y-2.5 w-full">
              ${renderProgressBar(morningPct, 'bg-amber-500', '🌅 Morning Routine', `${morningDone}/${morningTasks.length || 0} done`)}
              ${renderProgressBar(afternoonPct, 'bg-orange-500', '☀️ Afternoon Routine', `${afternoonDone}/${afternoonTasks.length || 0} done`)}
              ${renderProgressBar(eveningPct, 'bg-indigo-500', '🌆 Evening Routine', `${eveningDone}/${eveningTasks.length || 0} done`)}
              ${renderProgressBar(nightPct, 'bg-purple-500', '🌙 Night Routine', `${nightDone}/${nightTasks.length || 0} done`)}
              ${renderProgressBar(streakPct, 'bg-emerald-500', '🔥 30-Day Streak Target', `${streak}/30 Days`, streak >= 30 ? 'Target achieved!' : `${30 - streak} days to 30-day mastery`)}
            </div>
          </div>

          <div class="pt-2 border-t border-gray-100 dark:border-surface-700 flex justify-end">
            <button onclick="navigateTo('routine')" class="text-xs font-semibold text-accent hover:underline flex items-center gap-1 cursor-pointer">
              Open Daily Routine <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
        ` : ''}

        <!-- 2. Study Routine & Focus Card -->
        ${showStudy ? `
        <div class="p-5 rounded-2xl bg-white dark:bg-surface-800 border border-gray-100 dark:border-surface-700 shadow-sm space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-surface-700">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <i data-lucide="book-open" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="font-bold text-sm text-gray-900 dark:text-white">Academic Focus & Study Tracker</h3>
                <p class="text-[11px] text-gray-400">Scheduled routine slots & subject focus</p>
              </div>
            </div>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300">
              ${studyHrs.toFixed(1)}h Logged Today
            </span>
          </div>

          <div class="flex flex-col sm:flex-row items-center gap-5 pt-1">
            ${renderProgressCircle(studyRoutinePct, 100, 8, '#3b82f6', 'Study Slots', studyRoutinePct + '%')}
            <div class="flex-1 space-y-2.5 w-full">
              ${renderProgressBar(studyGoalPct, 'bg-blue-600', '🎯 Daily 4-Hour Study Target', `${studyHrs.toFixed(1)} / 4.0 hrs`, studyHrs >= 4 ? 'Goal completed!' : `${(4 - studyHrs).toFixed(1)}h remaining today`)}
              ${renderProgressBar(studyRoutinePct, 'bg-indigo-500', '📋 Scheduled Slots Completed', `${slotsDone}/${studyRoutine.length || 0} slots`)}
              ${topSubjects.length > 0 ? topSubjects.map(([subj, mins]) => `
                ${renderProgressBar(Math.round((mins/maxSubjectMins)*100), 'bg-teal-500', `📖 ${subj}`, `${(mins/60).toFixed(1)} hrs`)}
              `).join('') : '<p class="text-[11px] text-gray-400">Log your first study session to see subject breakdown.</p>'}
            </div>
          </div>

          <div class="pt-2 border-t border-gray-100 dark:border-surface-700 flex justify-end">
            <button onclick="navigateTo('study')" class="text-xs font-semibold text-accent hover:underline flex items-center gap-1 cursor-pointer">
              Open Study Tracker <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
        ` : ''}

        <!-- 3. Money & Cashflow Card -->
        ${showFinance ? `
        <div class="p-5 rounded-2xl bg-white dark:bg-surface-800 border border-gray-100 dark:border-surface-700 shadow-sm space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-surface-700">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                <i data-lucide="wallet" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="font-bold text-sm text-gray-900 dark:text-white">Money & Financial Health</h3>
                <p class="text-[11px] text-gray-400">Income sources, budget & savings efficiency</p>
              </div>
            </div>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full ${netSavings >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300' : 'bg-rose-50 text-rose-600'}">
              Net: ₹${netSavings.toLocaleString('en-IN')}
            </span>
          </div>

          <div class="flex flex-col sm:flex-row items-center gap-5 pt-1">
            ${renderProgressCircle(budgetUsedPct, 100, 8, budgetUsedPct > 80 ? '#ef4444' : (budgetUsedPct > 60 ? '#f59e0b' : '#10b981'), 'Budget Used', `₹${(spent/1000).toFixed(1)}k`)}
            <div class="flex-1 space-y-2.5 w-full">
              ${renderProgressBar(budgetUsedPct, budgetUsedPct > 80 ? 'bg-rose-500' : 'bg-emerald-500', '💳 Monthly Budget Consumed', `₹${spent.toLocaleString('en-IN')} / ₹${budget.toLocaleString('en-IN')}`, `Safe remaining: ₹${Math.max(0, remaining).toLocaleString('en-IN')}`)}
              ${renderProgressBar(savingsRate, 'bg-accent', '🌱 Savings Efficiency (Income Kept)', `${savingsRate}%`, `₹${netSavings.toLocaleString('en-IN')} saved from ₹${monthlyIncome.toLocaleString('en-IN')} inflow`)}
              ${topCategories.length > 0 ? topCategories.map(([cat, amt]) => `
                ${renderProgressBar(Math.round((amt/maxCatSpent)*100), 'bg-amber-500', `🏷️ ${cat}`, `₹${amt.toLocaleString('en-IN')}`)}
              `).join('') : '<p class="text-[11px] text-gray-400">No expenses logged yet this month.</p>'}
            </div>
          </div>

          <div class="pt-2 border-t border-gray-100 dark:border-surface-700 flex justify-end">
            <button onclick="navigateTo('expense')" class="text-xs font-semibold text-accent hover:underline flex items-center gap-1 cursor-pointer">
              Open Money & Finance <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
        ` : ''}

        <!-- 4. Friends Lending Ledger (Udhar) Card -->
        ${showUdhar ? `
        <div class="p-5 rounded-2xl bg-white dark:bg-surface-800 border border-gray-100 dark:border-surface-700 shadow-sm space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-surface-700">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <i data-lucide="hand-coins" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="font-bold text-sm text-gray-900 dark:text-white">Friends Lending & Debt (Udhar)</h3>
                <p class="text-[11px] text-gray-400">Loan recoveries & debt settlement tracking</p>
              </div>
            </div>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300">
              Net Balance: ₹${udharSummary.netBalance.toLocaleString('en-IN')}
            </span>
          </div>

          <div class="flex flex-col sm:flex-row items-center gap-5 pt-1">
            ${renderProgressCircle(settlePct, 100, 8, '#10b981', 'Settled', `${udharSummary.settledCount}/${udharRecords.length || 0}`)}
            <div class="flex-1 space-y-2.5 w-full">
              ${renderProgressBar(settlePct, 'bg-emerald-500', '🤝 Transaction Settlement Rate', `${udharSummary.settledCount}/${udharRecords.length || 0} Records`, `${(udharRecords.length - udharSummary.settledCount)} active unsettled records`)}
              ${renderProgressBar(recoveryPct, 'bg-blue-500', '🟢 Lent Money Outstanding', `To Receive: ₹${udharSummary.totalToGet.toLocaleString('en-IN')}`, `${udharSummary.pendingGaveCount} pending friend collection entries`)}
              ${renderProgressBar(debtRepaidPct, 'bg-rose-500', '🔴 Borrowed Debt Clearance', `To Pay: ₹${udharSummary.totalToPay.toLocaleString('en-IN')}`, `${udharSummary.pendingTookCount} pending repayment entries`)}
            </div>
          </div>

          <div class="pt-2 border-t border-gray-100 dark:border-surface-700 flex justify-end">
            <button onclick="navigateTo('udhar')" class="text-xs font-semibold text-accent hover:underline flex items-center gap-1 cursor-pointer">
              Open Friends Lending <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
        ` : ''}

        
        <!-- Class Attendance Tracker Card in Progress Hub -->
        ${showAttendance ? `
        <div class="p-5 rounded-2xl bg-white dark:bg-surface-800 border border-gray-100 dark:border-surface-700 shadow-sm space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-surface-700">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <i data-lucide="graduation-cap" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="font-bold text-sm text-gray-900 dark:text-white">Class Attendance & Eligibility</h3>
                <p class="text-[11px] text-gray-400">Class presence & minimum threshold</p>
              </div>
            </div>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full ${attSubjects.length === 0 ? 'bg-gray-100 text-gray-500 dark:bg-surface-700 dark:text-gray-400' : (attSummary.overallPct >= 75 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-rose-50 text-rose-600')}">
              ${attSubjects.length === 0 ? 'Fresh Slate' : `${attSummary.safeCount}/${attSummary.totalSubjects} Safe`}
            </span>
          </div>

          ${attSubjects.length === 0 ? `
            <div class="py-5 text-center text-gray-400 dark:text-gray-500">
              <i data-lucide="graduation-cap" class="w-8 h-8 mx-auto mb-1.5 opacity-40"></i>
              <p class="text-xs font-medium text-gray-600 dark:text-gray-300">No courses tracked yet</p>
              <p class="text-[11px] text-gray-400 mt-0.5">Add your semester subjects to start monitoring attendance & eligibility.</p>
            </div>
          ` : `
          <div class="flex flex-col sm:flex-row items-center gap-5 pt-1">
            ${renderProgressCircle(attSummary.overallPct, 100, 8, attSummary.overallPct >= 75 ? '#10b981' : '#ef4444', 'Attendance', `${attSummary.totalAttended}/${attSummary.totalClasses}`)}
            <div class="flex-1 space-y-2.5 w-full">
              ${renderProgressBar(attSummary.overallPct, attSummary.overallPct >= 75 ? 'bg-emerald-500' : 'bg-rose-500', 'Overall Attendance Rate', `${attSummary.overallPct}%`, `${attSummary.totalAttended} attended, ${attSummary.totalAbsent} missed`)}
              ${attSubjects.slice(0, 3).map(s => {
                const b = calculateBunkStatus(s.attended, s.total, s.minRequiredPct);
                return renderProgressBar(b.pct, b.status === 'safe' ? 'bg-teal-500' : (b.status === 'borderline' ? 'bg-amber-500' : 'bg-rose-500'), `${s.name} (${s.code || ''})`, `${b.pct}%`, b.message);
              }).join('')}
            </div>
          </div>
          `}

          <div class="pt-2 border-t border-gray-100 dark:border-surface-700 flex justify-between items-center">
            <button onclick="downloadAttendancePDF()" class="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer" title="Download attendance report PDF">
              <i data-lucide="download" class="w-3.5 h-3.5"></i> Download PDF
            </button>
            <button onclick="navigateTo('attendance')" class="text-xs font-semibold text-accent hover:underline flex items-center gap-1 cursor-pointer">
              Open Class Attendance <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
        ` : ''}

        <!-- 5. Goals & Milestones Roadmap Card -->
        ${showGoals ? `
        <div class="p-5 rounded-2xl bg-white dark:bg-surface-800 border border-gray-100 dark:border-surface-700 shadow-sm space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-surface-700">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <i data-lucide="target" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="font-bold text-sm text-gray-900 dark:text-white">Goals & Milestones Roadmap</h3>
                <p class="text-[11px] text-gray-400">Quarterly & long-term target completion</p>
              </div>
            </div>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300">
              ${completedGoals.length}/${goals.length || 0} Completed
            </span>
          </div>

          <div class="flex flex-col sm:flex-row items-center gap-5 pt-1">
            ${renderProgressCircle(goalsCompletionPct, 100, 8, '#8b5cf6', 'Goals Done', `${completedGoals.length}/${goals.length || 0}`)}
            <div class="flex-1 space-y-2.5 w-full">
              ${goals.length > 0 ? goals.slice(0, 3).map(g => {
                const p = getGoalProgress(g);
                return renderProgressBar(p, 'bg-purple-600', `🎯 ${g.title}`, `${p}%`, `${g.category}${g.dueDate ? ' • Due ' + g.dueDate : ''}`);
              }).join('') : '<p class="text-[11px] text-gray-400">No active goals created yet. Add goals in Goals & Plans.</p>'}
            </div>
          </div>

          <div class="pt-2 border-t border-gray-100 dark:border-surface-700 flex justify-end">
            <button onclick="navigateTo('goals')" class="text-xs font-semibold text-accent hover:underline flex items-center gap-1 cursor-pointer">
              Open Goals & Plans <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
        ` : ''}

        <!-- 6. Day Progress & Circadian Rhythm Card -->
        <div class="p-5 rounded-2xl bg-white dark:bg-surface-800 border border-gray-100 dark:border-surface-700 shadow-sm space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-surface-700">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <i data-lucide="clock" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="font-bold text-sm text-gray-900 dark:text-white">Day Elapsed & Time OS</h3>
                <p class="text-[11px] text-gray-400">Circadian rhythm & time allocation</p>
              </div>
            </div>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300">
              ${dayProgress}% Passed
            </span>
          </div>

          <div class="flex flex-col sm:flex-row items-center gap-5 pt-1">
            ${renderProgressCircle(dayProgress, 100, 8, '#f59e0b', 'Day Elapsed', dayProgress + '%')}
            <div class="flex-1 space-y-2.5 w-full">
              ${renderProgressBar(dayProgress, 'bg-amber-500', '⏱️ 24-Hour Day Elapsed', `${dayProgress}%`, `${Math.round((dayProgress/100)*24)} hrs elapsed, ${Math.max(0, 24 - Math.round((dayProgress/100)*24))} hrs remaining`)}
              ${renderProgressBar(Math.min(100, Math.round((new Date().getHours() / 18) * 100)), 'bg-indigo-500', '☀️ Prime Active Hours (08:00 - 18:00)', 'Work & Focus Window')}
              ${renderProgressBar(Math.min(100, Math.round((streak / 7) * 100)), 'bg-emerald-500', '📅 Weekly Consistency Pace', `${Math.min(7, streak)}/7 Days Active`)}
            </div>
          </div>

          <div class="pt-2 border-t border-gray-100 dark:border-surface-700 flex justify-end">
            <button onclick="navigateTo('dashboard')" class="text-xs font-semibold text-accent hover:underline flex items-center gap-1 cursor-pointer">
              Open Dashboard <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>

        <!-- 7. Academic Standing & CGPA Card -->
        <div class="p-5 rounded-2xl bg-white dark:bg-surface-800 border border-gray-100 dark:border-surface-700 shadow-sm space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-surface-700">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <i data-lucide="award" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="font-bold text-sm text-gray-900 dark:text-white">Academic Standing & CGPA</h3>
                <p class="text-[11px] text-gray-400">Credit weighted GPA & degree standing</p>
              </div>
            </div>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300">
              Target ${getGradeData().targetCGPA || 8.5}
            </span>
          </div>

          <div class="flex flex-col sm:flex-row items-center gap-5 pt-1">
            ${renderProgressCircle(((calculateCGPA(getGradeData().pastSemesters, calculateSGPA(getGradeData().currentCourses), (getGradeData().currentCourses || []).reduce((a, c) => a + (parseFloat(c.credits) || 0), 0))) / 10) * 100, 100, 8, '#8b5cf6', 'Degree CGPA', calculateCGPA(getGradeData().pastSemesters, calculateSGPA(getGradeData().currentCourses), (getGradeData().currentCourses || []).reduce((a, c) => a + (parseFloat(c.credits) || 0), 0)).toFixed(2))}
            <div class="flex-1 space-y-2.5 w-full">
              ${renderProgressBar((calculateSGPA(getGradeData().currentCourses) / 10) * 100, 'bg-indigo-500', 'Semester SGPA', `${calculateSGPA(getGradeData().currentCourses).toFixed(2)} / 10.0`, `${(getGradeData().currentCourses || []).length} active courses`)}
              ${renderProgressBar((calculateCGPA(getGradeData().pastSemesters, calculateSGPA(getGradeData().currentCourses), (getGradeData().currentCourses || []).reduce((a, c) => a + (parseFloat(c.credits) || 0), 0)) / 10) * 100, 'bg-purple-500', 'Cumulative CGPA', `${calculateCGPA(getGradeData().pastSemesters, calculateSGPA(getGradeData().currentCourses), (getGradeData().currentCourses || []).reduce((a, c) => a + (parseFloat(c.credits) || 0), 0)).toFixed(2)} / 10.0`, 'Overall Degree')}
            </div>
          </div>

          <div class="pt-2 border-t border-gray-100 dark:border-surface-700 flex justify-end">
            <button onclick="navigateTo('grades')" class="text-xs font-semibold text-accent hover:underline flex items-center gap-1 cursor-pointer">
              Open SGPA & CGPA Calculator <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>

        <!-- 8. Weekly Performance & Milestone Badges Card -->
        <div class="p-5 rounded-2xl bg-white dark:bg-surface-800 border border-gray-100 dark:border-surface-700 shadow-sm space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-surface-700">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                <i data-lucide="sparkles" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="font-bold text-sm text-gray-900 dark:text-white">Weekly Scorecard & Badges</h3>
                <p class="text-[11px] text-gray-400">Weekly composite performance & gamification</p>
              </div>
            </div>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300">
              Grade ${getWeeklyPerformanceData().grade} (${getWeeklyPerformanceData().compositeScore}%)
            </span>
          </div>

          <div class="flex flex-col sm:flex-row items-center gap-5 pt-1">
            ${renderProgressCircle(getWeeklyPerformanceData().compositeScore, 100, 8, getWeeklyPerformanceData().badgeColor, 'Weekly', getWeeklyPerformanceData().grade)}
            <div class="flex-1 space-y-2.5 w-full">
              ${renderProgressBar(Math.min(100, Math.round((getWeeklyPerformanceData().weeklyStudyHours / getWeeklyPerformanceData().weeklyStudyTargetHours) * 100)), 'bg-indigo-500', 'Weekly Study Target', `${getWeeklyPerformanceData().weeklyStudyHours}h / ${getWeeklyPerformanceData().weeklyStudyTargetHours}h`)}
              ${renderProgressBar(getWeeklyPerformanceData().attendanceRate, 'bg-emerald-500', 'Class Attendance Rate', `${getWeeklyPerformanceData().attendanceRate}%`)}
              ${renderProgressBar(Math.round((evaluateAchievements().filter(b => b.unlocked).length / 8) * 100), 'bg-amber-500', 'Milestone Badges Unlocked', `${evaluateAchievements().filter(b => b.unlocked).length} / 8 Badges`)}
            </div>
          </div>

          <div class="pt-2 border-t border-gray-100 dark:border-surface-700 flex justify-end">
            <button onclick="navigateTo('achievements')" class="text-xs font-semibold text-accent hover:underline flex items-center gap-1 cursor-pointer">
              View All Badges & Scorecard <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>

      </div>
    </div>
  `;
}


// ========== UNIQUE PERSONAL OS DASHBOARD ==========
function renderDashboard() {
  const completion = getRoutineCompletion();
  const studyRoutinePct = getStudyRoutineCompletion();
  const studyHrs = getTodayStudyHours();
  const budget = getBudget();
  const spent = getMonthlySpent();
  const remaining = budget - spent;
  const activeGoals = getActiveGoals();
  const streak = getStreak();
  const userName = getUserFirstName();
  const lifeScore = getLifeScore();
  const safeSpend = getSafeDailySpend();
  const dayProgress = getDayProgress();
  const quickNotes = getQuickNotes();

  const routine = getRoutine();
  const routineChecks = getTodayChecks();
  const studyRoutine = getStudyRoutine();
  const studyChecks = getTodayStudyChecks();

  const budgetPct = Math.min((spent / budget) * 100, 100);
  let budgetColor = 'bg-success';
  let budgetBadge = 'badge-green';
  if (budgetPct > 80) { budgetColor = 'bg-danger'; budgetBadge = 'badge-red'; }
  else if (budgetPct > 60) { budgetColor = 'bg-warning'; budgetBadge = 'badge-yellow'; }

  const recentExpenses = getExpenses().slice(0, 3);
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Motivational daily thoughts
  const quotes = [
    "Small daily improvements over time lead to stunning results.",
    "Focus on being productive instead of busy.",
    "Discipline is choosing between what you want now and what you want most.",
    "Your habits will decide your future.",
    "Master your routine, master your life."
  ];
  const dailyQuote = quotes[now.getDate() % quotes.length];

  // SVG Gauge calculations for LifeScore
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (lifeScore.score / 100) * circumference;

  return `
    <!-- 1. HERO COMMAND CENTER BANNER -->
    <div class="hero-glass rounded-2xl p-6 sm:p-7 border border-indigo-200/50 dark:border-indigo-900/40 mb-8 shadow-sm">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div class="flex items-center gap-2 mb-1.5">
            <span class="px-2.5 py-0.5 rounded-full bg-accent/15 text-accent font-semibold text-xs flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
              Personal OS Active
            </span>
            <span class="text-xs text-gray-500 dark:text-gray-400">• ${dateStr}</span>
          </div>
          <h3 class="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Good ${getGreeting()}, <span class="bg-gradient-to-r from-accent via-indigo-500 to-pink-500 bg-clip-text text-transparent">${userName}</span>! 👋
          </h3>
          <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xl font-normal">
            "${dailyQuote}"
          </p>
          
          <!-- Quick Action Buttons -->
          <div class="flex flex-wrap items-center gap-2 mt-4 pt-1">
            <button onclick="navigateTo('study')" class="px-3 py-1.5 rounded-xl bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-600 hover:border-accent text-xs font-semibold text-gray-700 dark:text-gray-200 hover:text-accent flex items-center gap-1.5 shadow-xs transition-all">
              <i data-lucide="timer" class="w-3.5 h-3.5 text-accent"></i> Focus Session
            </button>
            <button onclick="openAddIncomeModal()" class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer">
              <i data-lucide="arrow-down-left" class="w-3.5 h-3.5"></i> + Money In (Income 💵)
            </button>
            <button onclick="quickOpenTab('expense')" class="px-3 py-1.5 rounded-xl bg-white dark:bg-surface-800 border border-gray-200 dark:border-surface-600 hover:border-rose-500 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:text-rose-500 flex items-center gap-1.5 shadow-xs transition-all cursor-pointer">
              <i data-lucide="plus-circle" class="w-3.5 h-3.5 text-rose-500"></i> Log Expense
            </button>
            <button onclick="quickOpenTab('study-slot')" class="px-3 py-1.5 rounded-xl bg-white dark:bg-surface-800 border border-gray-200 dark:border-gray-600 hover:border-blue-500 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:text-blue-500 flex items-center gap-1.5 shadow-xs transition-all">
              <i data-lucide="book-open" class="w-3.5 h-3.5 text-blue-500"></i> Add Study Slot
            </button>
            <button onclick="quickOpenTab('routine-task')" class="px-3 py-1.5 rounded-xl bg-white dark:bg-surface-800 border border-gray-200 dark:border-gray-600 hover:border-purple-500 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:text-purple-500 flex items-center gap-1.5 shadow-xs transition-all">
              <i data-lucide="check" class="w-3.5 h-3.5 text-purple-500"></i> New Habit
            </button>
          </div>
        </div>

        <!-- Live Clock & Day Progress -->
        <div class="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center p-4 rounded-xl bg-white/70 dark:bg-surface-800/80 backdrop-blur-md border border-gray-200/60 dark:border-surface-700/60 shadow-xs min-w-[170px]">
          <div class="text-right">
            <span class="text-2xl sm:text-3xl font-bold font-mono text-gray-900 dark:text-white tabular-nums tracking-tight">${timeStr}</span>
            <div class="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Live System Clock</div>
          </div>
          <div class="mt-2 text-right">
            <div class="flex items-center gap-1.5 justify-end text-[11px] font-semibold text-gray-600 dark:text-gray-300">
              <span>Day ${dayProgress}% Passed</span>
            </div>
            <div class="w-32 h-1.5 bg-gray-200 dark:bg-surface-700 rounded-full overflow-hidden mt-1">
              <div class="h-full bg-gradient-to-r from-accent to-blue-500 rounded-full" style="width: ${dayProgress}%"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. TOP 4 COMMAND METRIC CARDS -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      
      <!-- Card 1: LifeFlow Productivity Index -->
      <div class="card p-5 border border-indigo-200/60 dark:border-indigo-900/40 relative overflow-hidden group hover:scale-[1.02] transition-transform">
        <div class="flex items-center justify-between mb-2">
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">LifeFlow Index</span>
            <p class="text-xs font-medium text-gray-400 mt-0.5">Overall Balance</p>
          </div>
          <!-- Mini SVG Progress Ring -->
          <div class="relative w-12 h-12 flex items-center justify-center">
            <svg class="w-12 h-12 -rotate-90" viewBox="0 0 60 60">
              <circle cx="30" cy="30" r="${radius}" fill="none" stroke-width="5" class="stroke-gray-100 dark:stroke-surface-700" />
              <circle cx="30" cy="30" r="${radius}" fill="none" stroke-width="5" stroke-linecap="round"
                class="stroke-accent score-circle"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${strokeDashoffset}" />
            </svg>
            <span class="absolute text-xs font-bold text-gray-900 dark:text-white tabular-nums">${lifeScore.score}</span>
          </div>
        </div>
        <div class="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-surface-700">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${lifeScore.badgeClass}">
            ${lifeScore.emoji} ${lifeScore.label}
          </span>
          <span class="text-[11px] text-gray-400">Habits ${lifeScore.routinePct}% • Study ${lifeScore.studyRoutinePct}%</span>
        </div>
      </div>

      <!-- Card 2: Habit Routine & Streak -->
      <div class="card p-5 cursor-pointer hover:scale-[1.02] transition-transform border border-purple-200/60 dark:border-purple-900/40" onclick="navigateTo('routine')">
        <div class="flex items-center justify-between mb-3">
          <div class="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <i data-lucide="check-circle-2" class="w-5 h-5 text-purple-600 dark:text-purple-400"></i>
          </div>
          <span class="streak-badge">🔥 ${streak} Days Active</span>
        </div>
        <div class="flex items-baseline gap-2">
          <p class="text-2xl font-bold text-gray-900 dark:text-white">${completion}%</p>
          <span class="text-xs text-gray-400 font-medium">Routine Done</span>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Daily Habit Checklist</p>
        <div class="w-full h-2 bg-gray-100 dark:bg-surface-700 rounded-full overflow-hidden mt-3">
          <div class="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full" style="width: ${completion}%"></div>
        </div>
      </div>

      <!-- Card 3: Study Deep Work & Routine -->
      <div class="card p-5 cursor-pointer hover:scale-[1.02] transition-transform border border-blue-200/60 dark:border-blue-900/40" onclick="navigateTo('study')">
        <div class="flex items-center justify-between mb-3">
          <div class="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <i data-lucide="book-open" class="w-5 h-5 text-blue-500"></i>
          </div>
          <span class="badge badge-blue">📚 ${studyRoutinePct}% Routine</span>
        </div>
        <div class="flex items-baseline gap-2">
          <p class="text-2xl font-bold text-gray-900 dark:text-white">${studyHrs} hrs</p>
          <span class="text-xs text-gray-400 font-medium">Deep Work</span>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Today's Focus & Study Slots</p>
        <div class="w-full h-2 bg-gray-100 dark:bg-surface-700 rounded-full overflow-hidden mt-3">
          <div class="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" style="width: ${studyRoutinePct}%"></div>
        </div>
      </div>

      <!-- Card 4: Financial Pulse & Cashflow Overview -->
      <div class="card p-5 cursor-pointer hover:scale-[1.02] transition-transform border border-emerald-200/60 dark:border-emerald-900/40" onclick="navigateTo('expense')">
        <div class="flex items-center justify-between mb-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <i data-lucide="wallet" class="w-5 h-5 text-emerald-500"></i>
          </div>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            +₹${getMonthlyIncome().toLocaleString('en-IN')} Inflow
          </span>
        </div>
        <div class="flex items-baseline gap-2">
          <p class="text-2xl font-bold text-gray-900 dark:text-white">₹${remaining.toLocaleString('en-IN')}</p>
          <span class="text-xs text-gray-400 font-medium">Budget Left</span>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">₹${spent.toLocaleString('en-IN')} spent • Net savings: ${getNetSavings() >= 0 ? '+' : ''}₹${getNetSavings().toLocaleString('en-IN')}</p>
        <div class="w-full h-2 bg-gray-100 dark:bg-surface-700 rounded-full overflow-hidden mt-3">
          <div class="h-full ${budgetColor} rounded-full" style="width: ${budgetPct}%"></div>
        </div>
      </div>
    </div>

    <!-- 3. INTERACTIVE TODAY'S LIVE AGENDA (Direct Check-off on Dashboard) -->
    <div class="card p-6 mb-8 border border-gray-200/80 dark:border-surface-700/80 shadow-xs">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-gray-100 dark:border-surface-700">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
            <i data-lucide="calendar-clock" class="w-4 h-4"></i>
          </div>
          <div>
            <h4 class="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Today's Live Agenda
              <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent">Direct Check-Off</span>
            </h4>
            <p class="text-xs text-gray-500 dark:text-gray-400">Click any checkbox to mark items complete right from the dashboard</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="navigateTo('study')" class="text-xs text-accent hover:underline font-semibold flex items-center gap-1">
            Open Study Tracker <i data-lucide="arrow-right" class="w-3 h-3"></i>
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Column 1: Today's Study Routine Slots -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <span>📚 Study Schedule</span>
              <span class="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-500">${studyRoutine.filter(s => studyChecks[s.id]).length}/${studyRoutine.length}</span>
            </span>
            <button onclick="quickOpenTab('study-slot')" class="text-[11px] text-accent hover:underline font-medium">+ Add Slot</button>
          </div>
          <div class="space-y-2">
            ${studyRoutine.slice(0, 4).map(s => {
              const isDone = !!studyChecks[s.id];
              return `
                <div class="flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  isDone 
                    ? 'bg-emerald-500/5 dark:bg-emerald-950/10 border-emerald-500/30' 
                    : 'bg-gray-50 dark:bg-surface-700/40 border-gray-100 dark:border-surface-600 hover:border-accent/40'
                }">
                  <div onclick="toggleDashboardStudyCheck('${s.id}')" class="routine-checkbox ${isDone ? 'checked !bg-emerald-600 !border-emerald-600' : ''}" title="Toggle Complete"></div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5">
                      <span class="text-xs font-bold text-gray-900 dark:text-white ${isDone ? 'line-through text-gray-400 dark:text-gray-500' : ''}">${s.subject}</span>
                      <span class="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/60 shadow-xs"><i data-lucide="clock" class="w-3 h-3 text-amber-600 dark:text-amber-400"></i><span>${s.time || s.duration + 'm'}</span></span>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 truncate ${isDone ? 'line-through text-gray-400' : ''}">${s.topic}</p>
                  </div>
                  <button onclick="startFocusForSlot('${s.subject.replace(/'/g, "\\'")}', ${s.duration || 25})" class="p-1.5 rounded-lg bg-accent/10 hover:bg-accent text-accent hover:text-white transition-all text-xs font-medium" title="Start Focus">
                    <i data-lucide="play" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Column 2: Today's Daily Routine Habits -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <span>✅ Daily Habits</span>
              <span class="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-500">${routine.filter(r => routineChecks[r.id]).length}/${routine.length}</span>
            </span>
            <button onclick="navigateTo('routine')" class="text-[11px] text-accent hover:underline font-medium">View All</button>
          </div>
          <div class="space-y-2">
            ${routine.slice(0, 4).map(r => {
              const isDone = !!routineChecks[r.id];
              return `
                <div class="flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  isDone 
                    ? 'bg-purple-500/5 dark:bg-purple-950/10 border-purple-500/30' 
                    : 'bg-gray-50 dark:bg-surface-700/40 border-gray-100 dark:border-surface-600 hover:border-purple-500/40'
                }">
                  <div onclick="toggleDashboardRoutineCheck('${r.id}')" class="routine-checkbox ${isDone ? 'checked !bg-purple-600 !border-purple-600' : ''}" title="Toggle Complete"></div>
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-semibold text-gray-800 dark:text-gray-200 ${isDone ? 'line-through text-gray-400 dark:text-gray-500' : ''}">${r.name}</p>
                    <span class="text-[10px] text-gray-400">${r.period}</span>
                  </div>
                  ${isDone ? '<span class="text-[10px] font-bold text-purple-500 bg-purple-100 dark:bg-purple-950/40 px-1.5 py-0.5 rounded">Done</span>' : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- 4. MIDDLE ROW: ANALYTICS & QUICK BRAIN DUMP -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      
      <!-- Study Hours Chart (2 cols) -->
      <div class="card p-6 lg:col-span-2">
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-sm font-semibold flex items-center gap-2">
            <i data-lucide="bar-chart-3" class="w-4 h-4 text-accent"></i>
            Study Rhythm (Last 7 Days)
          </h4>
          <span class="text-xs font-medium text-gray-400">Total: ${studyHrs} hrs today</span>
        </div>
        <div class="h-48">
          <canvas id="dashboard-study-chart"></canvas>
        </div>
      </div>

      <!-- Quick Brain Dump / Daily Scratchpad (1 col) -->
      <div class="card p-6 flex flex-col">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-sm font-semibold flex items-center gap-2">
            <i data-lucide="edit-3" class="w-4 h-4 text-amber-500"></i>
            Quick Scratchpad
          </h4>
          <span id="scratchpad-indicator" class="text-[10px] text-emerald-500 font-medium">Auto-saved ✓</span>
        </div>
        <p class="text-xs text-gray-400 mb-2">Instant brain dump, quick to-dos, or notes:</p>
        <textarea
          id="dashboard-scratchpad"
          oninput="handleQuickNoteInput(this.value)"
          placeholder="Jot down quick thoughts, phone numbers, or immediate priorities..."
          rows="6"
          class="scratchpad-box scratchpad-textarea w-full flex-1 p-3 rounded-xl border text-xs focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none text-gray-800 dark:text-gray-200 font-sans"
        >${quickNotes}</textarea>
        <div class="flex justify-between items-center mt-2 text-[10px] text-gray-400">
          <span>Synced locally & cloud</span>
          <button onclick="clearScratchpad()" class="hover:text-red-400 transition-colors">Clear</button>
        </div>
      </div>
    </div>

    <!-- 5. BOTTOM ROW: GOALS PROGRESS & RECENT ACTIVITY -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      
      <!-- Goals (2 cols) -->
      <div class="card p-6 lg:col-span-2">
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-sm font-semibold flex items-center gap-2">
            <i data-lucide="trending-up" class="w-4 h-4 text-accent"></i>
            Active Goals & Plans
          </h4>
          <button onclick="navigateTo('goals')" class="text-xs text-accent hover:underline font-semibold">View All Goals →</button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          ${getGoals().slice(0, 4).map(g => {
            const progress = getGoalProgress(g);
            const days = getDaysLeft(g.dueDate);
            return `
              <div class="p-3.5 rounded-xl bg-gray-50 dark:bg-surface-700/40 border border-gray-100 dark:border-surface-600 hover:border-accent/40 transition-colors">
                <div class="flex items-start justify-between gap-2 mb-1.5">
                  <p class="text-xs font-bold text-gray-800 dark:text-gray-200 line-clamp-1">${g.title}</p>
                  ${days > 0 
                    ? `<span class="badge ${days <= 7 ? 'badge-red' : days <= 30 ? 'badge-yellow' : 'badge-green'} text-[10px]">${days}d left</span>` 
                    : `<span class="badge badge-red text-[10px]">Overdue</span>`}
                </div>
                <div class="w-full h-1.5 bg-gray-200 dark:bg-surface-600 rounded-full overflow-hidden my-2">
                  <div class="h-full ${progress === 100 ? 'bg-success' : 'bg-accent'} rounded-full transition-all" style="width: ${progress}%"></div>
                </div>
                <div class="flex items-center justify-between text-[11px] text-gray-400">
                  <span>${g.category}</span>
                  <span class="font-semibold text-gray-700 dark:text-gray-300">${progress}% done</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Recent Expenses (1 col) -->
      <div class="card p-6">
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-sm font-semibold flex items-center gap-2">
            <i data-lucide="receipt" class="w-4 h-4 text-emerald-500"></i>
            Recent Expenses
          </h4>
          <button onclick="navigateTo('expense')" class="text-xs text-accent hover:underline font-semibold">All →</button>
        </div>
        <div class="space-y-2.5">
          ${recentExpenses.length === 0 ? '<p class="text-xs text-gray-400">No recent expenses.</p>' : recentExpenses.map(e => `
            <div class="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 dark:bg-surface-700/40 border border-gray-100 dark:border-surface-600">
              <div class="w-8 h-8 rounded-lg ${getCatClass(e.category)} flex items-center justify-center text-sm flex-shrink-0">${getCatEmoji(e.category)}</div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold truncate text-gray-800 dark:text-gray-200">${e.description}</p>
                <p class="text-[10px] text-gray-400">${e.category} • ${formatDate(e.date)}</p>
              </div>
              <span class="text-xs font-bold text-danger whitespace-nowrap">-₹${e.amount}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

// Interactive Dashboard Handlers
function toggleDashboardRoutineCheck(id) {
  const checks = getTodayChecks();
  const newState = !checks[id];
  setRoutineCheck(id, newState);
  renderPage('dashboard');
  showToast(newState ? 'Habit marked done! 🌟' : 'Habit unmarked', 'info');
}

function toggleDashboardStudyCheck(id) {
  const checks = getTodayStudyChecks();
  const newState = !checks[id];
  setStudyRoutineCheck(id, newState);
  renderPage('dashboard');
  showToast(newState ? 'Study slot completed! 📚' : 'Study slot unmarked', 'info');
}

let noteTimer = null;
function handleQuickNoteInput(val) {
  saveQuickNotes(val);
  const ind = document.getElementById('scratchpad-indicator');
  if (ind) {
    ind.textContent = 'Saving...';
    ind.className = 'text-[10px] text-amber-500 font-medium';
  }
  clearTimeout(noteTimer);
  noteTimer = setTimeout(() => {
    if (ind) {
      ind.textContent = 'Auto-saved ✓';
      ind.className = 'text-[10px] text-emerald-500 font-medium';
    }
  }, 400);
}

function clearScratchpad() {
  saveQuickNotes('');
  const box = document.getElementById('dashboard-scratchpad');
  if (box) box.value = '';
  showToast('Scratchpad cleared', 'info');
}

function quickOpenTab(tab) {
  openQuickAdd();
  switchQuickAddTab(tab);
}


// ========== CLASS ATTENDANCE SYSTEM ==========
let currentAttendanceFilter = 'all';

function setAttendanceFilter(filter) {
  currentAttendanceFilter = filter;
  renderPage('attendance');
}

function openAddSubjectModal() {
  const m = document.getElementById('add-subject-modal');
  if (m) m.classList.remove('hidden');
  const nameInp = document.getElementById('subject-modal-name');
  if (nameInp) { nameInp.value = ''; nameInp.focus(); }
  const codeInp = document.getElementById('subject-modal-code');
  if (codeInp) codeInp.value = '';
  const teacherInp = document.getElementById('subject-modal-teacher');
  if (teacherInp) teacherInp.value = '';
  const minInp = document.getElementById('subject-modal-min-pct');
  if (minInp) minInp.value = '75';
  const attInp = document.getElementById('subject-modal-attended');
  if (attInp) attInp.value = '0';
  const totInp = document.getElementById('subject-modal-total');
  if (totInp) totInp.value = '0';
  lucide.createIcons();
}

function closeAddSubjectModal() {
  const m = document.getElementById('add-subject-modal');
  if (m) m.classList.add('hidden');
}

function handleSaveSubjectFromModal() {
  const name = document.getElementById('subject-modal-name')?.value.trim();
  const code = document.getElementById('subject-modal-code')?.value.trim();
  const teacher = document.getElementById('subject-modal-teacher')?.value.trim();
  const minPct = parseInt(document.getElementById('subject-modal-min-pct')?.value) || 75;
  const attended = parseInt(document.getElementById('subject-modal-attended')?.value) || 0;
  const total = parseInt(document.getElementById('subject-modal-total')?.value) || 0;

  if (!name) {
    showToast('Please enter a subject or course name', 'error');
    return;
  }
  if (attended > total) {
    showToast('Attended classes cannot be greater than total classes', 'error');
    return;
  }

  addAttendanceSubject(name, code, teacher, minPct, attended, total);
  closeAddSubjectModal();
  showToast(`Added "${name}" to your attendance tracker! 🎓`, 'success');
  renderPage('attendance');
}

function handleMarkAttendance(subjectId, status) {
  const updated = markClassAttendance(subjectId, status);
  if (!updated) return;

  const bunk = calculateBunkStatus(updated.attended, updated.total, updated.minRequiredPct);
  
  if (status === 'present') {
    showToast(`Marked Present for ${updated.name} (${bunk.pct}%) ✅`, 'success');
  } else if (status === 'absent') {
    showToast(`Marked Absent for ${updated.name} (${bunk.pct}%) ⚠️`, 'info');
  } else if (status === 'cancelled') {
    showToast(`Marked Class Cancelled for ${updated.name} ⚪`, 'info');
  } else if (status === 'undo') {
    showToast(`Reverted last attendance action for ${updated.name} ↩️`, 'info');
  }

  renderPage('attendance');
}

function handleDeleteSubject(subjectId) {
  if (confirm('Are you sure you want to remove this course from your attendance tracker?')) {
    deleteAttendanceSubject(subjectId);
    showToast('Course removed from attendance tracker', 'info');
    renderPage('attendance');
  }
}

// ========== ATTENDANCE REPORT EXPORT & DOWNLOAD SYSTEM ==========
function createPrintableAttendanceElement() {
  const subjects = getAttendanceSubjects();
  const summary = getAttendanceSummary();
  const logs = getAttendanceLogs();
  const user = getCurrentUser() || { name: 'Student', email: 'student@lifeflow.app' };
  const dateStr = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  let statusBadgeBg = '#ecfdf5';
  let statusBadgeColor = '#065f46';
  let statusBadgeBorder = '#a7f3d0';
  let statusBadgeText = 'ELIGIBLE FOR SEMESTER EXAMS (SAFE ZONE)';
  if (summary.overallPct < 65) {
    statusBadgeBg = '#fef2f2';
    statusBadgeColor = '#991b1b';
    statusBadgeBorder = '#fecaca';
    statusBadgeText = 'CRITICAL ATTENDANCE SHORTAGE (RISK OF DEBARMENT)';
  } else if (summary.overallPct < 75) {
    statusBadgeBg = '#fffbeb';
    statusBadgeColor = '#92400e';
    statusBadgeBorder = '#fde68a';
    statusBadgeText = 'WARNING ZONE (BORDERLINE ATTENDANCE)';
  }

  const el = document.createElement('div');
  el.id = 'printable-attendance-export';
  el.style.padding = '24px';
  el.style.backgroundColor = '#ffffff';
  el.style.color = '#0f172a';
  el.style.fontFamily = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  el.style.lineHeight = '1.45';
  el.style.boxSizing = 'border-box';
  el.style.width = '780px';

  el.innerHTML = `
    <!-- Header -->
    <div style="border-bottom: 2px solid #4f46e5; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="background: #4f46e5; color: #ffffff; font-weight: 900; font-size: 14px; padding: 4px 8px; border-radius: 6px; letter-spacing: 0.5px;">LF</span>
          <h1 style="margin: 0; font-size: 20px; font-weight: 900; color: #1e1b4b; letter-spacing: -0.5px;">LifeFlow — Class Attendance & Eligibility Transcript</h1>
        </div>
        <p style="margin: 6px 0 0 0; font-size: 11.5px; color: #475569;">
          Student: <strong style="color: #0f172a;">${user.name || 'Student'}</strong> &bull; ${user.email || 'student@lifeflow.app'} &bull; Academic Session 2026
        </p>
      </div>
      <div style="text-align: right;">
        <span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 10px; font-weight: 800; background: ${statusBadgeBg}; color: ${statusBadgeColor}; border: 1px solid ${statusBadgeBorder};">
          ${statusBadgeText}
        </span>
        <div style="font-size: 10.5px; color: #64748b; margin-top: 4px;">
          Exported: <strong>${dateStr}</strong>, ${timeStr}
        </div>
      </div>
    </div>

    <!-- 4 KPI Summary Cards -->
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;">
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center;">
        <div style="font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Total Classes Held</div>
        <div style="font-size: 20px; font-weight: 900; color: #0f172a; margin-top: 2px;">${summary.totalClasses}</div>
        <div style="font-size: 9.5px; color: #4f46e5; font-weight: 600;">${summary.totalSubjects} Registered Courses</div>
      </div>
      <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 10px; text-align: center;">
        <div style="font-size: 9.5px; font-weight: 700; color: #065f46; text-transform: uppercase; letter-spacing: 0.5px;">Classes Attended</div>
        <div style="font-size: 20px; font-weight: 900; color: #059669; margin-top: 2px;">${summary.totalAttended}</div>
        <div style="font-size: 9.5px; color: #059669; font-weight: 600;">${summary.overallPct}% Overall Rate</div>
      </div>
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px; text-align: center;">
        <div style="font-size: 9.5px; font-weight: 700; color: #991b1b; text-transform: uppercase; letter-spacing: 0.5px;">Classes Missed</div>
        <div style="font-size: 20px; font-weight: 900; color: #dc2626; margin-top: 2px;">${summary.totalAbsent}</div>
        <div style="font-size: 9.5px; color: #dc2626; font-weight: 600;">${summary.totalClasses - summary.totalAttended} Classes Absent</div>
      </div>
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 10px; text-align: center;">
        <div style="font-size: 9.5px; font-weight: 700; color: #1e40af; text-transform: uppercase; letter-spacing: 0.5px;">Safe Courses (≥75%)</div>
        <div style="font-size: 20px; font-weight: 900; color: #2563eb; margin-top: 2px;">${summary.safeCount} / ${summary.totalSubjects}</div>
        <div style="font-size: 9.5px; color: #2563eb; font-weight: 600;">${summary.safeCount === summary.totalSubjects ? 'All Safe' : (summary.dangerCount + ' in Danger')}</div>
      </div>
    </div>

    <!-- Course Breakdown Table -->
    <div style="margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <h3 style="font-size: 12.5px; font-weight: 800; color: #1e293b; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">
          Course-by-Course Attendance & Bunk Analysis
        </h3>
        <span style="font-size: 10px; color: #64748b;">Target Minimum: <strong>75%</strong></span>
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 10.5px;">
        <thead>
          <tr style="background: #f1f5f9; text-align: left; color: #334155; border-bottom: 2px solid #cbd5e1;">
            <th style="padding: 7px 8px;">Code</th>
            <th style="padding: 7px 8px;">Course Name</th>
            <th style="padding: 7px 8px;">Faculty</th>
            <th style="padding: 7px 8px; text-align: center;">Attended</th>
            <th style="padding: 7px 8px; text-align: center;">Total Held</th>
            <th style="padding: 7px 8px; text-align: center;">Current %</th>
            <th style="padding: 7px 8px; text-align: center;">Min Req</th>
            <th style="padding: 7px 8px;">Exam Status & Advice</th>
          </tr>
        </thead>
        <tbody>
          ${subjects.map((s, idx) => {
            const b = calculateBunkStatus(s.attended, s.total, s.minRequiredPct);
            let rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
            let statusPill = `<span style="background: #d1fae5; color: #065f46; font-weight: 800; padding: 2px 6px; border-radius: 4px; font-size: 9.5px;">SAFE</span>`;
            if (b.status === 'danger') {
              statusPill = `<span style="background: #fee2e2; color: #991b1b; font-weight: 800; padding: 2px 6px; border-radius: 4px; font-size: 9.5px;">SHORTAGE</span>`;
            } else if (b.status === 'borderline') {
              statusPill = `<span style="background: #fef3c7; color: #92400e; font-weight: 800; padding: 2px 6px; border-radius: 4px; font-size: 9.5px;">WARNING</span>`;
            }
            return `
              <tr style="background: ${rowBg}; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 7px 8px; font-family: monospace; font-weight: 700; color: #4338ca;">${s.code || '-'}</td>
                <td style="padding: 7px 8px; font-weight: 600; color: #0f172a;">${s.name}</td>
                <td style="padding: 7px 8px; color: #475569;">${s.teacher || 'N/A'}</td>
                <td style="padding: 7px 8px; text-align: center; font-weight: 700; color: #059669;">${s.attended}</td>
                <td style="padding: 7px 8px; text-align: center; color: #334155;">${s.total}</td>
                <td style="padding: 7px 8px; text-align: center; font-weight: 800; color: ${b.status === 'danger' ? '#dc2626' : (b.status === 'borderline' ? '#d97706' : '#059669')};">
                  ${b.pct}%
                </td>
                <td style="padding: 7px 8px; text-align: center; color: #64748b;">${s.minRequiredPct}%</td>
                <td style="padding: 7px 8px;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    ${statusPill}
                    <span style="color: #334155; font-size: 10px;">${b.message}</span>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>

    <!-- Recent Session Logs (last 10) -->
    ${logs && logs.length > 0 ? `
    <div style="margin-bottom: 16px;">
      <h3 style="font-size: 11.5px; font-weight: 800; color: #1e293b; margin: 0 0 6px 0; text-transform: uppercase;">
        Recent Marked Attendance History (Last ${Math.min(10, logs.length)} sessions)
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
        <thead>
          <tr style="background: #f1f5f9; text-align: left; color: #475569; border-bottom: 1px solid #cbd5e1;">
            <th style="padding: 5px 8px;">Date & Time</th>
            <th style="padding: 5px 8px;">Code</th>
            <th style="padding: 5px 8px;">Course Name</th>
            <th style="padding: 5px 8px; text-align: center;">Marked Status</th>
          </tr>
        </thead>
        <tbody>
          ${logs.slice(0, 10).map((l, i) => {
            const dt = new Date(l.date || l.timestamp);
            const dtFormatted = dt.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            let stColor = l.status === 'present' ? '#059669' : (l.status === 'absent' ? '#dc2626' : '#64748b');
            return `
              <tr style="border-bottom: 1px solid #f1f5f9; background: ${i % 2 === 0 ? '#fff' : '#f8fafc'};">
                <td style="padding: 4px 8px; color: #64748b;">${dtFormatted}</td>
                <td style="padding: 4px 8px; font-family: monospace; font-weight: 600;">${l.code || '-'}</td>
                <td style="padding: 4px 8px; font-weight: 500;">${l.subjectName}</td>
                <td style="padding: 4px 8px; text-align: center; font-weight: 800; text-transform: uppercase; color: ${stColor};">${l.status}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <!-- Official Verification Footer -->
    <div style="border-top: 1px dashed #cbd5e1; padding-top: 10px; margin-top: 14px; display: flex; justify-content: space-between; align-items: center; font-size: 9.5px; color: #64748b;">
      <span>Official Student Academic Attendance Record &bull; Verification ID: LF-${Date.now().toString(36).toUpperCase()}</span>
      <span>LifeFlow Productivity Suite &bull; lifeflow.app</span>
    </div>
  `;

  return el;
}

function downloadAttendancePDF() {
  const subjects = getAttendanceSubjects();
  if (!subjects || subjects.length === 0) {
    showToast('No class attendance subjects found to download', 'error');
    return;
  }

  showToast('Generating official Class Attendance PDF...', 'info');
  const printable = createPrintableAttendanceElement();
  
  // Position offscreen so browser layout engine can calculate styles
  printable.style.position = 'fixed';
  printable.style.left = '-9999px';
  printable.style.top = '0';
  printable.style.zIndex = '-9999';
  document.body.appendChild(printable);

  const today = new Date().toISOString().slice(0, 10);
  const cleanFilename = `LifeFlow_Class_Attendance_${today}.pdf`;

  if (typeof html2pdf !== 'undefined') {
    const opt = {
      margin: [6, 6, 6, 6],
      filename: cleanFilename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollY: 0 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(printable).save().then(() => {
      if (document.body.contains(printable)) {
        document.body.removeChild(printable);
      }
      showToast('Attendance PDF downloaded successfully! 🎓📄', 'success');
    }).catch(err => {
      console.error('html2pdf error:', err);
      if (document.body.contains(printable)) {
        document.body.removeChild(printable);
      }
      window.print();
    });
  } else {
    if (document.body.contains(printable)) {
      document.body.removeChild(printable);
    }
    window.print();
  }
}

function exportAttendanceCSV() {
  const subjects = getAttendanceSubjects();
  if (!subjects || subjects.length === 0) {
    showToast('No class attendance subjects found to export', 'error');
    return;
  }

  const rows = [
    ['Course Code', 'Subject Name', 'Faculty / Teacher', 'Classes Attended', 'Total Classes Held', 'Missed Classes', 'Attendance %', 'Required %', 'Status', 'Bunk / Attendance Advice']
  ];

  subjects.forEach(s => {
    const b = calculateBunkStatus(s.attended, s.total, s.minRequiredPct);
    rows.push([
      `"${(s.code || '').replace(/"/g, '""')}"`,
      `"${(s.name || '').replace(/"/g, '""')}"`,
      `"${(s.teacher || '').replace(/"/g, '""')}"`,
      s.attended,
      s.total,
      s.total - s.attended,
      `"${b.pct}%"`,
      `"${s.minRequiredPct}%"`,
      `"${b.status.toUpperCase()}"`,
      `"${b.message.replace(/"/g, '""')}"`
    ]);
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  const today = new Date().toISOString().slice(0, 10);
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `LifeFlow_Class_Attendance_${today}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('Class attendance CSV exported successfully! 📊', 'success');
}


function renderAttendance() {
  const summary = getAttendanceSummary();
  const allSubjects = getAttendanceSubjects();
  const logs = getAttendanceLogs();

  let filtered = allSubjects;
  if (currentAttendanceFilter === 'safe') {
    filtered = allSubjects.filter(s => {
      const b = calculateBunkStatus(s.attended, s.total, s.minRequiredPct);
      return b.status === 'safe';
    });
  } else if (currentAttendanceFilter === 'warning') {
    filtered = allSubjects.filter(s => {
      const b = calculateBunkStatus(s.attended, s.total, s.minRequiredPct);
      return b.status === 'borderline';
    });
  } else if (currentAttendanceFilter === 'danger') {
    filtered = allSubjects.filter(s => {
      const b = calculateBunkStatus(s.attended, s.total, s.minRequiredPct);
      return b.status === 'danger';
    });
  }

  let overallColor = '#10b981';
  let statusBadge = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
  let statusText = 'Safe Zone — Eligible for Semester Exams! 🎓';
  if (allSubjects.length === 0) {
    overallColor = '#6366f1';
    statusBadge = 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
    statusText = 'No subjects added yet — Start your semester fresh! 🎓';
  } else if (summary.overallPct < 65) {
    overallColor = '#ef4444';
    statusBadge = 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800';
    statusText = 'Critical Shortage — Risk of Debarment! 🚨';
  } else if (summary.overallPct < 75) {
    overallColor = '#f59e0b';
    statusBadge = 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    statusText = 'Warning Zone — Borderline Attendance! ⚠️';
  }

  return `
    <div class="space-y-6 animate-in fade-in duration-300">
      
      <!-- Hero Attendance Command Center -->
      <div class="p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-surface-900 border border-indigo-500/20 text-white shadow-xl relative overflow-hidden">
        <div class="absolute -top-16 -right-16 w-56 h-56 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-16 -left-16 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div class="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            ${renderProgressCircle(summary.overallPct, 116, 10, overallColor, 'Overall', summary.totalAttended + '/' + summary.totalClasses)}
            <div class="space-y-1.5">
              <div class="flex flex-wrap items-center gap-2">
                <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusBadge}">
                  <span>${statusText}</span>
                </div>
                <button onclick="downloadAttendancePDF()" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer backdrop-blur-md active:scale-95" title="Extract and download attendance report PDF">
                  <i data-lucide="download" class="w-3.5 h-3.5 text-emerald-300"></i>
                  <span>Extract PDF</span>
                </button>
              </div>
              <h2 class="text-2xl font-black tracking-tight">Class Attendance & Bunk Tracker</h2>
              <p class="text-xs text-gray-300 max-w-md leading-relaxed">
                Log attendance for each subject with 1 click. Automatically calculates how many classes you can safely skip or must attend to remain exam eligible.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full md:w-auto">
            <div class="p-3 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-center">
              <span class="text-[10px] uppercase font-bold text-gray-400">Total Classes</span>
              <p class="text-lg font-black text-white mt-0.5">${summary.totalClasses}</p>
              <span class="text-[9px] text-indigo-300">${summary.totalSubjects} courses</span>
            </div>
            <div class="p-3 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-center">
              <span class="text-[10px] uppercase font-bold text-gray-400">Attended</span>
              <p class="text-lg font-black text-emerald-400 mt-0.5">${summary.totalAttended}</p>
              <span class="text-[9px] text-emerald-300">${summary.overallPct}% present</span>
            </div>
            <div class="p-3 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-center">
              <span class="text-[10px] uppercase font-bold text-gray-400">Missed</span>
              <p class="text-lg font-black text-rose-400 mt-0.5">${summary.totalAbsent}</p>
              <span class="text-[9px] text-rose-300">${summary.totalClasses - summary.totalAttended} classes</span>
            </div>
            <div class="p-3 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-center">
              <span class="text-[10px] uppercase font-bold text-gray-400">Safe Courses</span>
              <p class="text-lg font-black text-blue-400 mt-0.5">${summary.safeCount}/${summary.totalSubjects}</p>
              <span class="text-[9px] text-blue-300">≥75% target</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Controls & Filter Toolbar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1">
        <!-- Segmented Filter Pills -->
        <div class="flex items-center gap-1.5 overflow-x-auto text-xs">
          <button onclick="setAttendanceFilter('all')" class="px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${currentAttendanceFilter === 'all' ? 'bg-accent text-white shadow-xs' : 'bg-white dark:bg-surface-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-surface-700 hover:bg-gray-50 dark:hover:bg-surface-700'}">
            All Courses (${allSubjects.length})
          </button>
          <button onclick="setAttendanceFilter('safe')" class="px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${currentAttendanceFilter === 'safe' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white dark:bg-surface-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-surface-700 hover:bg-gray-50 dark:hover:bg-surface-700'}">
            🟢 Safe ≥75% (${summary.safeCount})
          </button>
          <button onclick="setAttendanceFilter('warning')" class="px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${currentAttendanceFilter === 'warning' ? 'bg-amber-600 text-white shadow-xs' : 'bg-white dark:bg-surface-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-surface-700 hover:bg-gray-50 dark:hover:bg-surface-700'}">
            🟡 Warning (${summary.warningCount})
          </button>
          <button onclick="setAttendanceFilter('danger')" class="px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${currentAttendanceFilter === 'danger' ? 'bg-rose-600 text-white shadow-xs' : 'bg-white dark:bg-surface-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-surface-700 hover:bg-gray-50 dark:hover:bg-surface-700'}">
            🔴 Shortage (${summary.dangerCount})
          </button>
        </div>

        <!-- Dedicated Attendance Actions Toolbar -->
        <div class="flex items-center gap-2 shrink-0 flex-wrap">
          <button onclick="downloadAttendancePDF()" id="btn-download-attendance-pdf" title="Extract and download complete class attendance report as PDF" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95">
            <i data-lucide="download" class="w-4 h-4"></i>
            <span>Download Attendance PDF</span>
          </button>
          <button onclick="exportAttendanceCSV()" id="btn-export-attendance-csv" title="Export attendance spreadsheet data as CSV" class="px-3 py-2 bg-white dark:bg-surface-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-surface-700 hover:bg-gray-50 dark:hover:bg-surface-700 rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95">
            <i data-lucide="file-text" class="w-4 h-4 text-emerald-600"></i>
            <span>Export CSV</span>
          </button>
          <button onclick="openAddSubjectModal()" id="btn-add-subject-modal" class="px-3.5 py-2 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95">
            <i data-lucide="plus-circle" class="w-4 h-4"></i>
            <span>+ Add Course</span>
          </button>
        </div>
      </div>

      <!-- Subject Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${allSubjects.length === 0 ? `
          <div class="col-span-full p-12 text-center bg-white dark:bg-surface-800 rounded-2xl border border-dashed border-gray-200 dark:border-surface-700 space-y-3">
            <div class="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-accent flex items-center justify-center">
              <i data-lucide="graduation-cap" class="w-7 h-7"></i>
            </div>
            <h3 class="font-bold text-base text-gray-900 dark:text-white">Welcome to Your Attendance Tracker!</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
              No subjects registered yet. Click the button below to add your courses and start tracking attendance & bunk allowance!
            </p>
            <button onclick="openAddSubjectModal()" class="px-4 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs font-bold shadow-md transition-all inline-flex items-center gap-2 cursor-pointer active:scale-95">
              <i data-lucide="plus-circle" class="w-4 h-4"></i> Add Your First Course
            </button>
          </div>
        ` : (filtered.length === 0 ? `
          <div class="col-span-full p-8 text-center bg-white dark:bg-surface-800 rounded-2xl border border-gray-200/60 dark:border-surface-700 space-y-2">
            <p class="text-sm font-semibold text-gray-600 dark:text-gray-300">No courses match the selected filter.</p>
            <button onclick="setAttendanceFilter('all')" class="text-xs text-accent font-semibold underline">Show All Courses</button>
          </div>
        ` : filtered.map(s => {
          const bunk = calculateBunkStatus(s.attended, s.total, s.minRequiredPct);
          let cardColor = '#10b981';
          let badgeBg = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
          let adviceBoxClass = 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300';
          
          if (bunk.status === 'danger') {
            cardColor = '#ef4444';
            badgeBg = 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800';
            adviceBoxClass = 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200/70 dark:border-rose-800/40 text-rose-800 dark:text-rose-300';
          } else if (bunk.status === 'borderline') {
            cardColor = '#f59e0b';
            badgeBg = 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-800';
            adviceBoxClass = 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/70 dark:border-amber-800/40 text-amber-800 dark:text-amber-300';
          }

          return `
            <div class="p-5 rounded-2xl bg-white dark:bg-surface-800 border border-gray-100 dark:border-surface-700 shadow-sm space-y-4 hover:border-accent/40 transition-all">
              
              <!-- Card Header -->
              <div class="flex items-start justify-between gap-3 pb-3 border-b border-gray-100 dark:border-surface-700">
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    ${s.code ? `<span class="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-surface-700 text-[10px] font-mono font-bold text-gray-600 dark:text-gray-300">${s.code}</span>` : ''}
                    <h3 class="font-bold text-sm text-gray-900 dark:text-white leading-tight">${s.name}</h3>
                  </div>
                  ${s.teacher ? `<p class="text-[11px] text-gray-400">Faculty: ${s.teacher}</p>` : ''}
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold px-2.5 py-1 rounded-full border ${badgeBg}">
                    ${bunk.pct}%
                  </span>
                  <button onclick="handleDeleteSubject('${s.id}')" title="Remove course" class="p-1 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-gray-100 dark:hover:bg-surface-700 transition-colors">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
              </div>

              <!-- Main Stats & Circular Progress -->
              <div class="flex flex-col sm:flex-row items-center gap-4 pt-1">
                ${renderProgressCircle(bunk.pct, 96, 8, cardColor, 'Present', `${s.attended}/${s.total}`)}
                <div class="flex-1 space-y-2 w-full text-xs">
                  <div class="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                    <span>Attended: <strong class="text-emerald-600 dark:text-emerald-400">${s.attended}</strong></span>
                    <span>Missed: <strong class="text-rose-600 dark:text-rose-400">${s.total - s.attended}</strong></span>
                    <span>Total: <strong class="text-gray-900 dark:text-white">${s.total}</strong></span>
                  </div>
                  ${renderProgressBar(bunk.pct, bunk.status === 'danger' ? 'bg-rose-500' : (bunk.status === 'borderline' ? 'bg-amber-500' : 'bg-emerald-500'), 'Attendance Threshold', `${bunk.pct}% / Target ${s.minRequiredPct}%`)}
                </div>
              </div>

              <!-- Smart Bunk / Attendance Advice Box -->
              <div class="p-3 rounded-xl border text-[11px] font-semibold leading-relaxed flex items-center gap-2 ${adviceBoxClass}">
                <i data-lucide="${bunk.status === 'safe' ? 'check-circle' : (bunk.status === 'borderline' ? 'alert-triangle' : 'alert-circle')}" class="w-4 h-4 shrink-0"></i>
                <span>${bunk.message}</span>
              </div>

              <!-- 1-Click Action Buttons -->
              <div class="grid grid-cols-4 gap-1.5 pt-1">
                <button onclick="handleMarkAttendance('${s.id}', 'present')" class="py-2 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer flex items-center justify-center gap-1">
                  <i data-lucide="check" class="w-3.5 h-3.5"></i> Present
                </button>
                <button onclick="handleMarkAttendance('${s.id}', 'absent')" class="py-2 px-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer flex items-center justify-center gap-1">
                  <i data-lucide="x" class="w-3.5 h-3.5"></i> Absent
                </button>
                <button onclick="handleMarkAttendance('${s.id}', 'cancelled')" class="py-2 px-2 bg-gray-100 dark:bg-surface-700 hover:bg-gray-200 dark:hover:bg-surface-600 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1" title="Class was cancelled / holiday">
                  <i data-lucide="slash" class="w-3.5 h-3.5"></i> Cancel
                </button>
                <button onclick="handleMarkAttendance('${s.id}', 'undo')" class="py-2 px-2 border border-gray-200 dark:border-surface-600 hover:bg-gray-100 dark:hover:bg-surface-700 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1" title="Undo last marking">
                  <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i> Undo
                </button>
              </div>

            </div>
          `;
        }).join(''))}
      </div>

      <!-- Recent Class History Log -->
      ${logs.length > 0 ? `
      <div class="p-5 rounded-2xl bg-white dark:bg-surface-800 border border-gray-100 dark:border-surface-700 shadow-sm space-y-3">
        <div class="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-surface-700">
          <h4 class="font-bold text-xs uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <i data-lucide="history" class="w-3.5 h-3.5 text-accent"></i>
            Recent Attendance Log
          </h4>
          <span class="text-[11px] text-gray-400">Last ${logs.slice(0, 8).length} marked sessions</span>
        </div>

        <div class="divide-y divide-gray-100 dark:divide-surface-700">
          ${logs.slice(0, 8).map(l => {
            const d = new Date(l.date || l.timestamp);
            const timeFormatted = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            let badge = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300';
            let icon = 'check-circle';
            if (l.status === 'absent') {
              badge = 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300';
              icon = 'x-circle';
            } else if (l.status === 'cancelled') {
              badge = 'bg-gray-100 text-gray-600 dark:bg-surface-700 dark:text-gray-300';
              icon = 'slash';
            }

            return `
              <div class="py-2.5 flex items-center justify-between text-xs">
                <div class="flex items-center gap-2.5">
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${badge} flex items-center gap-1">
                    <i data-lucide="${icon}" class="w-3 h-3"></i>
                    ${l.status}
                  </span>
                  <div>
                    <span class="font-bold text-gray-900 dark:text-white">${l.subjectName}</span>
                    ${l.code ? `<span class="text-[10px] font-mono text-gray-400 ml-1">(${l.code})</span>` : ''}
                  </div>
                </div>
                <span class="text-[11px] text-gray-400">${timeFormatted}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      ` : ''}

    </div>
  `;
}


// ========== DAILY ROUTINE ==========
function renderRoutine() {
  const routine = getRoutine();
  const checks = getTodayChecks();
  const streak = getStreak();
  const completion = getRoutineCompletion();
  const periods = ['Morning', 'Afternoon', 'Evening', 'Night'];
  const periodEmojis = { Morning: '🌅', Afternoon: '☀️', Evening: '🌆', Night: '🌙' };

  return `
    <div class="flex flex-wrap items-center gap-4 mb-6">
      <div class="flex items-center gap-2">
        <div class="streak-badge text-base">🔥 ${streak} day streak</div>
      </div>
      <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <i data-lucide="check-circle-2" class="w-4 h-4"></i>
        ${routine.filter(r => checks[r.id]).length} / ${routine.length} completed
      </div>
    </div>

    <div class="card p-5 mb-6">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium">Today's Progress</span>
        <span class="text-sm font-bold text-accent">${completion}%</span>
      </div>
      <div class="progress-bar h-3">
        <div class="fill bg-gradient-to-r from-accent to-purple-500" style="width: ${completion}%"></div>
      </div>
    </div>

    <div class="space-y-6">
      ${periods.map(period => {
        const tasks = routine.filter(r => r.period === period);
        if (tasks.length === 0) return '';
        return `
          <div>
            <h4 class="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
              ${periodEmojis[period]} ${period}
              <span class="text-xs text-gray-400">(${tasks.filter(t => checks[t.id]).length}/${tasks.length})</span>
            </h4>
            <div class="space-y-2">
              ${tasks.map(t => `
                <div class="card p-4 flex items-center gap-4 group" id="routine-${t.id}">
                  <div class="routine-checkbox ${checks[t.id] ? 'checked' : ''}" onclick="toggleRoutineCheck('${t.id}')"></div>
                  <span class="flex-1 text-sm ${checks[t.id] ? 'line-through text-gray-400' : ''} transition-all">${t.name}</span>
                  <button onclick="deleteRoutineTask('${t.id}')" class="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-danger transition-all">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function toggleRoutineCheck(taskId) {
  const checks = getTodayChecks();
  const newVal = !checks[taskId];
  setRoutineCheck(taskId, newVal);
  
  const routine = getRoutine();
  const updatedChecks = getTodayChecks();
  const allDone = routine.every(r => updatedChecks[r.id]);
  if (allDone) {
    setStreak(getStreak() + 1);
    showToast('🎉 All tasks done! Streak updated!', 'success');
  }
  
  renderPage('routine');
}

function deleteRoutineTask(id) {
  removeRoutineTask(id);
  renderPage('routine');
  showToast('Task removed', 'info');
}


// ========== STUDY ROUTINE & TIMETABLE ==========
let currentStudyFilter = 'All';

function setStudyFilter(f) {
  currentStudyFilter = f;
  renderPage('study');
}

function renderStudyRoutineSection() {
  const routine = getStudyRoutine();
  const checks = getTodayStudyChecks();
  const total = routine.length;
  const completed = routine.filter(r => checks[r.id]).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const periods = ['Morning', 'Afternoon', 'Evening', 'Night'];
  const periodEmojis = { Morning: '🌅', Afternoon: '☀️', Evening: '🌆', Night: '🌙' };

  const filtered = currentStudyFilter === 'All' 
    ? routine 
    : routine.filter(r => r.period === currentStudyFilter);

  const counts = {
    All: routine.length,
    Morning: routine.filter(r => r.period === 'Morning').length,
    Afternoon: routine.filter(r => r.period === 'Afternoon').length,
    Evening: routine.filter(r => r.period === 'Evening').length,
    Night: routine.filter(r => r.period === 'Night').length,
  };

  const subjectColors = {
    'Mathematics': 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
    'Computer Science': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    'Physics': 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800',
    'English': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    'Core Subjects': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    'Self Assessment': 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-800',
  };

  return `
    <div class="card p-6 mb-8 border border-gray-200/80 dark:border-surface-700/80 shadow-sm">
      <!-- Section Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <div class="flex items-center gap-2.5">
            <span class="p-2 rounded-xl bg-accent/10 text-accent font-bold text-lg">📚</span>
            <div>
              <h3 class="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Daily Study Routine & Timetable
                <span class="text-xs px-2.5 py-0.5 rounded-full bg-accent/10 text-accent font-semibold">${completed}/${total} Done (${percent}%)</span>
              </h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">Scheduled study blocks — check off as you complete each session</p>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="openAddStudySlotModal()" class="flex items-center gap-1.5 px-3.5 py-2 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs font-semibold shadow-sm transition-all hover:shadow-accent/25 active:scale-95">
            <i data-lucide="plus" class="w-3.5 h-3.5"></i>
            <span>Add Study Slot</span>
          </button>
        </div>
      </div>

      <!-- Completion Bar -->
      <div class="mb-5 p-3.5 rounded-xl bg-gray-50 dark:bg-surface-700/50 border border-gray-100 dark:border-surface-700">
        <div class="flex items-center justify-between text-xs font-medium mb-1.5">
          <span class="text-gray-600 dark:text-gray-300">Today's Study Progress</span>
          <span class="font-bold text-accent">${percent}% Completed</span>
        </div>
        <div class="w-full h-2.5 bg-gray-200 dark:bg-surface-600 rounded-full overflow-hidden">
          <div class="h-full bg-gradient-to-r from-accent via-indigo-500 to-blue-500 rounded-full transition-all duration-500" style="width: ${percent}%"></div>
        </div>
      </div>

      <!-- Period Filter Pills -->
      <div class="flex flex-wrap items-center gap-1.5 mb-4">
        ${['All', 'Morning', 'Afternoon', 'Evening', 'Night'].map(p => {
          const isActive = currentStudyFilter === p;
          const label = p === 'All' ? 'All Slots' : `${periodEmojis[p]} ${p}`;
          return `
            <button onclick="setStudyFilter('${p}')" class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isActive 
                ? 'bg-accent text-white shadow-sm' 
                : 'bg-gray-100 dark:bg-surface-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-surface-600'
            }">
              ${label} <span class="opacity-75 text-[11px]">(${counts[p] || 0})</span>
            </button>
          `;
        }).join('')}
      </div>

      <!-- Study Slot Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        ${filtered.length === 0 ? `
          <div class="col-span-2 py-8 text-center text-gray-400 text-xs">
            No study slots scheduled for this period. Click "+ Add Study Slot" to add one!
          </div>
        ` : filtered.map(slot => {
          const isDone = !!checks[slot.id];
          const colorClass = subjectColors[slot.subject] || 'bg-gray-100 dark:bg-surface-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600';
          return `
            <div class="group relative flex items-start gap-3.5 p-3.5 rounded-xl border transition-all ${
              isDone 
                ? 'bg-emerald-500/5 dark:bg-emerald-950/10 border-emerald-500/30' 
                : 'bg-white dark:bg-surface-700/40 border-gray-200 dark:border-surface-600 hover:border-accent/40'
            }">
              <!-- Checkbox -->
              <div onclick="toggleStudySlotCheck('${slot.id}')" class="routine-checkbox mt-0.5 ${isDone ? 'checked !bg-emerald-600 !border-emerald-600' : ''}" title="Mark completed"></div>

              <!-- Details -->
              <div class="flex-1 min-w-0">
                <div class="flex flex-wrap items-center gap-2 mb-1">
                  <span class="text-[11px] font-bold px-2 py-0.5 rounded-md border ${colorClass}">${slot.subject}</span>
                  <span class="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/60 shadow-xs">
                    <span>${periodEmojis[slot.period] || '🕒'}</span>
                    <span>${slot.time || (slot.duration + 'm')}</span>
                  </span>
                  ${isDone ? '<span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded">✓ Done</span>' : ''}
                </div>
                <h5 class="text-sm font-semibold text-gray-800 dark:text-gray-200 ${isDone ? 'line-through text-gray-400 dark:text-gray-500' : ''}">
                  ${slot.topic}
                </h5>
              </div>

              <!-- Actions: Start Focus & Delete -->
              <div class="flex items-center gap-1.5">
                <button onclick="startFocusForSlot('${slot.subject.replace(/'/g, "\\'")}', ${slot.duration || 25})" class="p-1.5 rounded-lg bg-accent/10 hover:bg-accent text-accent hover:text-white transition-all text-xs font-medium flex items-center gap-1" title="Start Focus Session with Pomodoro">
                  <i data-lucide="play" class="w-3.5 h-3.5"></i>
                  <span class="hidden xl:inline text-[11px]">Focus</span>
                </button>
                <button onclick="deleteStudySlot('${slot.id}')" class="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all" title="Remove study slot">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function toggleStudySlotCheck(id) {
  const checks = getTodayStudyChecks();
  const newState = !checks[id];
  setStudyRoutineCheck(id, newState);
  renderPage('study');
  showToast(newState ? 'Study slot completed! Great job! 🎉' : 'Study slot unmarked', 'info');
}

function startFocusForSlot(subject, duration) {
  setPomodoro(duration > 0 ? duration : 25);
  togglePomodoro();
  showToast(`Focus session started for ${subject} (${duration}m)! ⏱️`, 'success');
  const timer = document.getElementById('timer-display');
  if (timer) timer.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function deleteStudySlot(id) {
  if (confirm('Are you sure you want to remove this study routine slot?')) {
    removeStudyRoutineSlot(id);
    renderPage('study');
    showToast('Study slot removed', 'info');
  }
}

function openAddStudySlotModal() {
  const m = document.getElementById('study-slot-modal');
  if (m) m.classList.remove('hidden');
  lucide.createIcons();
}

function closeAddStudySlotModal() {
  const m = document.getElementById('study-slot-modal');
  if (m) m.classList.add('hidden');
}

function saveModalStudySlot() {
  const subject = document.getElementById('slot-modal-subject')?.value.trim();
  const topic = document.getElementById('slot-modal-topic')?.value.trim();
  const time = document.getElementById('slot-modal-time')?.value.trim();
  const duration = parseInt(document.getElementById('slot-modal-duration')?.value) || 60;
  const period = document.getElementById('slot-modal-period')?.value || 'Morning';

  if (!subject || !topic) {
    showToast('Please enter both subject and topic/goal', 'error');
    return;
  }

  addStudyRoutineSlot({
    id: 'sr_' + uid(),
    subject,
    topic,
    time: time || `${duration} min session`,
    duration,
    period
  });

  closeAddStudySlotModal();
  document.getElementById('slot-modal-subject').value = '';
  document.getElementById('slot-modal-topic').value = '';
  document.getElementById('slot-modal-time').value = '';
  renderPage('study');
  showToast('New study slot added to your routine! 📚', 'success');
}

function saveQuickStudySlot() {
  const subject = document.getElementById('qa-slot-subject')?.value.trim();
  const topic = document.getElementById('qa-slot-topic')?.value.trim();
  const time = document.getElementById('qa-slot-time')?.value.trim();
  const duration = parseInt(document.getElementById('qa-slot-duration')?.value) || 60;
  const period = document.getElementById('qa-slot-period')?.value || 'Morning';

  if (!subject || !topic) {
    showToast('Please enter both subject and topic/goal', 'error');
    return;
  }

  addStudyRoutineSlot({
    id: 'sr_' + uid(),
    subject,
    topic,
    time: time || `${duration}m session`,
    duration,
    period
  });

  closeQuickAdd();
  document.getElementById('qa-slot-subject').value = '';
  document.getElementById('qa-slot-topic').value = '';
  document.getElementById('qa-slot-time').value = '';
  if (currentPage === 'study' || currentPage === 'dashboard') {
    renderPage(currentPage);
  }
  showToast('Study routine slot added! 📚', 'success');
}

// ========== STUDY TRACKER ==========
function renderStudy() {
  const sessions = getStudySessions();
  const todayHrs = getTodayStudyHours();

  return `
    ${renderStudyRoutineSection()}

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <div class="card p-6 lg:col-span-1">
        <h4 class="text-sm font-semibold mb-4 flex items-center gap-2">
          <i data-lucide="timer" class="w-4 h-4 text-accent"></i>
          Pomodoro Timer
        </h4>
        <div class="flex flex-col items-center">
          <div class="relative w-48 h-48 mb-4">
            <svg class="w-48 h-48 timer-ring" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="88" fill="none" stroke-width="8" class="stroke-gray-200 dark:stroke-gray-700" />
              <circle id="timer-progress" cx="100" cy="100" r="88" fill="none" stroke-width="8" stroke-linecap="round"
                class="stroke-accent"
                stroke-dasharray="${2 * Math.PI * 88}"
                stroke-dashoffset="0" />
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center">
              <span id="timer-display" class="text-4xl font-bold tabular-nums">${formatTime(pomodoroSeconds)}</span>
              <span id="timer-mode" class="text-xs text-gray-400 font-medium uppercase mt-1">${pomodoroMode === 'work' ? 'Focus' : 'Break'}</span>
            </div>
          </div>
          <div class="flex gap-2 mb-4">
            <button onclick="togglePomodoro()" id="pomo-toggle" class="px-6 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-xl text-sm font-semibold transition-all active:scale-95 ${pomodoroRunning ? 'pulse-glow' : ''}">
              ${pomodoroRunning ? '⏸ Pause' : '▶ Start'}
            </button>
            <button onclick="resetPomodoro()" class="px-4 py-2.5 bg-gray-100 dark:bg-surface-700 hover:bg-gray-200 dark:hover:bg-surface-700/80 rounded-xl text-sm font-medium transition-all active:scale-95">
              <i data-lucide="rotate-ccw" class="w-4 h-4 inline"></i>
            </button>
          </div>
          <div class="flex gap-2">
            <button onclick="setPomodoro(25)" class="px-3 py-1.5 rounded-lg text-xs font-medium ${pomodoroSeconds === 25*60 && !pomodoroRunning ? 'bg-accent/10 text-accent' : 'bg-gray-100 dark:bg-surface-700 text-gray-500'} transition-all">25 min</button>
            <button onclick="setPomodoro(45)" class="px-3 py-1.5 rounded-lg text-xs font-medium ${pomodoroSeconds === 45*60 && !pomodoroRunning ? 'bg-accent/10 text-accent' : 'bg-gray-100 dark:bg-surface-700 text-gray-500'} transition-all">45 min</button>
            <button onclick="setPomodoro(5)" class="px-3 py-1.5 rounded-lg text-xs font-medium ${pomodoroSeconds === 5*60 && !pomodoroRunning ? 'bg-accent/10 text-accent' : 'bg-gray-100 dark:bg-surface-700 text-gray-500'} transition-all">5 min</button>
          </div>
        </div>
      </div>

      <div class="lg:col-span-2 space-y-6">
        <div class="grid grid-cols-2 gap-4">
          <div class="card p-5">
            <p class="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Today's Hours</p>
            <p class="text-2xl font-bold">${todayHrs}</p>
          </div>
          <div class="card p-5">
            <p class="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Total Sessions</p>
            <p class="text-2xl font-bold">${sessions.length}</p>
          </div>
        </div>
        <div class="card p-6">
          <h4 class="text-sm font-semibold mb-4">Study Hours (Last 7 Days)</h4>
          <div class="h-48">
            <canvas id="study-bar-chart"></canvas>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="card p-6">
        <h4 class="text-sm font-semibold mb-4 flex items-center gap-2">
          <i data-lucide="pie-chart" class="w-4 h-4 text-accent"></i>
          Subject Breakdown
        </h4>
        <div class="h-48 flex items-center justify-center">
          <canvas id="study-donut-chart"></canvas>
        </div>
      </div>

      <div class="lg:col-span-2 card p-6">
        <h4 class="text-sm font-semibold mb-4 flex items-center gap-2">
          <i data-lucide="clock" class="w-4 h-4 text-accent"></i>
          Recent Study Sessions
        </h4>
        <div class="space-y-2 max-h-96 overflow-y-auto pr-1">
          ${sessions.slice(0, 10).map(s => `
            <div class="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-surface-700/50 hover:bg-gray-100 dark:hover:bg-surface-700 transition-colors">
              <div class="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-lg flex-shrink-0">📖</div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-0.5">
                  <span class="text-sm font-semibold">${s.subject}</span>
                  <span class="badge badge-blue">${s.duration}m</span>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400">${s.topic}</p>
                ${s.notes ? `<p class="text-xs text-gray-400 mt-1 line-clamp-1">${s.notes}</p>` : ''}
              </div>
              <span class="text-xs text-gray-400 whitespace-nowrap">${formatDate(s.date)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function togglePomodoro() {
  if (pomodoroRunning) {
    clearInterval(pomodoroInterval);
    pomodoroRunning = false;
  } else {
    pomodoroRunning = true;
    pomodoroInterval = setInterval(() => {
      pomodoroSeconds--;
      updateTimerDisplay();
      if (pomodoroSeconds <= 0) {
        clearInterval(pomodoroInterval);
        pomodoroRunning = false;
        playAlertSound();
        showToast(pomodoroMode === 'work' ? '🎉 Focus session complete! Take a break.' : '☕ Break over! Time to focus.', 'success');
        pomodoroMode = pomodoroMode === 'work' ? 'break' : 'work';
        pomodoroSeconds = pomodoroMode === 'work' ? 25 * 60 : 5 * 60;
        renderPage('study');
      }
    }, 1000);
  }
  renderPage('study');
}

function resetPomodoro() {
  clearInterval(pomodoroInterval);
  pomodoroRunning = false;
  pomodoroMode = 'work';
  pomodoroSeconds = 25 * 60;
  renderPage('study');
}

function setPomodoro(min) {
  if (pomodoroRunning) return;
  pomodoroSeconds = min * 60;
  pomodoroMode = min <= 10 ? 'break' : 'work';
  renderPage('study');
}

function updateTimerDisplay() {
  const display = document.getElementById('timer-display');
  const progress = document.getElementById('timer-progress');
  if (display) display.textContent = formatTime(pomodoroSeconds);
  if (progress) {
    const totalSec = pomodoroMode === 'work' ? 25 * 60 : 5 * 60;
    const pct = pomodoroSeconds / totalSec;
    const circumference = 2 * Math.PI * 88;
    progress.setAttribute('stroke-dashoffset', circumference * (1 - pct));
  }
}

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(800, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch(e) {}
}

// ========== MONEY & CASHFLOW HUB ==========
let currentMoneyTab = 'inflow';
let currentIncomeSourceFilter = 'all';
function setMoneyTab(tab) {
  currentMoneyTab = tab;
  renderPage('expense');
}

function setIncomeSourceFilter(src) {
  currentIncomeSourceFilter = src;
  renderPage('expense');
}

function openQuickAddWithTab(tab) {
  openQuickAdd();
  switchQuickAddTab(tab);
}

function renderExpense() {
  const expenses = getExpenses();
  const incomes = getIncomes();
  const budget = getBudget();
  const spent = getMonthlySpent();
  const monthlyIncome = getMonthlyIncome();
  const totalIncome = getTotalIncome();
  const netSavings = monthlyIncome - spent;
  const remaining = budget - spent;
  const pct = Math.min((spent / budget) * 100, 100);
  
  let barColor = 'bg-success';
  let statusText = 'On Track';
  let statusBadge = 'badge-green';
  if (pct > 80) { barColor = 'bg-danger'; statusText = 'Over Budget!'; statusBadge = 'badge-red'; }
  else if (pct > 60) { barColor = 'bg-warning'; statusText = 'Watch Spending'; statusBadge = 'badge-yellow'; }

  // Monthly breakdown for expenses
  const catTotals = {};
  expenses.forEach(e => {
    const d = new Date(e.date);
    if (d.getMonth() === new Date().getMonth()) {
      catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
    }
  });

  // Breakdown for incomes by source
  const sourceTotals = {};
  incomes.forEach(inc => {
    sourceTotals[inc.source] = (sourceTotals[inc.source] || 0) + inc.amount;
  });

  // Filter incomes
  let filteredIncomes = incomes;
  if (currentIncomeSourceFilter !== 'all') {
    filteredIncomes = incomes.filter(i => i.source === currentIncomeSourceFilter);
  }

  return `
    <!-- Top 4 Financial Command Metric Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      
      <!-- Card 1: Total Inflow / Income -->
      <div class="card p-5 border border-emerald-200/70 dark:border-emerald-900/40 relative overflow-hidden group hover:scale-[1.02] transition-transform">
        <div class="flex items-center justify-between mb-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <i data-lucide="arrow-down-left" class="w-5 h-5"></i>
          </div>
          <span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
            ${incomes.length} Deposits
          </span>
        </div>
        <p class="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">₹${monthlyIncome.toLocaleString('en-IN')}</p>
        <p class="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-1">Total Money In (Income 💵)</p>
        <p class="text-[11px] text-gray-400 mt-0.5">Where money came from this month</p>
      </div>

      <!-- Card 2: Total Outflow / Spent -->
      <div class="card p-5 border border-rose-200/70 dark:border-rose-900/40 relative overflow-hidden group hover:scale-[1.02] transition-transform">
        <div class="flex items-center justify-between mb-3">
          <div class="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <i data-lucide="arrow-up-right" class="w-5 h-5"></i>
          </div>
          <span class="text-[11px] font-bold px-2 py-0.5 rounded-full ${statusBadge}">
            ${statusText}
          </span>
        </div>
        <p class="text-2xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight">₹${spent.toLocaleString('en-IN')}</p>
        <p class="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-1">Total Spent (Expenses 💳)</p>
        <p class="text-[11px] text-gray-400 mt-0.5">${Math.round(pct)}% of monthly budget</p>
      </div>

      <!-- Card 3: Net Cashflow / Savings -->
      <div class="card p-5 border border-indigo-200/70 dark:border-indigo-900/40 relative overflow-hidden group hover:scale-[1.02] transition-transform">
        <div class="flex items-center justify-between mb-3">
          <div class="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-accent">
            <i data-lucide="piggy-bank" class="w-5 h-5"></i>
          </div>
          <span class="text-[11px] font-bold px-2 py-0.5 rounded-full ${netSavings >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'}">
            ${netSavings >= 0 ? 'Surplus (+)' : 'Deficit (-)'}
          </span>
        </div>
        <p class="text-2xl font-extrabold ${netSavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} tracking-tight">
          ${netSavings >= 0 ? '+' : ''}₹${netSavings.toLocaleString('en-IN')}
        </p>
        <p class="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-1">Net Savings</p>
        <p class="text-[11px] text-gray-400 mt-0.5">Inflow minus outflow</p>
      </div>

      <!-- Card 4: Monthly Budget Meter -->
      <div class="card p-5 border border-amber-200/70 dark:border-amber-900/40 relative overflow-hidden group hover:scale-[1.02] transition-transform">
        <div class="flex items-center justify-between mb-3">
          <div class="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <i data-lucide="wallet" class="w-5 h-5"></i>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] text-gray-400">Budget:</span>
            <input type="number" value="${budget}" onchange="updateBudget(this.value)" 
              class="w-16 px-1.5 py-0.5 rounded border border-gray-200 dark:border-surface-600 bg-gray-50 dark:bg-surface-700 text-xs font-bold outline-none text-right" />
          </div>
        </div>
        <p class="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">₹${remaining.toLocaleString('en-IN')}</p>
        <p class="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-1">Remaining Budget</p>
        <div class="w-full h-1.5 bg-gray-100 dark:bg-surface-700 rounded-full overflow-hidden mt-2">
          <div class="h-full ${barColor} rounded-full" style="width: ${pct}%"></div>
        </div>
      </div>
    </div>

    <!-- Main Navigation Bar & Quick Actions -->
    <div class="card p-6 border border-gray-200/80 dark:border-surface-700/80 shadow-xs mb-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100 dark:border-surface-700">
        <div>
          <h3 class="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>💰 Money Flow & Finance Hub</span>
          </h3>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Track every rupee coming in (Income) and going out (Expenses)</p>
        </div>
        
        <!-- Two Quick Action Buttons -->
        <div class="flex items-center gap-2.5">
          <button onclick="openAddIncomeModal()" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all hover:shadow-emerald-600/25 active:scale-95 flex items-center gap-1.5 cursor-pointer">
            <i data-lucide="plus" class="w-4 h-4"></i>
            <span>+ Add Income (Money In 💵)</span>
          </button>
          <button onclick="openQuickAddWithTab('expense')" class="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-surface-700 dark:hover:bg-surface-600 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-semibold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer">
            <i data-lucide="minus" class="w-4 h-4 text-rose-500"></i>
            <span>+ Add Expense (Money Out 💳)</span>
          </button>
        </div>
      </div>

      <!-- Segmented Navigation Tabs -->
      <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div class="flex flex-wrap items-center gap-1 p-1 bg-gray-100 dark:bg-surface-700 rounded-xl text-xs">
          <button onclick="setMoneyTab('inflow')" class="px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer ${currentMoneyTab === 'inflow' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'}">
            🟢 Money In / Income • ${incomes.length}
          </button>
          <button onclick="setMoneyTab('outflow')" class="px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer ${currentMoneyTab === 'outflow' ? 'bg-rose-600 text-white shadow-xs' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'}">
            🔴 Money Out / Expenses • ${expenses.length}
          </button>
          <button onclick="setMoneyTab('combined')" class="px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer ${currentMoneyTab === 'combined' ? 'bg-accent text-white shadow-xs' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'}">
            🔄 Combined Flow (All)
          </button>
          <button onclick="setMoneyTab('sources')" class="px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer ${currentMoneyTab === 'sources' ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'}">
            🏷️ Sources Breakdown
          </button>
        </div>
      </div>

      <!-- Tab Content Area -->
      ${renderMoneyActiveTab(currentMoneyTab, filteredIncomes, expenses, incomes, catTotals, sourceTotals, totalIncome)}
    </div>
  `;
}

function renderMoneyActiveTab(tab, filteredIncomes, expenses, allIncomes, catTotals, sourceTotals, totalIncome) {
  if (tab === 'inflow') {
    return renderInflowTabContent(filteredIncomes, allIncomes, sourceTotals);
  } else if (tab === 'outflow') {
    return renderOutflowTabContent(expenses, catTotals);
  } else if (tab === 'combined') {
    return renderCombinedTabContent(allIncomes, expenses);
  } else if (tab === 'sources') {
    return renderSourcesTabContent(allIncomes, sourceTotals, totalIncome);
  }
  return '';
}

// Sub-Tab 1: INFLOW
function renderInflowTabContent(filteredIncomes, allIncomes, sourceTotals) {
  const sources = [
    'Parents / Pocket Money',
    'Salary / Stipend',
    'Freelance / Projects',
    'Tuition / Teaching',
    'Gift / Reward',
    'Udhar Return',
    'Refund / Cashback',
    'Investments',
    'Other'
  ];

  return `
    <!-- Quick Source Summary Badges -->
    <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 mb-6">
      ${Object.keys(sourceTotals).map(src => `
        <div onclick="setIncomeSourceFilter('${src}')" class="p-3 rounded-xl border transition-all cursor-pointer ${currentIncomeSourceFilter === src ? 'border-emerald-500 bg-emerald-500/5' : 'border-gray-200/70 dark:border-surface-700 hover:border-emerald-400/50 bg-gray-50/50 dark:bg-surface-700/30'}">
          <div class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span>${getIncomeSourceEmoji(src)}</span>
            <span class="truncate font-medium">${src.split(' / ')[0]}</span>
          </div>
          <p class="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">₹${sourceTotals[src].toLocaleString('en-IN')}</p>
        </div>
      `).join('')}
    </div>

    <!-- Filter Pills Bar -->
    <div class="flex flex-wrap items-center gap-1.5 mb-4 pb-3 border-b border-gray-100 dark:border-surface-700">
      <span class="text-xs text-gray-400 mr-1 font-medium">Filter Source:</span>
      <button onclick="setIncomeSourceFilter('all')" class="px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${currentIncomeSourceFilter === 'all' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-gray-100 dark:bg-surface-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}">
        All Sources (${allIncomes.length})
      </button>
      ${sources.filter(s => sourceTotals[s]).map(s => `
        <button onclick="setIncomeSourceFilter('${s}')" class="px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${currentIncomeSourceFilter === s ? 'bg-emerald-600 text-white shadow-xs' : 'bg-gray-100 dark:bg-surface-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}">
          ${getIncomeSourceEmoji(s)} ${s.split(' / ')[0]} (${allIncomes.filter(i => i.source === s).length})
        </button>
      `).join('')}
    </div>

    <!-- Income Entries List -->
    <div id="income-list" class="space-y-2.5">
      ${filteredIncomes.length === 0 ? `
        <div class="py-12 text-center text-gray-400 space-y-3">
          <div class="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center text-xl">💵</div>
          <div>
            <p class="text-sm font-semibold text-gray-700 dark:text-gray-300">No income records found</p>
            <p class="text-xs text-gray-400 mt-0.5">Click below to record money received from parents, freelance, salary, etc.</p>
          </div>
          <button onclick="openAddIncomeModal()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95 inline-flex items-center gap-1.5 cursor-pointer">
            <i data-lucide="plus" class="w-3.5 h-3.5"></i>
            <span>+ Add Income Entry</span>
          </button>
        </div>
      ` : filteredIncomes.map(inc => `
        <div class="income-row flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-gray-50 dark:bg-surface-700/50 hover:bg-gray-100 dark:hover:bg-surface-700 border border-gray-200/60 dark:border-surface-600/60 transition-all" id="inc-${inc.id}">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-xl ${getIncomeSourceClass(inc.source)} flex items-center justify-center text-lg flex-shrink-0">
              ${getIncomeSourceEmoji(inc.source)}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <p class="text-sm font-bold text-gray-900 dark:text-white truncate">${inc.description || 'Income received'}</p>
                <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full ${getIncomeSourceClass(inc.source)} whitespace-nowrap">
                  ${inc.source}
                </span>
              </div>
              <p class="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                <span>💳 ${inc.payment || 'UPI'}</span>
                <span>•</span>
                <span>📅 ${formatDate(inc.date)}</span>
              </p>
            </div>
          </div>

          <div class="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-surface-700">
            <span class="text-base font-extrabold text-emerald-600 dark:text-emerald-400 whitespace-nowrap mr-1">+₹${inc.amount.toLocaleString('en-IN')}</span>

            <!-- 3-Step Delete Flow for Income -->
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <button onclick="deleteIncomeStep1('${inc.id}')" class="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-danger transition-all cursor-pointer" title="Delete" data-inc-del-trigger="${inc.id}">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>

              <div class="delete-step" data-inc-del-step2="${inc.id}">
                <button onclick="deleteIncomeStep2('${inc.id}')" class="flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold hover:bg-amber-200 cursor-pointer">
                  <i data-lucide="alert-triangle" class="w-3 h-3"></i> Delete?
                </button>
                <button onclick="deleteIncomeCancel('${inc.id}')" class="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 cursor-pointer" title="Cancel">
                  <i data-lucide="x" class="w-3.5 h-3.5"></i>
                </button>
              </div>

              <div class="delete-step" data-inc-del-step3="${inc.id}">
                <button onclick="deleteIncomeConfirm('${inc.id}')" class="flex items-center gap-1 px-3 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold active:scale-95 shadow-sm cursor-pointer">
                  <i data-lucide="check" class="w-3 h-3"></i> Yes, Remove
                </button>
                <button onclick="deleteIncomeCancel('${inc.id}')" class="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 cursor-pointer" title="Cancel">
                  <i data-lucide="x" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// Sub-Tab 2: OUTFLOW
function renderOutflowTabContent(expenses, catTotals) {
  return `
    <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
      ${['Food', 'Study Material', 'Travel', 'Entertainment', 'Bills'].map(cat => `
        <div class="card p-4 text-center">
          <span class="text-lg">${getCatEmoji(cat)}</span>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${cat}</p>
          <p class="text-sm font-bold mt-1">₹${(catTotals[cat] || 0).toLocaleString('en-IN')}</p>
        </div>
      `).join('')}
    </div>

    <div class="flex items-center justify-between mb-4">
      <h4 class="text-sm font-semibold flex items-center gap-2">
        <i data-lucide="list" class="w-4 h-4 text-accent"></i>
        Recent Expenses
      </h4>
      <div class="flex gap-2">
        <select id="expense-cat-filter" onchange="filterExpenses()" class="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-surface-700 text-xs outline-none">
          <option value="all">All Categories</option>
          <option value="Food">🍔 Food</option>
          <option value="Study Material">📚 Study</option>
          <option value="Travel">🚗 Travel</option>
          <option value="Entertainment">🎬 Entertainment</option>
          <option value="Bills">📄 Bills</option>
        </select>
      </div>
    </div>
    <div id="expense-list" class="space-y-2">
      ${renderExpenseList(expenses)}
    </div>
  `;
}

// Sub-Tab 3: COMBINED FLOW
function renderCombinedTabContent(incomes, expenses) {
  const merged = [
    ...incomes.map(i => ({ ...i, flow: 'in' })),
    ...expenses.map(e => ({ ...e, flow: 'out' }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return `
    <div class="space-y-2.5">
      ${merged.length === 0 ? '<p class="text-center py-8 text-gray-400 text-xs">No transactions recorded yet.</p>' : merged.map(t => {
        const isIn = t.flow === 'in';
        return `
          <div class="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-surface-700/50 hover:bg-gray-100 dark:hover:bg-surface-700 border border-gray-200/60 dark:border-surface-600/60 transition-all">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-xl ${isIn ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'} flex items-center justify-center text-lg flex-shrink-0">
                ${isIn ? getIncomeSourceEmoji(t.source) : getCatEmoji(t.category)}
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <p class="text-sm font-bold text-gray-900 dark:text-white truncate">${t.description}</p>
                  <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full ${isIn ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'}">
                    ${isIn ? 'INFLOW (Received)' : 'OUTFLOW (Spent)'}
                  </span>
                </div>
                <p class="text-xs text-gray-400 mt-0.5">
                  ${isIn ? t.source : t.category} • ${t.payment} • ${formatDate(t.date)}
                </p>
              </div>
            </div>
            <span class="text-base font-extrabold ${isIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-danger'} whitespace-nowrap">
              ${isIn ? '+' : '-'}₹${t.amount.toLocaleString('en-IN')}
            </span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Sub-Tab 4: SOURCES BREAKDOWN
function renderSourcesTabContent(incomes, sourceTotals, totalIncome) {
  const sources = Object.keys(sourceTotals);
  return `
    <div class="space-y-6">
      <div>
        <h4 class="text-sm font-bold text-gray-900 dark:text-white mb-1">Income Sources Analytics</h4>
        <p class="text-xs text-gray-400">Detailed breakdown of total revenue by origin</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        ${sources.map(src => {
          const total = sourceTotals[src];
          const pct = totalIncome > 0 ? Math.round((total / totalIncome) * 100) : 0;
          const count = incomes.filter(i => i.source === src).length;
          return `
            <div class="p-5 rounded-2xl border border-gray-200/70 dark:border-surface-700 bg-white dark:bg-surface-800/60 shadow-xs space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                  <span class="text-2xl">${getIncomeSourceEmoji(src)}</span>
                  <div>
                    <h5 class="font-bold text-sm text-gray-900 dark:text-white">${src}</h5>
                    <p class="text-[11px] text-gray-400">${count} deposit${count > 1 ? 's' : ''}</p>
                  </div>
                </div>
                <span class="px-2 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  ${pct}%
                </span>
              </div>
              <div>
                <p class="text-2xl font-black text-emerald-600 dark:text-emerald-400">₹${total.toLocaleString('en-IN')}</p>
                <div class="w-full h-2 bg-gray-100 dark:bg-surface-700 rounded-full overflow-hidden mt-2">
                  <div class="h-full bg-emerald-500 rounded-full" style="width: ${pct}%"></div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderExpenseList(expenses) {
  return expenses.slice(0, 15).map(e => `
    <div class="expense-row flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-surface-700/50 hover:bg-gray-100 dark:hover:bg-surface-700 transition-colors" id="exp-${e.id}">
      <div class="w-10 h-10 rounded-lg ${getCatClass(e.category)} flex items-center justify-center text-lg flex-shrink-0">${getCatEmoji(e.category)}</div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium truncate">${e.description}</p>
        <p class="text-xs text-gray-400">${e.category} • ${e.payment} • ${formatDate(e.date)}</p>
      </div>
      <span class="text-sm font-bold text-danger whitespace-nowrap mr-1">-₹${e.amount.toLocaleString('en-IN')}</span>

      <!-- 3-STEP DELETE -->
      <div class="flex items-center gap-1.5 flex-shrink-0">
        <button onclick="deleteStep1('${e.id}')" class="delete-btn-step1 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-danger transition-all cursor-pointer" title="Delete" data-del-trigger="${e.id}">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>

        <div class="delete-step" data-del-step2="${e.id}">
          <button onclick="deleteStep2('${e.id}')" class="flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold hover:bg-amber-200 cursor-pointer">
            <i data-lucide="alert-triangle" class="w-3 h-3"></i> Delete?
          </button>
          <button onclick="deleteCancel('${e.id}')" class="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 cursor-pointer" title="Cancel">
            <i data-lucide="x" class="w-3.5 h-3.5"></i>
          </button>
        </div>

        <div class="delete-step" data-del-step3="${e.id}">
          <button onclick="deleteConfirm('${e.id}')" class="flex items-center gap-1 px-3 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold active:scale-95 shadow-sm cursor-pointer">
            <i data-lucide="check" class="w-3 h-3"></i> Yes, Remove
          </button>
          <button onclick="deleteCancel('${e.id}')" class="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 cursor-pointer" title="Cancel">
            <i data-lucide="x" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// ========== 3-STEP DELETE FLOW FOR EXPENSES ==========
function deleteStep1(id) {
  const trigger = document.querySelector('[data-del-trigger="' + id + '"]');
  const step2 = document.querySelector('[data-del-step2="' + id + '"]');
  if (trigger) trigger.style.display = 'none';
  if (step2) step2.classList.add('active');
  lucide.createIcons();
}

function deleteStep2(id) {
  const step2 = document.querySelector('[data-del-step2="' + id + '"]');
  const step3 = document.querySelector('[data-del-step3="' + id + '"]');
  if (step2) step2.classList.remove('active');
  if (step3) step3.classList.add('active');
  lucide.createIcons();
}

function deleteCancel(id) {
  const trigger = document.querySelector('[data-del-trigger="' + id + '"]');
  const step2 = document.querySelector('[data-del-step2="' + id + '"]');
  const step3 = document.querySelector('[data-del-step3="' + id + '"]');
  if (trigger) trigger.style.display = '';
  if (step2) step2.classList.remove('active');
  if (step3) step3.classList.remove('active');
}

function deleteConfirm(id) {
  const row = document.getElementById('exp-' + id);
  if (row) {
    row.classList.add('deleting');
    setTimeout(function() {
      deleteExpense(id);
      showToast('Transaction deleted successfully', 'success');
      const filterEl = document.getElementById('expense-cat-filter');
      const cat = filterEl ? filterEl.value : 'all';
      let exps = getExpenses();
      if (cat !== 'all') exps = exps.filter(function(e) { return e.category === cat; });
      const el = document.getElementById('expense-list');
      if (el) el.innerHTML = renderExpenseList(exps);
      lucide.createIcons();
    }, 400);
  }
}

// ========== 3-STEP DELETE FLOW FOR INCOMES ==========
function deleteIncomeStep1(id) {
  const trigger = document.querySelector('[data-inc-del-trigger="' + id + '"]');
  const step2 = document.querySelector('[data-inc-del-step2="' + id + '"]');
  if (trigger) trigger.style.display = 'none';
  if (step2) step2.classList.add('active');
  lucide.createIcons();
}

function deleteIncomeStep2(id) {
  const step2 = document.querySelector('[data-inc-del-step2="' + id + '"]');
  const step3 = document.querySelector('[data-inc-del-step3="' + id + '"]');
  if (step2) step2.classList.remove('active');
  if (step3) step3.classList.add('active');
  lucide.createIcons();
}

function deleteIncomeCancel(id) {
  const trigger = document.querySelector('[data-inc-del-trigger="' + id + '"]');
  const step2 = document.querySelector('[data-inc-del-step2="' + id + '"]');
  const step3 = document.querySelector('[data-inc-del-step3="' + id + '"]');
  if (trigger) trigger.style.display = '';
  if (step2) step2.classList.remove('active');
  if (step3) step3.classList.remove('active');
}

function deleteIncomeConfirm(id) {
  const row = document.getElementById('inc-' + id);
  if (row) {
    row.classList.add('deleting');
    setTimeout(function() {
      deleteIncome(id);
      showToast('Income entry deleted successfully', 'success');
      if (currentPage === 'expense' || currentPage === 'dashboard') {
        renderPage(currentPage);
      }
    }, 350);
  } else {
    deleteIncome(id);
    renderPage('expense');
  }
}

function updateBudget(val) {
  const v = parseInt(val);
  if (v > 0) {
    setBudget(v);
    showToast('Budget updated!', 'success');
    renderPage('expense');
  }
}

// ========== ADD INCOME MODAL CONTROLS ==========
function openAddIncomeModal() {
  const m = document.getElementById('add-income-modal');
  if (m) m.classList.remove('hidden');
  const d = document.getElementById('income-modal-date');
  if (d) d.value = todayStr();
  const amt = document.getElementById('income-modal-amount');
  if (amt) {
    amt.value = '';
    setTimeout(() => amt.focus(), 60);
  }
  lucide.createIcons();
}

function closeAddIncomeModal() {
  const m = document.getElementById('add-income-modal');
  if (m) m.classList.add('hidden');
}

function setIncomePreset(val) {
  const input = document.getElementById('income-modal-amount');
  if (input) {
    const cur = parseFloat(input.value) || 0;
    input.value = cur + val;
  }
}

function saveIncomeFromModal() {
  const amount = parseFloat(document.getElementById('income-modal-amount')?.value);
  const source = document.getElementById('income-modal-source')?.value || 'Parents / Pocket Money';
  const payment = document.getElementById('income-modal-payment')?.value || 'UPI';
  const desc = document.getElementById('income-modal-desc')?.value.trim();
  const date = document.getElementById('income-modal-date')?.value || todayStr();

  if (!amount || amount <= 0) {
    showToast('Please enter a valid amount', 'error');
    return;
  }
  if (!desc) {
    showToast('Please enter a description', 'error');
    return;
  }

  addIncomeEntry({
    id: 'inc_' + uid(),
    amount,
    source,
    payment,
    description: desc,
    date
  });

  closeAddIncomeModal();
  document.getElementById('income-modal-amount').value = '';
  document.getElementById('income-modal-desc').value = '';

  if (currentPage === 'expense' || currentPage === 'dashboard') {
    renderPage(currentPage);
  }
  showToast(`Recorded ₹${amount.toLocaleString('en-IN')} received from ${source}! 💵`, 'success');
}

// ========== GOALS & PLANS ==========
function renderGoals() {
  const goals = getGoals();
  const categories = ['Short-term', 'Long-term', 'Academic'];
  const catColors = { 'Short-term': 'blue', 'Long-term': 'purple', 'Academic': 'green' };
  const catEmojis = { 'Short-term': '⚡', 'Long-term': '🎯', 'Academic': '🎓' };

  return `
    <div class="flex justify-end mb-6">
      <button onclick="showAddGoal()" class="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-lg text-sm font-medium transition-all hover:shadow-lg hover:shadow-accent/25 active:scale-95">
        <i data-lucide="plus" class="w-4 h-4"></i> New Goal
      </button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      ${categories.map(cat => {
        const catGoals = goals.filter(g => g.category === cat);
        return `
          <div class="kanban-col">
            <div class="flex items-center gap-2 mb-4">
              <span class="text-lg">${catEmojis[cat]}</span>
              <h4 class="text-sm font-semibold">${cat}</h4>
              <span class="badge badge-${catColors[cat]}">${catGoals.length}</span>
            </div>
            <div class="space-y-4">
              ${catGoals.map(g => {
                const progress = getGoalProgress(g);
                const days = getDaysLeft(g.dueDate);
                return `
                  <div class="card goal-card p-5">
                    <div class="flex items-start justify-between mb-3">
                      <h5 class="text-sm font-semibold leading-tight flex-1 pr-2">${g.title}</h5>
                      ${days > 0 ? `<span class="badge ${days <= 7 ? 'badge-red' : days <= 30 ? 'badge-yellow' : 'badge-green'} whitespace-nowrap">${days}d left</span>` : days === 0 ? `<span class="badge badge-yellow">Due today</span>` : `<span class="badge badge-red">Overdue</span>`}
                    </div>
                    <div class="space-y-2 mb-3">
                      ${g.milestones.map(m => `
                        <div class="flex items-center gap-2.5">
                          <div class="routine-checkbox ${m.done ? 'checked' : ''}" onclick="toggleMilestone('${g.id}', '${m.id}')" style="width:16px;height:16px;border-radius:4px;"></div>
                          <span class="text-xs ${m.done ? 'line-through text-gray-400' : ''}">${m.text}</span>
                        </div>
                      `).join('')}
                    </div>
                    <div class="flex items-center gap-2">
                      <div class="progress-bar flex-1 h-1.5">
                        <div class="fill ${progress === 100 ? 'bg-success' : 'bg-accent'}" style="width:${progress}%"></div>
                      </div>
                      <span class="text-xs font-semibold text-gray-400">${progress}%</span>
                    </div>
                  </div>
                `;
              }).join('')}
              ${catGoals.length === 0 ? `<div class="p-8 text-center text-sm text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">No goals yet</div>` : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <div id="add-goal-form" class="hidden mt-8 card p-6">
      <h4 class="text-sm font-semibold mb-4">Create New Goal</h4>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block text-xs font-medium mb-1 text-gray-500">Title</label>
          <input type="text" id="goal-title" placeholder="Goal title..." class="input-field w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-surface-700 text-sm outline-none focus:ring-2 focus:ring-accent/30" />
        </div>
        <div>
          <label class="block text-xs font-medium mb-1 text-gray-500">Category</label>
          <select id="goal-category" class="input-field w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-surface-700 text-sm outline-none focus:ring-2 focus:ring-accent/30">
            <option value="Short-term">⚡ Short-term</option>
            <option value="Long-term">🎯 Long-term</option>
            <option value="Academic">🎓 Academic</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium mb-1 text-gray-500">Due Date</label>
          <input type="date" id="goal-due" class="input-field w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-surface-700 text-sm outline-none focus:ring-2 focus:ring-accent/30" />
        </div>
        <div>
          <label class="block text-xs font-medium mb-1 text-gray-500">Milestones (comma separated)</label>
          <input type="text" id="goal-milestones" placeholder="Step 1, Step 2, Step 3" class="input-field w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-surface-700 text-sm outline-none focus:ring-2 focus:ring-accent/30" />
        </div>
      </div>
      <div class="flex gap-2">
        <button onclick="saveNewGoal()" class="px-6 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-xl text-sm font-semibold transition-all active:scale-95">Save Goal</button>
        <button onclick="hideAddGoal()" class="px-6 py-2.5 bg-gray-100 dark:bg-surface-700 rounded-xl text-sm font-medium transition-all">Cancel</button>
      </div>
    </div>
  `;
}

function toggleMilestone(goalId, milestoneId) {
  const goals = getGoals();
  const goal = goals.find(g => g.id === goalId);
  if (!goal) return;
  const ms = goal.milestones.find(m => m.id === milestoneId);
  if (!ms) return;
  ms.done = !ms.done;
  saveGoals(goals);
  
  const progress = getGoalProgress(goal);
  if (progress === 100) {
    showToast(`🎉 "${goal.title}" completed!`, 'success');
  }
  renderPage('goals');
}

function showAddGoal() {
  document.getElementById('add-goal-form').classList.remove('hidden');
}
function hideAddGoal() {
  document.getElementById('add-goal-form').classList.add('hidden');
}

function saveNewGoal() {
  const title = document.getElementById('goal-title').value.trim();
  const category = document.getElementById('goal-category').value;
  const due = document.getElementById('goal-due').value;
  const milestonesStr = document.getElementById('goal-milestones').value.trim();

  if (!title) { showToast('Please enter a title', 'error'); return; }
  if (!due) { showToast('Please select a due date', 'error'); return; }

  const milestones = milestonesStr ? milestonesStr.split(',').map(m => ({
    id: uid(), text: m.trim(), done: false
  })) : [{ id: uid(), text: 'Get started', done: false }];

  const goals = getGoals();
  goals.push({ id: uid(), title, category, dueDate: due, milestones });
  saveGoals(goals);
  showToast('Goal created!', 'success');
  renderPage('goals');
}

// ========== CHARTS ==========
function initCharts() {
  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(51,65,85,0.3)' : 'rgba(226,232,240,0.5)';

  const barCtx = document.getElementById('study-bar-chart') || document.getElementById('dashboard-study-chart');
  if (barCtx) {
    const labels = [];
    const data = [];
    const sessions = getStudySessions();
    for (let i = 6; i >= 0; i--) {
      const d = daysAgo(i);
      const dayName = new Date(d).toLocaleDateString('en-IN', { weekday: 'short' });
      labels.push(dayName);
      const dayMin = sessions.filter(s => s.date === d).reduce((sum, s) => sum + s.duration, 0);
      data.push(+(dayMin / 60).toFixed(1));
    }
    chartInstances['bar'] = new Chart(barCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Hours',
          data,
          backgroundColor: 'rgba(99,102,241,0.7)',
          borderRadius: 8,
          borderSkipped: false,
          maxBarThickness: 40,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: textColor, font: { size: 11 } } },
          y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 } }, beginAtZero: true },
        }
      }
    });
  }

  const donutCtx = document.getElementById('study-donut-chart');
  if (donutCtx) {
    const sessions = getStudySessions();
    const subjectMap = {};
    sessions.forEach(s => {
      subjectMap[s.subject] = (subjectMap[s.subject] || 0) + s.duration;
    });
    const subjects = Object.keys(subjectMap);
    const values = Object.values(subjectMap);
    const colors = ['#6366f1', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#ec4899'];
    chartInstances['donut'] = new Chart(donutCtx, {
      type: 'doughnut',
      data: {
        labels: subjects,
        datasets: [{
          data: values,
          backgroundColor: colors.slice(0, subjects.length),
          borderWidth: 0,
          hoverOffset: 8,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { color: textColor, font: { size: 11 }, padding: 12, usePointStyle: true, pointStyleWidth: 8 } },
        }
      }
    });
  }
}

// ========== QUICK ADD MODAL ==========
function openQuickAdd() {
  const modal = document.getElementById('quick-add-modal');
  modal.classList.remove('hidden');
  modal.classList.add('show');
  const today = todayStr();
  const expDate = document.getElementById('qa-expense-date');
  const studyDate = document.getElementById('qa-study-date');
  if (expDate) expDate.value = today;
  if (studyDate) studyDate.value = today;
  lucide.createIcons();
}

function closeQuickAdd() {
  const modal = document.getElementById('quick-add-modal');
  modal.classList.remove('show');
  modal.classList.add('hidden');
}

function switchQuickAddTab(tab) {
  document.querySelectorAll('.qa-tab').forEach(el => el.classList.remove('active'));
  document.querySelector(`[data-qa-tab="${tab}"]`).classList.add('active');
  document.querySelectorAll('.qa-form').forEach(el => el.classList.add('hidden'));
  document.getElementById(`qa-form-${tab}`).classList.remove('hidden');
}

function saveIncome() {
  const amount = parseFloat(document.getElementById('qa-income-amount')?.value);
  const source = document.getElementById('qa-income-source')?.value || 'Parents / Pocket Money';
  const payment = document.getElementById('qa-income-payment')?.value || 'UPI';
  const desc = document.getElementById('qa-income-desc')?.value.trim();
  const date = document.getElementById('qa-income-date')?.value || todayStr();

  if (!amount || amount <= 0) {
    showToast('Enter a valid amount', 'error');
    return;
  }
  if (!desc) {
    showToast('Enter a description / reason', 'error');
    return;
  }

  addIncomeEntry({
    id: 'inc_' + uid(),
    amount,
    source,
    payment,
    description: desc,
    date
  });

  closeQuickAdd();
  showToast(`Recorded ₹${amount.toLocaleString('en-IN')} received from ${source}! 💵`, 'success');
  if (currentPage === 'expense' || currentPage === 'dashboard') {
    renderPage(currentPage);
  }
  document.getElementById('qa-income-amount').value = '';
  document.getElementById('qa-income-desc').value = '';
}

function saveExpense() {
  const amount = parseFloat(document.getElementById('qa-expense-amount').value);
  const category = document.getElementById('qa-expense-category').value;
  const payment = document.getElementById('qa-expense-payment').value;
  const desc = document.getElementById('qa-expense-desc').value.trim();
  const date = document.getElementById('qa-expense-date').value;

  if (!amount || amount <= 0) { showToast('Enter a valid amount', 'error'); return; }
  if (!desc) { showToast('Enter a description', 'error'); return; }

  addExpenseEntry({ id: uid(), amount, category, payment, description: desc, date: date || todayStr() });
  closeQuickAdd();
  showToast('Expense saved!', 'success');
  if (currentPage === 'expense' || currentPage === 'dashboard') renderPage(currentPage);
  document.getElementById('qa-expense-amount').value = '';
  document.getElementById('qa-expense-desc').value = '';
}

function saveStudySession() {
  const subject = document.getElementById('qa-study-subject').value.trim();
  const topic = document.getElementById('qa-study-topic').value.trim();
  const duration = parseInt(document.getElementById('qa-study-duration').value);
  const date = document.getElementById('qa-study-date').value;
  const notes = document.getElementById('qa-study-notes').value.trim();

  if (!subject) { showToast('Enter a subject', 'error'); return; }
  if (!duration || duration <= 0) { showToast('Enter a valid duration', 'error'); return; }

  addStudySession({ id: uid(), subject, topic: topic || 'General', duration, date: date || todayStr(), notes });
  closeQuickAdd();
  showToast('Study session logged!', 'success');
  if (currentPage === 'study' || currentPage === 'dashboard') renderPage(currentPage);
  document.getElementById('qa-study-subject').value = '';
  document.getElementById('qa-study-topic').value = '';
  document.getElementById('qa-study-duration').value = '';
  document.getElementById('qa-study-notes').value = '';
}

function saveRoutineTask() {
  const name = document.getElementById('qa-routine-name').value.trim();
  const period = document.getElementById('qa-routine-time').value;

  if (!name) { showToast('Enter a task name', 'error'); return; }

  addRoutineTask({ id: uid(), name, period });
  closeQuickAdd();
  showToast('Routine task added!', 'success');
  if (currentPage === 'routine') renderPage('routine');
  document.getElementById('qa-routine-name').value = '';
}

// ========== HELPERS ==========
function getCatEmoji(cat) {
  const map = { Food: '🍔', 'Study Material': '📚', Travel: '🚗', Entertainment: '🎬', Bills: '📄' };
  return map[cat] || '💰';
}
function getCatClass(cat) {
  const map = { Food: 'cat-food', 'Study Material': 'cat-study', Travel: 'cat-travel', Entertainment: 'cat-entertainment', Bills: 'cat-bills' };
  return map[cat] || 'cat-food';
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const diffDays = Math.floor((today - d) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('leaving');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ========== DATABASE & CLOUD SYNC MODAL ==========

function openDbModal() {
  const modal = document.getElementById('db-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  
  const config = getSupabaseConfig();
  const urlInput = document.getElementById('supabase-url-input');
  const keyInput = document.getElementById('supabase-key-input');
  if (urlInput) urlInput.value = config.url || '';
  if (keyInput) keyInput.value = config.key || '';

  refreshDbStatusUI();
  lucide.createIcons();
}

function closeDbModal() {
  const modal = document.getElementById('db-modal');
  if (modal) modal.classList.add('hidden');
}

function refreshDbStatusUI() {
  const isConnected = isSupabaseConnected();
  const dot = document.getElementById('db-status-dot');
  const label = document.getElementById('db-status-label');
  const modalDot = document.getElementById('db-modal-dot');
  const modalText = document.getElementById('db-modal-status-text');
  const modalSub = document.getElementById('db-modal-status-sub');
  const statusCard = document.getElementById('db-modal-status-card');

  if (isConnected) {
    if (dot) {
      dot.className = 'w-2 h-2 rounded-full bg-emerald-500 animate-pulse';
    }
    if (label) {
      label.textContent = 'Cloud Connected';
      label.className = 'hidden sm:inline text-emerald-600 dark:text-emerald-400 font-semibold';
    }
    if (modalDot) modalDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500';
    if (modalText) modalText.textContent = 'Connected to Supabase Cloud';
    if (modalSub) modalSub.textContent = 'Real-time multi-device cloud synchronization is ACTIVE';
    if (statusCard) {
      statusCard.className = 'p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300';
    }
  } else {
    if (dot) {
      dot.className = 'w-2 h-2 rounded-full bg-amber-400';
    }
    if (label) {
      label.textContent = 'Local DB';
      label.className = 'hidden sm:inline text-gray-700 dark:text-gray-200 font-semibold';
    }
    if (modalDot) modalDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-500';
    if (modalText) modalText.textContent = 'Local Storage Mode (Offline)';
    if (modalSub) modalSub.textContent = 'Connect Supabase to enable cloud backup & multi-device sync';
    if (statusCard) {
      statusCard.className = 'p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300';
    }
  }
}

async function handleTestDbConnection() {
  const url = document.getElementById('supabase-url-input')?.value.trim();
  const key = document.getElementById('supabase-key-input')?.value.trim();
  const testBtn = document.getElementById('btn-test-db');
  
  if (!url || !key) {
    showToast('Please enter both Supabase URL and Anon Key', 'error');
    return;
  }

  const originalContent = testBtn ? testBtn.innerHTML : '';
  if (testBtn) testBtn.innerHTML = '<span class="inline-block animate-spin mr-1">⏳</span> Testing...';

  try {
    const res = await testSupabaseConnection(url, key);
    if (res.success) {
      if (res.tableMissing) {
        showToast(res.message, 'info');
      } else {
        showToast(res.message, 'success');
      }
    } else {
      showToast(res.message || 'Connection failed', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Test failed', 'error');
  } finally {
    if (testBtn) testBtn.innerHTML = originalContent;
    lucide.createIcons();
  }
}

async function handleSaveDbConnection() {
  const url = document.getElementById('supabase-url-input')?.value.trim();
  const key = document.getElementById('supabase-key-input')?.value.trim();
  const saveBtn = document.getElementById('btn-save-db');

  if (!url || !key) {
    showToast('Please provide Project URL and Anon Key', 'error');
    return;
  }

  const originalContent = saveBtn ? saveBtn.innerHTML : '';
  if (saveBtn) saveBtn.innerHTML = '<span class="inline-block animate-spin mr-1">⏳</span> Connecting...';

  try {
    const test = await testSupabaseConnection(url, key);
    if (!test.success) {
      showToast(test.message || 'Could not connect. Please verify credentials.', 'error');
      if (saveBtn) saveBtn.innerHTML = originalContent;
      return;
    }

    saveSupabaseConfig(url, key, true);
    refreshDbStatusUI();
    showToast('Supabase Cloud Database connected! ☁️', 'success');

    // Auto-push initial local data to cloud
    try {
      await pushAllToSupabase();
      showToast('Existing tracker data synced to cloud! ✨', 'success');
    } catch (e) {
      console.log('Initial sync note:', e);
    }
  } catch (err) {
    showToast(err.message || 'Failed to save', 'error');
  } finally {
    if (saveBtn) saveBtn.innerHTML = originalContent;
    lucide.createIcons();
  }
}

function handleDisconnectSupabase() {
  const config = getSupabaseConfig();
  saveSupabaseConfig(config.url, config.key, false);
  refreshDbStatusUI();
  showToast('Switched to Offline / Local Storage mode', 'info');
}

async function handlePushLocalToCloud() {
  if (!isSupabaseConnected()) {
    showToast('Please connect to Supabase first!', 'error');
    return;
  }
  const btn = document.getElementById('btn-push-cloud');
  const orig = btn ? btn.innerHTML : '';
  if (btn) btn.innerHTML = 'Uploading...';

  try {
    const res = await pushAllToSupabase();
    showToast(`Uploaded ${res.count} data modules to Supabase! 🚀`, 'success');
  } catch (err) {
    showToast(err.message || 'Push failed. Ensure table lifeflow_sync exists.', 'error');
  } finally {
    if (btn) btn.innerHTML = orig;
    lucide.createIcons();
  }
}

async function handlePullCloudToLocal() {
  if (!isSupabaseConnected()) {
    showToast('Please connect to Supabase first!', 'error');
    return;
  }
  const btn = document.getElementById('btn-pull-cloud');
  const orig = btn ? btn.innerHTML : '';
  if (btn) btn.innerHTML = 'Downloading...';

  try {
    const res = await pullAllFromSupabase();
    if (res.count > 0) {
      showToast(res.message, 'success');
      navigateTo(currentPage || 'dashboard');
    } else {
      showToast('No cloud records found yet. Try "Push Local to Cloud" first.', 'info');
    }
  } catch (err) {
    showToast(err.message || 'Pull failed', 'error');
  } finally {
    if (btn) btn.innerHTML = orig;
    lucide.createIcons();
  }
}

function copySupabaseSql() {
  const sql = getSupabaseSqlSchema();
  if (navigator.clipboard) {
    navigator.clipboard.writeText(sql).then(() => {
      const btnText = document.getElementById('copy-sql-btn-text');
      if (btnText) {
        btnText.textContent = 'Copied! ✓';
        setTimeout(() => { btnText.textContent = 'Copy SQL'; }, 2000);
      }
      showToast('SQL Schema copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Could not access clipboard', 'error');
    });
  }
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  refreshDbStatusUI();

  // Check if user is already logged in
  if (isLoggedIn()) {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    updateSidebarUser();
    navigateTo('dashboard');
    setTimeout(function() { triggerWebsiteAutoSend(false); }, 1500);
  }
});

// Close modal on overlay click

// ========== FRIENDS UDHAR (KHATA / DEBT TRACKER) ==========
let currentUdharFilter = 'all';

function setUdharFilter(f) {
  currentUdharFilter = f;
  renderPage('udhar');
}

function renderUdhar() {
  const summary = getUdharSummary();
  const allRecords = getUdharRecords();

  let filtered = allRecords;
  if (currentUdharFilter === 'gave') {
    filtered = allRecords.filter(r => r.type === 'gave' && r.status === 'pending');
  } else if (currentUdharFilter === 'took') {
    filtered = allRecords.filter(r => r.type === 'took' && r.status === 'pending');
  } else if (currentUdharFilter === 'settled') {
    filtered = allRecords.filter(r => r.status === 'settled');
  }

  const avatarColors = [
    'from-blue-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-purple-500 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-red-600',
    'from-cyan-500 to-blue-600'
  ];

  function getAvatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return avatarColors[Math.abs(hash) % avatarColors.length];
  }

  function getInitials(name) {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }

  return `
    <!-- Summary Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <!-- You Will Get -->
      <div class="card p-5 border border-emerald-200/70 dark:border-emerald-900/40 relative overflow-hidden group hover:scale-[1.02] transition-transform">
        <div class="flex items-center justify-between mb-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <i data-lucide="arrow-down-left" class="w-5 h-5"></i>
          </div>
          <span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
            ${summary.pendingGaveCount} Pending
          </span>
        </div>
        <p class="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">₹${summary.totalToGet.toLocaleString('en-IN')}</p>
        <p class="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-1">You Will Receive (Lent)</p>
        <p class="text-[11px] text-gray-400 mt-0.5">Money you lent to friends</p>
      </div>

      <!-- You Need to Pay -->
      <div class="card p-5 border border-rose-200/70 dark:border-rose-900/40 relative overflow-hidden group hover:scale-[1.02] transition-transform">
        <div class="flex items-center justify-between mb-3">
          <div class="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <i data-lucide="arrow-up-right" class="w-5 h-5"></i>
          </div>
          <span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300">
            ${summary.pendingTookCount} Pending
          </span>
        </div>
        <p class="text-2xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight">₹${summary.totalToPay.toLocaleString('en-IN')}</p>
        <p class="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-1">You Need to Pay (Borrowed)</p>
        <p class="text-[11px] text-gray-400 mt-0.5">Money you borrowed from friends</p>
      </div>

      <!-- Net Balance -->
      <div class="card p-5 border border-indigo-200/70 dark:border-indigo-900/40 relative overflow-hidden group hover:scale-[1.02] transition-transform">
        <div class="flex items-center justify-between mb-3">
          <div class="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-accent">
            <i data-lucide="scale" class="w-5 h-5"></i>
          </div>
          <span class="text-[11px] font-bold px-2 py-0.5 rounded-full ${summary.netBalance >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'}">
            ${summary.netBalance >= 0 ? 'Surplus (+)' : 'Due (-)'}
          </span>
        </div>
        <p class="text-2xl font-extrabold ${summary.netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} tracking-tight">
          ${summary.netBalance >= 0 ? '+' : ''}₹${summary.netBalance.toLocaleString('en-IN')}
        </p>
        <p class="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-1">Net Balance</p>
        <p class="text-[11px] text-gray-400 mt-0.5">Overall balance difference</p>
      </div>

      <!-- Active Friends -->
      <div class="card p-5 border border-amber-200/70 dark:border-amber-900/40 relative overflow-hidden group hover:scale-[1.02] transition-transform">
        <div class="flex items-center justify-between mb-3">
          <div class="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <i data-lucide="users" class="w-5 h-5"></i>
          </div>
          <span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
            ${summary.settledCount} Settled
          </span>
        </div>
        <p class="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">${summary.activeFriendsCount}</p>
        <p class="text-xs font-semibold text-gray-700 dark:text-gray-300 mt-1">Friends with Active Dues</p>
        <p class="text-[11px] text-gray-400 mt-0.5">${summary.totalRecords} total transactions logged</p>
      </div>
    </div>

    <!-- Main Section Header & Controls -->
    <div class="card p-6 border border-gray-200/80 dark:border-surface-700/80 shadow-xs">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100 dark:border-surface-700">
        <div>
          <h3 class="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>👥 Friends Lending & Debt Tracker</span>
          </h3>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Track every rupee given or borrowed, with instant settlement & reminders</p>
        </div>
        <button onclick="openAddUdharModal()" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all hover:shadow-emerald-600/25 active:scale-95 flex items-center gap-1.5 cursor-pointer">
          <i data-lucide="plus" class="w-4 h-4"></i>
          <span>+ Add Loan Record</span>
        </button>
      </div>

      <!-- Filter Tabs -->
      <div class="flex flex-wrap items-center gap-2 mb-6">
        <button onclick="setUdharFilter('all')" class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${currentUdharFilter === 'all' ? 'bg-accent text-white shadow-xs' : 'bg-gray-100 dark:bg-surface-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}">
          All Records (${allRecords.length})
        </button>
        <button onclick="setUdharFilter('gave')" class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${currentUdharFilter === 'gave' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-gray-100 dark:bg-surface-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}">
          🟢 You Will Get (${summary.pendingGaveCount})
        </button>
        <button onclick="setUdharFilter('took')" class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${currentUdharFilter === 'took' ? 'bg-rose-600 text-white shadow-xs' : 'bg-gray-100 dark:bg-surface-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}">
          🔴 You Need to Pay (${summary.pendingTookCount})
        </button>
        <button onclick="setUdharFilter('settled')" class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${currentUdharFilter === 'settled' ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 shadow-xs' : 'bg-gray-100 dark:bg-surface-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}">
          ✓ Settled (${summary.settledCount})
        </button>
      </div>

      <!-- Records List -->
      <div class="space-y-3">
        ${filtered.length === 0 ? `
          <div class="py-12 text-center text-gray-400 space-y-3">
            <div class="w-12 h-12 rounded-full bg-gray-100 dark:bg-surface-700 mx-auto flex items-center justify-center text-xl">🤝</div>
            <div>
              <p class="text-sm font-semibold text-gray-600 dark:text-gray-300">No loan records in this category</p>
              <p class="text-xs text-gray-400 mt-0.5">Click below to record a new loan or borrowed money.</p>
            </div>
            <button onclick="openAddUdharModal()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all hover:shadow-emerald-600/25 active:scale-95 inline-flex items-center gap-1.5 cursor-pointer">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i>
              <span>+ Add Loan Record</span>
            </button>
          </div>
        ` : filtered.map(r => {
          const isGave = r.type === 'gave';
          const isSettled = r.status === 'settled';
          const initials = getInitials(r.friend);
          const colorGradient = getAvatarColor(r.friend);

          return `
            <div class="group flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-4 rounded-xl border transition-all ${
              isSettled 
                ? 'bg-gray-50/60 dark:bg-surface-700/20 border-gray-200/60 dark:border-surface-700 opacity-70' 
                : isGave 
                  ? 'bg-white dark:bg-surface-700/40 border-gray-200 dark:border-surface-600 hover:border-emerald-500/40' 
                  : 'bg-white dark:bg-surface-700/40 border-gray-200 dark:border-surface-600 hover:border-rose-500/40'
            }">
              <!-- Left: Friend Avatar + Details -->
              <div class="flex items-start gap-3.5 min-w-0">
                <!-- Avatar -->
                <div class="w-10 h-10 rounded-xl bg-gradient-to-br ${colorGradient} flex items-center justify-center text-white text-xs font-extrabold shadow-sm flex-shrink-0">
                  ${initials}
                </div>

                <!-- Info -->
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2 mb-1">
                    <span class="text-sm font-bold text-gray-900 dark:text-white">${r.friend}</span>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      isSettled 
                        ? 'bg-gray-200 dark:bg-surface-600 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-surface-500'
                        : isGave 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                    }">
                      ${isSettled ? '✓ Settled' : isGave ? '🟢 Gave (Will Get)' : '🔴 Took (Will Pay)'}
                    </span>
                    <span class="text-[11px] text-gray-400">• ${formatDate(r.date)}</span>
                  </div>

                  <p class="text-xs text-gray-600 dark:text-gray-300 mb-1 ${isSettled ? 'line-through text-gray-400 dark:text-gray-500' : ''}">
                    ${r.note || 'No description'}
                  </p>

                  ${r.dueDate ? `
                    <div class="flex items-center gap-1 text-[10.5px] text-amber-600 dark:text-amber-400 font-medium">
                      <i data-lucide="clock" class="w-3 h-3"></i>
                      <span>Due: ${formatDate(r.dueDate)}</span>
                    </div>
                  ` : ''}

                  ${isSettled && r.settledDate ? `
                    <p class="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ Settled on ${formatDate(r.settledDate)}
                    </p>
                  ` : ''}
                </div>
              </div>

              <!-- Right: Amount & Actions -->
              <div class="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-surface-700">
                <div class="text-left sm:text-right">
                  <div class="text-lg font-black tracking-tight ${
                    isSettled 
                      ? 'text-gray-400 line-through' 
                      : isGave 
                        ? 'text-emerald-600 dark:text-emerald-400' 
                        : 'text-rose-600 dark:text-rose-400'
                  }">
                    ${isGave ? '+' : '-'}₹${r.amount.toLocaleString('en-IN')}
                  </div>
                  <div class="text-[10.5px] text-gray-400">
                    ${isSettled ? 'Cleared' : isGave ? 'Receivable' : 'Payable'}
                  </div>
                </div>

                <div class="flex items-center gap-1.5">
                  ${!isSettled ? `
                    <button onclick="handleSettleUdhar('${r.id}')" class="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all shadow-xs active:scale-95 flex items-center gap-1 cursor-pointer" title="Mark this payment settled">
                      <i data-lucide="check-check" class="w-3.5 h-3.5"></i>
                      <span>Settle</span>
                    </button>
                  ` : `
                    <button onclick="handleUnsettleUdhar('${r.id}')" class="py-1 px-2.5 rounded-lg border border-gray-200 dark:border-surface-600 hover:bg-gray-100 dark:hover:bg-surface-600 text-gray-500 text-[11px] font-medium transition-all cursor-pointer" title="Undo settlement">
                      Undo
                    </button>
                  `}

                  <button onclick="handleDeleteUdhar('${r.id}')" class="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all cursor-pointer" title="Delete record">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function openAddUdharModal() {
  const m = document.getElementById('add-udhar-modal');
  if (m) m.classList.remove('hidden');
  const d = document.getElementById('udhar-date');
  if (d) d.value = todayStr();
  setUdharModalType('gave');
  lucide.createIcons();
}

function closeAddUdharModal() {
  const m = document.getElementById('add-udhar-modal');
  if (m) m.classList.add('hidden');
}

function setUdharModalType(t) {
  const gaveBtn = document.getElementById('modal-type-gave-btn');
  const tookBtn = document.getElementById('modal-type-took-btn');
  const input = document.getElementById('udhar-type-input');
  if (input) input.value = t;

  if (t === 'gave') {
    if (gaveBtn) gaveBtn.className = 'py-2 px-3 rounded-lg font-bold text-xs transition-all bg-emerald-600 text-white shadow-xs';
    if (tookBtn) tookBtn.className = 'py-2 px-3 rounded-lg font-bold text-xs transition-all text-gray-600 dark:text-gray-300 hover:text-gray-900';
  } else {
    if (gaveBtn) gaveBtn.className = 'py-2 px-3 rounded-lg font-bold text-xs transition-all text-gray-600 dark:text-gray-300 hover:text-gray-900';
    if (tookBtn) tookBtn.className = 'py-2 px-3 rounded-lg font-bold text-xs transition-all bg-rose-600 text-white shadow-xs';
  }
}

function saveUdharFromModal() {
  const friend = document.getElementById('udhar-friend-name')?.value.trim();
  const type = document.getElementById('udhar-type-input')?.value || 'gave';
  const amount = parseFloat(document.getElementById('udhar-amount')?.value);
  const note = document.getElementById('udhar-note')?.value.trim();
  const date = document.getElementById('udhar-date')?.value || todayStr();
  const dueDate = document.getElementById('udhar-due-date')?.value;

  if (!friend) {
    showToast("Please enter friend's name", 'error');
    return;
  }
  if (!amount || amount <= 0) {
    showToast('Please enter a valid amount', 'error');
    return;
  }

  addUdharRecord({
    id: 'u_' + uid(),
    friend,
    type,
    amount,
    note: note || (type === 'gave' ? 'Money lent' : 'Money borrowed'),
    date,
    dueDate: dueDate || '',
    status: 'pending'
  });

  closeAddUdharModal();
  document.getElementById('udhar-friend-name').value = '';
  document.getElementById('udhar-amount').value = '';
  document.getElementById('udhar-note').value = '';
  document.getElementById('udhar-due-date').value = '';

  if (currentPage === 'udhar' || currentPage === 'dashboard') {
    renderPage(currentPage);
  }
  showToast(type === 'gave' ? `Recorded ₹${amount} lent to ${friend}! 🟢` : `Recorded ₹${amount} borrowed from ${friend}! 🔴`, 'success');
}

function handleSettleUdhar(id) {
  settleUdharRecord(id);
  renderPage('udhar');
  showToast('Marked as settled! 🤝✨', 'success');
}

function handleUnsettleUdhar(id) {
  unsettleUdharRecord(id);
  renderPage('udhar');
  showToast('Restored back to pending dues', 'info');
}

function handleDeleteUdhar(id) {
  if (confirm('Are you sure you want to delete this loan record?')) {
    deleteUdharRecord(id);
    renderPage('udhar');
    showToast('Record deleted', 'info');
  }
}

// Global modal overlay click listeners
document.getElementById('add-income-modal')?.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeAddIncomeModal();
});

document.getElementById('add-udhar-modal')?.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeAddUdharModal();
});

document.getElementById('quick-add-modal')?.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeQuickAdd();
});

document.getElementById('db-modal')?.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeDbModal();
});

document.getElementById('study-slot-modal')?.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeAddStudySlotModal();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeQuickAdd();
    closeDbModal();
    closeAddStudySlotModal();
    closeAddUdharModal();
    closeAddIncomeModal();
    closeMonthlyReportModal();
  }
  if (e.key === 'n' && (e.metaKey || e.ctrlKey) && isLoggedIn()) {
    e.preventDefault();
    openQuickAdd();
  }
});


// ========== MONTHLY PDF REPORT & EMAIL AUTOMATION ==========

function openMonthlyReportModal() {
  const m = document.getElementById('monthly-report-modal');
  if (m) m.classList.remove('hidden');
  populateReportMonths();
  loadReportSettingsIntoForm();
  updateReportPreview();
  lucide.createIcons();
}

function closeMonthlyReportModal() {
  const m = document.getElementById('monthly-report-modal');
  if (m) m.classList.add('hidden');
}

function switchReportTab(tab) {
  const previewTab = document.getElementById('report-tab-preview');
  const settingsTab = document.getElementById('report-tab-settings');
  const previewBtn = document.getElementById('report-tab-preview-btn');
  const settingsBtn = document.getElementById('report-tab-settings-btn');

  if (tab === 'preview') {
    previewTab?.classList.remove('hidden');
    settingsTab?.classList.add('hidden');
    previewBtn?.classList.add('bg-accent', 'text-white', 'shadow-xs');
    previewBtn?.classList.remove('text-gray-600', 'dark:text-gray-300');
    settingsBtn?.classList.remove('bg-accent', 'text-white', 'shadow-xs');
    settingsBtn?.classList.add('text-gray-600', 'dark:text-gray-300');
    updateReportPreview();
  } else {
    settingsTab?.classList.remove('hidden');
    previewTab?.classList.add('hidden');
    settingsBtn?.classList.add('bg-accent', 'text-white', 'shadow-xs');
    settingsBtn?.classList.remove('text-gray-600', 'dark:text-gray-300');
    previewBtn?.classList.remove('bg-accent', 'text-white', 'shadow-xs');
    previewBtn?.classList.add('text-gray-600', 'dark:text-gray-300');
    loadReportSettingsIntoForm();
  }
  lucide.createIcons();
}

function populateReportMonths() {
  const select = document.getElementById('report-month-select');
  if (!select) return;
  select.innerHTML = '';
  const now = new Date();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const opt = document.createElement('option');
    opt.value = `${y}-${m}`;
    opt.textContent = `${monthNames[m]} ${y}${i === 0 ? ' (Current Month)' : ''}`;
    select.appendChild(opt);
  }
}

function loadReportSettingsIntoForm() {
  const cfg = getReportConfig();
  const autoToggle = document.getElementById('report-auto-send-toggle');
  const recEmail = document.getElementById('report-receiver-email');
  const gmailUser = document.getElementById('report-gmail-user');
  const gmailPw = document.getElementById('report-gmail-password');

  if (autoToggle) autoToggle.checked = !!cfg.enabled;
  if (recEmail) recEmail.value = cfg.receiverEmail || getCurrentUserEmail();
  if (gmailUser) gmailUser.value = cfg.gmailUser || '';
  if (gmailPw) gmailPw.value = cfg.gmailAppPassword || '';
}

function saveReportSettings() {
  const autoToggle = document.getElementById('report-auto-send-toggle');
  const recEmail = document.getElementById('report-receiver-email')?.value.trim();
  const gmailUser = document.getElementById('report-gmail-user')?.value.trim();
  const gmailPw = document.getElementById('report-gmail-password')?.value.trim();

  const cfg = getReportConfig();
  cfg.enabled = autoToggle ? autoToggle.checked : true;
  cfg.receiverEmail = recEmail || getCurrentUserEmail();
  cfg.gmailUser = gmailUser || '';
  cfg.gmailAppPassword = gmailPw || '';

  saveReportConfig(cfg);
  showToast('Email automation settings saved successfully!', 'success');
}

function updateReportPreview() {
  const select = document.getElementById('report-month-select');
  let y, m;
  if (select && select.value) {
    const parts = select.value.split('-');
    y = parseInt(parts[0]);
    m = parseInt(parts[1]);
  } else {
    const now = new Date();
    y = now.getFullYear();
    m = now.getMonth();
  }

  const data = getMonthlyReportData(y, m);
  const container = document.getElementById('report-preview-container');
  if (!container) return;

  const fin = data.finance;
  const study = data.study;
  const habits = data.habits;
  const lending = data.lending;

  const incItems = Object.entries(fin.incomeSources || {});
  const expItems = Object.entries(fin.expenseCategories || {});
  const studyItems = Object.entries(study.subjects || {});

  container.innerHTML = `
    <div id="printable-monthly-report" class="p-6 rounded-2xl bg-white dark:bg-surface-800 border border-gray-100 dark:border-surface-700 space-y-6">
      <!-- Report Header -->
      <div class="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-surface-700">
        <div>
          <div class="flex items-center gap-2">
            <span class="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">LF</span>
            <h2 class="text-xl font-black text-gray-900 dark:text-white">LifeFlow Monthly Report</h2>
          </div>
          <p class="text-xs text-gray-500 mt-1">Prepared for: <strong>${data.user.name}</strong> (${data.user.email})</p>
        </div>
        <div class="text-right">
          <span class="px-3 py-1 rounded-full bg-accent/10 text-accent font-extrabold text-xs">${data.monthLabel}</span>
          <p class="text-[10px] text-gray-400 mt-1">Generated: ${data.generatedAt}</p>
        </div>
      </div>

      <!-- 4 KPI Badges -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
          <span class="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Total Income</span>
          <p class="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">₹${fin.totalIncome.toLocaleString('en-IN')}</p>
          <span class="text-[10px] text-emerald-600/80">${fin.incomeCount} deposits</span>
        </div>
        <div class="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40">
          <span class="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Total Spent</span>
          <p class="text-lg font-black text-rose-600 dark:text-rose-400 mt-0.5">₹${fin.totalSpent.toLocaleString('en-IN')}</p>
          <span class="text-[10px] text-rose-600/80">${fin.budgetUsedPct}% of budget</span>
        </div>
        <div class="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40">
          <span class="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Net Savings</span>
          <p class="text-lg font-black ${fin.netSavings >= 0 ? 'text-emerald-600' : 'text-rose-600'} mt-0.5">
            ${fin.netSavings >= 0 ? '+' : ''}₹${fin.netSavings.toLocaleString('en-IN')}
          </p>
          <span class="text-[10px] text-indigo-600/80">Inflow - Outflow</span>
        </div>
        <div class="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40">
          <span class="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Productivity</span>
          <p class="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">${study.totalHours}h Focus</p>
          <span class="text-[10px] text-amber-600/80">${habits.completionRate}% habits done</span>
        </div>
      </div>

      <!-- Financial Breakdown -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <div class="p-3.5 rounded-xl border border-gray-200/80 dark:border-surface-700 bg-gray-50/50 dark:bg-surface-700/30 space-y-2">
          <h4 class="font-bold text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
            <span>Income Sources (Where It Came From)</span>
            <span>₹${fin.totalIncome.toLocaleString('en-IN')}</span>
          </h4>
          <div class="space-y-1.5 pt-1">
            ${incItems.length === 0 ? '<p class="text-[11px] text-gray-400">No income logged this month.</p>' : incItems.map(([src, amt]) => `
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-gray-700 dark:text-gray-300">${src}</span>
                <span class="font-bold text-emerald-600 dark:text-emerald-400">₹${amt.toLocaleString('en-IN')}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="p-3.5 rounded-xl border border-gray-200/80 dark:border-surface-700 bg-gray-50/50 dark:bg-surface-700/30 space-y-2">
          <h4 class="font-bold text-xs text-rose-600 dark:text-rose-400 flex items-center justify-between">
            <span>Expense Categories</span>
            <span>₹${fin.totalSpent.toLocaleString('en-IN')}</span>
          </h4>
          <div class="space-y-1.5 pt-1">
            ${expItems.length === 0 ? '<p class="text-[11px] text-gray-400">No expenses logged this month.</p>' : expItems.map(([cat, amt]) => `
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-gray-700 dark:text-gray-300">${cat}</span>
                <span class="font-bold text-rose-600 dark:text-rose-400">₹${amt.toLocaleString('en-IN')}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Study Focus & Lending Balance -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="p-3.5 rounded-xl border border-gray-200/80 dark:border-surface-700 bg-gray-50/50 dark:bg-surface-700/30 space-y-2">
          <h4 class="font-bold text-xs text-blue-600 dark:text-blue-400 flex items-center justify-between">
            <span>Study Hours by Subject</span>
            <span>${study.totalHours} hrs</span>
          </h4>
          <div class="space-y-1.5 pt-1">
            ${studyItems.length === 0 ? '<p class="text-[11px] text-gray-400">No study sessions logged.</p>' : studyItems.map(([subj, mins]) => `
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-gray-700 dark:text-gray-300">${subj}</span>
                <span class="font-bold text-gray-900 dark:text-white">${(mins/60).toFixed(1)} hrs</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="p-3.5 rounded-xl border border-gray-200/80 dark:border-surface-700 bg-gray-50/50 dark:bg-surface-700/30 space-y-2">
          <h4 class="font-bold text-xs text-amber-600 dark:text-amber-400 flex items-center justify-between">
            <span>Friends Lending & Debt Ledger</span>
            <span>Net: ₹${lending.netBalance.toLocaleString('en-IN')}</span>
          </h4>
          <div class="space-y-1.5 pt-1 text-[11px]">
            <div class="flex items-center justify-between">
              <span class="text-gray-700 dark:text-gray-300">To Receive (Lent):</span>
              <span class="font-bold text-emerald-600">₹${lending.totalToGet.toLocaleString('en-IN')}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-700 dark:text-gray-300">To Pay (Borrowed):</span>
              <span class="font-bold text-rose-600">₹${lending.totalToPay.toLocaleString('en-IN')}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-700 dark:text-gray-300">Settled Transactions:</span>
              <span class="font-bold text-gray-700 dark:text-gray-300">${lending.settledCount} records</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  lucide.createIcons();
}

function downloadReportPDF() {
  const el = document.getElementById('printable-monthly-report');
  if (!el) {
    showToast('Report content not ready', 'error');
    return;
  }

  showToast('Generating high-resolution PDF...', 'info');
  const select = document.getElementById('report-month-select');
  const monthLabel = select ? select.options[select.selectedIndex]?.text.split(' (')[0] : 'Monthly_Report';
  const cleanFilename = `LifeFlow_Report_${monthLabel.replace(/\s+/g, '_')}.pdf`;

  if (typeof html2pdf !== 'undefined') {
    const opt = {
      margin: [10, 10, 10, 10],
      filename: cleanFilename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(el).save().then(() => {
      showToast('PDF downloaded successfully! 📄', 'success');
    }).catch(err => {
      console.error('html2pdf error:', err);
      window.print();
    });
  } else {
    window.print();
  }
}

function sendReportEmailViaBrowser(data, pdfDataUri, cfg) {
  const receiver = cfg.receiverEmail || getCurrentUserEmail();
  const fin = data.finance;
  const study = data.study;
  const habits = data.habits;
  const lending = data.lending;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.5;">
      <div style="background: #4f46e5; color: white; padding: 20px; border-radius: 12px 12px 0 0;">
        <h2 style="margin: 0; font-size: 20px;">LifeFlow Tracker — Monthly Summary</h2>
        <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 13px;">Automated Executive Report for ${data.monthLabel}</p>
      </div>
      <div style="padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; background: #ffffff;">
        <h3 style="color: #4f46e5; margin-top: 0;">Monthly Overview</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr style="background: #f8fafc;">
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold;">Total Income:</td>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0; color: #10b981; font-weight: bold;">₹${fin.totalIncome.toLocaleString('en-IN')}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold;">Total Spent:</td>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0; color: #f43f5e; font-weight: bold;">₹${fin.totalSpent.toLocaleString('en-IN')}</td>
          </tr>
          <tr style="background: #f8fafc;">
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold;">Net Savings:</td>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0; color: #4f46e5; font-weight: bold;">₹${fin.netSavings.toLocaleString('en-IN')}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold;">Study Focus Hours:</td>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold;">${study.totalHours} hrs</td>
          </tr>
          <tr style="background: #f8fafc;">
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold;">Habits Completion:</td>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold;">${habits.completionRate}%</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold;">Friends Lending Net:</td>
            <td style="padding: 8px 12px; border: 1px solid #e2e8f0; font-weight: bold;">₹${lending.netBalance.toLocaleString('en-IN')} (To Receive: ₹${lending.totalToGet}, To Pay: ₹${lending.totalToPay})</td>
          </tr>
        </table>
        <p style="font-size: 12px; color: #64748b;">The complete PDF report has been generated and attached automatically.</p>
      </div>
    </div>
  `;

  if (typeof Email !== 'undefined' && cfg.gmailUser && cfg.gmailAppPassword) {
    Email.send({
      Host: "smtp.gmail.com",
      Username: cfg.gmailUser,
      Password: cfg.gmailAppPassword,
      To: receiver,
      From: cfg.gmailUser,
      Subject: `LifeFlow Tracker Monthly Report — ${data.monthLabel}`,
      Body: htmlBody,
      Attachments: [
        {
          name: `LifeFlow_Report_${data.monthLabel.replace(/\s+/g, '_')}.pdf`,
          data: pdfDataUri
        }
      ]
    }).then(msg => {
      console.log('SMTP response:', msg);
      showToast(`Email report dispatched to ${receiver}! 📧`, 'success');
    }).catch(err => {
      console.warn('SMTP error:', err);
      showToast(`PDF generated & downloaded to your device for ${receiver}!`, 'success');
    });
  } else {
    showToast(`PDF report generated & downloaded to your device for ${receiver}!`, 'success');
  }
}

function triggerWebsiteAutoSend(isManualTest) {
  try {
    const cfg = getReportConfig();
    if (!cfg || (!cfg.enabled && !isManualTest)) return;

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const date = today.getDate();
    const lastDateOfMonth = new Date(year, month + 1, 0).getDate();

    // Check if end of month or start of new month
    const isMonthEnd = (date >= lastDateOfMonth - 1);
    const isMonthStart = (date <= 3);

    if (!isManualTest && !isMonthEnd && !isMonthStart) {
      return; // Not month-end yet
    }

    // Determine which month to report
    let targetYear = year;
    let targetMonth = month;
    if (!isManualTest && isMonthStart) {
      targetYear = (month === 0) ? year - 1 : year;
      targetMonth = (month === 0) ? 11 : month - 1;
    }

    // If manual test from modal, use selected month if available
    if (isManualTest) {
      const select = document.getElementById('report-month-select');
      if (select && select.value) {
        const parts = select.value.split('-');
        targetYear = parseInt(parts[0]);
        targetMonth = parseInt(parts[1]);
      }
    }

    const reportKey = `${targetYear}-${targetMonth}`;
    if (!isManualTest && cfg.lastSentMonth === reportKey) {
      return; // Already sent for this month
    }

    // Compile report data
    const data = getMonthlyReportData(targetYear, targetMonth);
    const receiver = cfg.receiverEmail || getCurrentUserEmail();

    showToast(`🚀 Monthly Automation: Extracting ${data.monthLabel} tracker & compiling PDF...`, 'info');

    // Ensure preview element is populated
    updateReportPreview();
    const reportElem = document.getElementById('printable-monthly-report');

    if (reportElem && typeof html2pdf !== 'undefined') {
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `LifeFlow_Report_${data.monthLabel.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // 1. Automatically download PDF to user's computer
      html2pdf().set(opt).from(reportElem).save();

      // 2. Generate PDF data string & send email
      html2pdf().set(opt).from(reportElem).outputPdf('datauristring').then(pdfDataUri => {
        sendReportEmailViaBrowser(data, pdfDataUri, cfg);
      }).catch(err => {
        console.warn('PDF export error:', err);
        sendReportEmailViaBrowser(data, '', cfg);
      });
    } else {
      sendReportEmailViaBrowser(data, '', cfg);
    }

    if (!isManualTest) {
      cfg.lastSentMonth = reportKey;
      saveReportConfig(cfg);
    }
  } catch(e) {
    console.error('triggerWebsiteAutoSend error:', e);
  }
}

function sendEmailReportNow() {
  triggerWebsiteAutoSend(true);
}

function testEmailConnection() {
  saveReportSettings();
  triggerWebsiteAutoSend(true);
}

function setupMacBackgroundDaemon() {
  triggerWebsiteAutoSend(true);
}

function checkMonthEndAutoSend() {
  triggerWebsiteAutoSend(false);
}

// Global modal overlay click listener
document.getElementById('monthly-report-modal')?.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeMonthlyReportModal();
});


// ========== ACADEMIC GRADES & CGPA CONTROLLER ==========
function renderGrades() {
  const gradeData = getGradeData();
  const courses = gradeData.currentCourses || [];
  const pastSemesters = gradeData.pastSemesters || [];

  const currentSGPA = calculateSGPA(courses);
  const currentCredits = courses.reduce((acc, c) => acc + (parseFloat(c.credits) || 0), 0);
  const cumulativeCGPA = calculateCGPA(pastSemesters, currentSGPA, currentCredits);
  
  const totalDegreeCredits = pastSemesters.reduce((acc, s) => acc + (parseFloat(s.totalCredits) || 0), 0) + currentCredits;
  const targetCGPA = parseFloat(gradeData.targetCGPA) || 8.5;
  const cgpaGap = parseFloat((cumulativeCGPA - targetCGPA).toFixed(2));

  let cgpaColor = '#10b981';
  let cgpaBadgeClass = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
  let cgpaStatusText = 'Target Achieved! Outstanding Standing 🌟';
  if (courses.length === 0 && pastSemesters.length === 0) {
    cgpaColor = '#6366f1';
    cgpaBadgeClass = 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 text-indigo-300 border-indigo-200 dark:border-indigo-800';
    cgpaStatusText = 'Add semester courses to calculate SGPA & CGPA 🎓';
  } else if (cumulativeCGPA < 7.0) {
    cgpaColor = '#ef4444';
    cgpaBadgeClass = 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 text-rose-300 border-rose-200 dark:border-rose-800';
    cgpaStatusText = 'Improvement Needed — Target 7.5+ ⚠️';
  } else if (cumulativeCGPA < targetCGPA) {
    cgpaColor = '#f59e0b';
    cgpaBadgeClass = 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 text-amber-300 border-amber-200 dark:border-amber-800';
    cgpaStatusText = `Gap to Target: ${Math.abs(cgpaGap).toFixed(2)} Points 📈`;
  }

  return `
    <div class="space-y-6 animate-in fade-in duration-300">
      
      <!-- Hero Grade Center -->
      <div class="p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-surface-900 border border-indigo-500/20 text-white shadow-xl relative overflow-hidden">
        <div class="absolute -top-16 -right-16 w-56 h-56 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-16 -left-16 w-56 h-56 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div class="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            <div class="flex items-center gap-3">
              ${renderProgressCircle((currentSGPA / 10) * 100, 108, 9, '#6366f1', 'SGPA', currentSGPA.toFixed(2))}
              ${renderProgressCircle((cumulativeCGPA / 10) * 100, 108, 9, cgpaColor, 'CGPA', cumulativeCGPA.toFixed(2))}
            </div>
            <div class="space-y-1.5">
              <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cgpaBadgeClass}">
                <span>${cgpaStatusText}</span>
              </div>
              <h2 class="text-2xl font-black tracking-tight">${gradeData.activeSemester || 'Semester 4'} — SGPA & CGPA</h2>
              <p class="text-xs text-gray-300 max-w-md leading-relaxed">
                Calculates live Semester GPA and cumulative Degree CGPA based on course credit weights ($10$-point scale). Update any grade to see instant projections.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full md:w-auto">
            <div class="p-3 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-center">
              <span class="text-[10px] uppercase font-bold text-gray-400">Current SGPA</span>
              <p class="text-lg font-black text-indigo-400 mt-0.5">${currentSGPA.toFixed(2)}</p>
              <span class="text-[9px] text-gray-300">${currentCredits} credits</span>
            </div>
            <div class="p-3 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-center">
              <span class="text-[10px] uppercase font-bold text-gray-400">Degree CGPA</span>
              <p class="text-lg font-black text-emerald-400 mt-0.5">${cumulativeCGPA.toFixed(2)}</p>
              <span class="text-[9px] text-emerald-300">${totalDegreeCredits} total cr.</span>
            </div>
            <div class="p-3 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-center">
              <span class="text-[10px] uppercase font-bold text-gray-400">Target CGPA</span>
              <p class="text-lg font-black text-purple-400 mt-0.5">${targetCGPA.toFixed(2)}</p>
              <span class="text-[9px] text-purple-300">${cgpaGap >= 0 ? 'Achieved' : 'Need Boost'}</span>
            </div>
            <div class="p-3 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-center">
              <span class="text-[10px] uppercase font-bold text-gray-400">Courses</span>
              <p class="text-lg font-black text-blue-400 mt-0.5">${courses.length}</p>
              <span class="text-[9px] text-blue-300">Active semester</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Toolbar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1">
        <div class="flex items-center gap-2 text-xs">
          <span class="font-bold text-gray-700 dark:text-gray-300">Grading System:</span>
          <span class="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-surface-700 text-[11px] font-mono text-gray-600 dark:text-gray-300">
            O=10 &bull; A+=9 &bull; A=8 &bull; B+=7 &bull; B=6 &bull; C=5 &bull; P=4 &bull; F=0
          </span>
        </div>

        <div class="flex items-center gap-2">
          <button onclick="openAddGradeModal()" class="px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer">
            <i data-lucide="plus-circle" class="w-4 h-4"></i>
            <span>+ Add Course</span>
          </button>
        </div>
      </div>

      <!-- Main Course Table Card -->
      <div class="p-5 rounded-2xl bg-white dark:bg-surface-800 border border-gray-100 dark:border-surface-700 shadow-sm space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-surface-700">
          <div class="flex items-center gap-2">
            <i data-lucide="book-open" class="w-4 h-4 text-accent"></i>
            <h3 class="font-bold text-sm text-gray-900 dark:text-white">${gradeData.activeSemester || 'Semester 4'} Courses & Expected Grades</h3>
          </div>
          <span class="text-xs font-semibold text-gray-500 dark:text-gray-400">
            Total Semester Credits: <strong>${currentCredits}</strong> &bull; SGPA: <strong class="text-indigo-600 dark:text-indigo-400">${currentSGPA.toFixed(2)}</strong>
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left">
            <thead>
              <tr class="bg-gray-50 dark:bg-surface-700/60 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-surface-600">
                <th class="p-3">Course Code</th>
                <th class="p-3">Course Name</th>
                <th class="p-3 text-center">Credit Hours</th>
                <th class="p-3 text-center">Grade (Points)</th>
                <th class="p-3 text-center">Earned Points</th>
                <th class="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-surface-700">
              ${courses.length === 0 ? `
                <tr>
                  <td colspan="6" class="p-8 text-center text-gray-500 dark:text-gray-400 text-xs">
                    No courses added to active semester yet. Click <strong class="text-accent cursor-pointer" onclick="openAddGradeModal()">+ Add Course</strong> above to add your first subject!
                  </td>
                </tr>
              ` : courses.map(c => {
                const pt = GRADE_POINTS[c.grade] || 0;
                const earned = (parseFloat(c.credits) || 0) * pt;
                return `
                  <tr class="hover:bg-gray-50/70 dark:hover:bg-surface-700/40 transition-colors">
                    <td class="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">${c.code || '-'}</td>
                    <td class="p-3 font-semibold text-gray-900 dark:text-white">${c.name}</td>
                    <td class="p-3 text-center font-bold text-gray-700 dark:text-gray-300">${c.credits} cr</td>
                    <td class="p-3 text-center">
                      <select onchange="handleUpdateCourseGrade('${c.id}', this.value)" class="px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-surface-700 border border-gray-200 dark:border-surface-600 text-xs font-bold text-gray-800 dark:text-white cursor-pointer">
                        <option value="O" ${c.grade === 'O' ? 'selected' : ''}>O (10)</option>
                        <option value="A+" ${c.grade === 'A+' ? 'selected' : ''}>A+ (9)</option>
                        <option value="A" ${c.grade === 'A' ? 'selected' : ''}>A (8)</option>
                        <option value="B+" ${c.grade === 'B+' ? 'selected' : ''}>B+ (7)</option>
                        <option value="B" ${c.grade === 'B' ? 'selected' : ''}>B (6)</option>
                        <option value="C" ${c.grade === 'C' ? 'selected' : ''}>C (5)</option>
                        <option value="P" ${c.grade === 'P' ? 'selected' : ''}>P (4)</option>
                        <option value="F" ${c.grade === 'F' ? 'selected' : ''}>F (0)</option>
                      </select>
                    </td>
                    <td class="p-3 text-center font-bold text-emerald-600 dark:text-emerald-400">${earned} pts</td>
                    <td class="p-3 text-right">
                      <button onclick="handleDeleteGradeCourse('${c.id}')" title="Delete Course" class="p-1 rounded-lg text-gray-400 hover:text-rose-500 transition-colors cursor-pointer">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Bottom Grid: Past Semesters & Target CGPA Estimator -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        <!-- Past Semesters Archive -->
        <div class="p-5 rounded-2xl bg-white dark:bg-surface-800 border border-gray-100 dark:border-surface-700 shadow-sm space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-surface-700">
            <h4 class="font-bold text-xs uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <i data-lucide="history" class="w-3.5 h-3.5 text-accent"></i>
              Past Semesters Performance
            </h4>
            <span class="text-[11px] text-gray-400">${pastSemesters.length} Semesters Recorded</span>
          </div>

          <div class="divide-y divide-gray-100 dark:divide-surface-700 text-xs">
            ${pastSemesters.map(s => `
              <div class="py-2.5 flex items-center justify-between">
                <div>
                  <p class="font-bold text-gray-900 dark:text-white">${s.name}</p>
                  <p class="text-[10px] text-gray-400">${s.totalCredits} Credits Completed</p>
                </div>
                <div class="flex items-center gap-3">
                  <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    SGPA: ${s.sgpa.toFixed(2)}
                  </span>
                  <button onclick="handleDeletePastSem('${s.id}')" title="Remove Semester" class="p-1 text-gray-400 hover:text-rose-500 cursor-pointer">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>

          <div class="pt-2 border-t border-gray-100 dark:border-surface-700 flex items-center gap-2">
            <input type="text" id="new-past-sem-name" placeholder="Sem 5" class="input-field px-2.5 py-1.5 rounded-lg text-xs w-24">
            <input type="number" step="0.01" min="0" max="10" id="new-past-sem-sgpa" placeholder="SGPA" class="input-field px-2.5 py-1.5 rounded-lg text-xs w-20">
            <input type="number" min="1" max="40" id="new-past-sem-credits" placeholder="Credits" class="input-field px-2.5 py-1.5 rounded-lg text-xs w-20">
            <button onclick="handleAddPastSem()" class="px-3 py-1.5 bg-accent hover:bg-accent-dark text-white rounded-lg text-xs font-bold cursor-pointer">
              + Add
            </button>
          </div>
        </div>

        <!-- Target CGPA Goal Estimator -->
        <div class="p-5 rounded-2xl bg-white dark:bg-surface-800 border border-gray-100 dark:border-surface-700 shadow-sm space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-surface-700">
            <h4 class="font-bold text-xs uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <i data-lucide="target" class="w-3.5 h-3.5 text-purple-600"></i>
              Target CGPA Projection Calculator
            </h4>
            <span class="text-[11px] text-purple-600 font-bold">What SGPA do I need?</span>
          </div>

          <div class="space-y-3 text-xs">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-semibold text-gray-600 dark:text-gray-300 mb-1">Target CGPA Goal</label>
                <input type="number" step="0.05" min="5" max="10" id="estimator-target-cgpa" value="${targetCGPA}" oninput="handleCalculateTargetSGPA()" class="input-field w-full px-3 py-2 rounded-xl font-bold text-purple-600">
              </div>
              <div>
                <label class="block font-semibold text-gray-600 dark:text-gray-300 mb-1">Next Semester Credits</label>
                <input type="number" min="1" max="40" id="estimator-next-credits" value="22" oninput="handleCalculateTargetSGPA()" class="input-field w-full px-3 py-2 rounded-xl font-bold">
              </div>
            </div>

            <div id="estimator-result-box" class="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 text-center space-y-1">
              <span class="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300">Required SGPA in Upcoming Semester</span>
              <p id="estimator-required-sgpa" class="text-2xl font-black text-purple-600 dark:text-purple-400">8.68</p>
              <p id="estimator-verdict" class="text-[11px] text-gray-600 dark:text-gray-300">Achievable with 3 'O' and 3 'A+' grades.</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  `;
}

function openAddGradeModal() {
  const m = document.getElementById('add-grade-modal');
  if (m) m.classList.remove('hidden');
  const n = document.getElementById('grade-modal-name');
  if (n) { n.value = ''; n.focus(); }
  const c = document.getElementById('grade-modal-code');
  if (c) c.value = '';
  lucide.createIcons();
}

function closeAddGradeModal() {
  const m = document.getElementById('add-grade-modal');
  if (m) m.classList.add('hidden');
}

function handleSaveGradeCourse() {
  const name = document.getElementById('grade-modal-name')?.value.trim();
  const code = document.getElementById('grade-modal-code')?.value.trim();
  const credits = parseInt(document.getElementById('grade-modal-credits')?.value) || 3;
  const grade = document.getElementById('grade-modal-grade')?.value || 'A';

  if (!name) {
    showToast('Please enter course name', 'error');
    return;
  }

  addGradeCourse(code, name, credits, grade);
  closeAddGradeModal();
  showToast(`Added ${name} (${credits} credits) to semester! 🎓`, 'success');
  renderPage('grades');
}

function handleUpdateCourseGrade(id, newGrade) {
  updateGradeCourse(id, { grade: newGrade });
  showToast(`Updated grade to ${newGrade} (${GRADE_POINTS[newGrade]} pts)`, 'info');
  renderPage('grades');
}

function handleDeleteGradeCourse(id) {
  if (confirm('Delete this course from semester?')) {
    deleteGradeCourse(id);
    showToast('Course removed', 'info');
    renderPage('grades');
  }
}

function handleAddPastSem() {
  const name = document.getElementById('new-past-sem-name')?.value.trim();
  const sgpa = parseFloat(document.getElementById('new-past-sem-sgpa')?.value);
  const credits = parseInt(document.getElementById('new-past-sem-credits')?.value);

  if (!name || isNaN(sgpa) || isNaN(credits)) {
    showToast('Please enter valid semester name, SGPA, and credits', 'error');
    return;
  }

  addPastSemester(name, sgpa, credits);
  showToast(`Saved ${name} with ${sgpa} SGPA!`, 'success');
  renderPage('grades');
}

function handleDeletePastSem(id) {
  if (confirm('Remove this past semester record?')) {
    deletePastSemester(id);
    showToast('Past semester removed', 'info');
    renderPage('grades');
  }
}

function handleCalculateTargetSGPA() {
  const targetCGPA = parseFloat(document.getElementById('estimator-target-cgpa')?.value) || 8.5;
  const nextCredits = parseInt(document.getElementById('estimator-next-credits')?.value) || 22;
  
  const gradeData = getGradeData();
  const courses = gradeData.currentCourses || [];
  const currentSGPA = calculateSGPA(courses);
  const currentCredits = courses.reduce((acc, c) => acc + (parseFloat(c.credits) || 0), 0);
  
  let currentTotalWeighted = 0;
  let currentTotalCredits = 0;
  (gradeData.pastSemesters || []).forEach(s => {
    currentTotalCredits += parseFloat(s.totalCredits) || 0;
    currentTotalWeighted += (parseFloat(s.totalCredits) || 0) * (parseFloat(s.sgpa) || 0);
  });
  currentTotalCredits += currentCredits;
  currentTotalWeighted += currentCredits * currentSGPA;

  const neededWeighted = (targetCGPA * (currentTotalCredits + nextCredits)) - currentTotalWeighted;
  const neededSGPA = parseFloat((neededWeighted / nextCredits).toFixed(2));

  const valEl = document.getElementById('estimator-required-sgpa');
  const verdEl = document.getElementById('estimator-verdict');
  if (!valEl || !verdEl) return;

  valEl.textContent = neededSGPA > 0 ? neededSGPA.toFixed(2) : '0.00';
  if (neededSGPA > 10.0) {
    valEl.className = 'text-2xl font-black text-rose-600 dark:text-rose-400';
    verdEl.textContent = `Mathematically impossible (>10.0) in 1 semester. Aim for a gradual increase across multiple terms.`;
  } else if (neededSGPA <= 7.0) {
    valEl.className = 'text-2xl font-black text-emerald-600 dark:text-emerald-400';
    verdEl.textContent = `Very easy to maintain! Keep up regular study habits.`;
  } else {
    valEl.className = 'text-2xl font-black text-purple-600 dark:text-purple-400';
    verdEl.textContent = `Achievable with consistent high grades in your ${nextCredits} credits.`;
  }
}


// ========== WEEKLY RECAP & ACHIEVEMENT BADGES CONTROLLER ==========
function renderAchievements() {
  const weekly = getWeeklyPerformanceData();
  const badges = evaluateAchievements();
  const unlockedCount = badges.filter(b => b.unlocked).length;

  return `
    <div class="space-y-6 animate-in fade-in duration-300">
      
      <!-- Weekly Scorecard Hero -->
      <div class="p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-surface-900 border border-indigo-500/20 text-white shadow-xl relative overflow-hidden">
        <div class="absolute -top-16 -right-16 w-56 h-56 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-16 -left-16 w-56 h-56 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none"></div>

        <div class="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div class="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            ${renderProgressCircle(weekly.compositeScore, 116, 10, weekly.badgeColor, 'Weekly', weekly.grade)}
            <div class="space-y-1.5">
              <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 border border-white/20">
                <span>Week of ${weekly.startOfWeek} &ndash; ${weekly.endOfWeek}</span>
              </div>
              <h2 class="text-2xl font-black tracking-tight">Weekly Performance Scorecard</h2>
              <p class="text-xs text-gray-300 max-w-md leading-relaxed">
                ${weekly.message}
              </p>
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full md:w-auto">
            <div class="p-3 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-center">
              <span class="text-[10px] uppercase font-bold text-gray-400">Study Hours</span>
              <p class="text-lg font-black text-indigo-400 mt-0.5">${weekly.weeklyStudyHours}h</p>
              <span class="text-[9px] text-gray-300">Target: ${weekly.weeklyStudyTargetHours}h</span>
            </div>
            <div class="p-3 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-center">
              <span class="text-[10px] uppercase font-bold text-gray-400">Attendance</span>
              <p class="text-lg font-black text-emerald-400 mt-0.5">${weekly.attendanceRate}%</p>
              <span class="text-[9px] text-emerald-300">${weekly.safeCoursesCount}/${weekly.totalCourses} safe</span>
            </div>
            <div class="p-3 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-center">
              <span class="text-[10px] uppercase font-bold text-gray-400">Weekly Spent</span>
              <p class="text-lg font-black text-emerald-400 mt-0.5">₹${weekly.weeklySpent.toLocaleString('en-IN')}</p>
              <span class="text-[9px] text-gray-300">Cap: ₹${weekly.weeklyBudgetLimit.toLocaleString('en-IN')}</span>
            </div>
            <div class="p-3 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 text-center">
              <span class="text-[10px] uppercase font-bold text-gray-400">Habit Rate</span>
              <p class="text-lg font-black text-purple-400 mt-0.5">${weekly.habitCompletionRate}%</p>
              <span class="text-[9px] text-purple-300">Today's routine</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Badges Section Header -->
      <div class="flex items-center justify-between p-1">
        <div>
          <h3 class="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
            <i data-lucide="award" class="w-5 h-5 text-amber-500"></i>
            Productivity & Academic Milestones
          </h3>
          <p class="text-xs text-gray-400 mt-0.5">Earn badges by maintaining study streaks, attendance safe zones, and budget discipline.</p>
        </div>
        <span class="px-3 py-1 rounded-full text-xs font-black bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          🏆 ${unlockedCount} / ${badges.length} Unlocked
        </span>
      </div>

      <!-- Badges Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        ${badges.map(b => {
          const isUnlocked = b.unlocked;
          let borderClass = isUnlocked ? 'border-amber-300 dark:border-amber-700/60 bg-gradient-to-b from-amber-500/5 to-transparent' : 'border-gray-100 dark:border-surface-700';
          let iconBg = isUnlocked ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25' : 'bg-gray-100 dark:bg-surface-700 text-gray-400';
          let statusBadge = isUnlocked 
            ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border border-emerald-200">🏆 UNLOCKED</span>`
            : `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gray-100 dark:bg-surface-700 text-gray-500">🔒 IN PROGRESS</span>`;

          return `
            <div class="p-5 rounded-2xl bg-white dark:bg-surface-800 border ${borderClass} shadow-sm space-y-3 flex flex-col justify-between hover:border-accent/40 transition-all">
              
              <div class="space-y-2.5">
                <div class="flex items-center justify-between">
                  <div class="w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center font-bold">
                    <i data-lucide="${b.icon}" class="w-5 h-5"></i>
                  </div>
                  ${statusBadge}
                </div>

                <div>
                  <span class="text-[10px] uppercase font-extrabold tracking-wider text-accent">${b.category}</span>
                  <h4 class="font-bold text-sm text-gray-900 dark:text-white mt-0.5">${b.title}</h4>
                  <p class="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">${b.desc}</p>
                </div>
              </div>

              <!-- Progress Bar -->
              <div class="space-y-1.5 pt-2 border-t border-gray-100 dark:border-surface-700 text-xs">
                <div class="flex items-center justify-between text-[11px]">
                  <span class="text-gray-400">Progress</span>
                  <span class="font-bold text-gray-700 dark:text-gray-200">${b.progress} / ${b.max} ${b.unit}</span>
                </div>
                <div class="w-full h-2 rounded-full bg-gray-100 dark:bg-surface-700 overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-500 ${isUnlocked ? 'bg-amber-500' : 'bg-accent'}" style="width: ${b.progressPct}%;"></div>
                </div>
              </div>

            </div>
          `;
        }).join('')}
      </div>

    </div>
  `;
}


// ========== FULL BACKUP & RESTORE CONTROLLER ==========
let cachedBackupImportData = null;

function openBackupModal() {
  const m = document.getElementById('backup-restore-modal');
  if (m) m.classList.remove('hidden');

  // Update export summary numbers
  const cEl = document.getElementById('export-courses-count');
  if (cEl) cEl.textContent = getAttendanceSubjects().length;
  const eEl = document.getElementById('export-expenses-count');
  if (eEl) eEl.textContent = getExpenses().length;
  const sEl = document.getElementById('export-study-count');
  if (sEl) sEl.textContent = getStudySessions().length;

  switchBackupTab('export');
  lucide.createIcons();
}

function closeBackupModal() {
  const m = document.getElementById('backup-restore-modal');
  if (m) m.classList.add('hidden');
  cachedBackupImportData = null;
}

function switchBackupTab(tab) {
  ['export', 'import', 'reset'].forEach(t => {
    const el = document.getElementById(`backup-tab-${t}`);
    const btn = document.getElementById(`tab-btn-backup-${t}`);
    if (el) {
      if (t === tab) el.classList.remove('hidden');
      else el.classList.add('hidden');
    }
    if (btn) {
      if (t === tab) {
        btn.className = 'flex-1 py-1.5 rounded-lg transition-all text-center bg-white dark:bg-surface-800 text-gray-900 dark:text-white shadow-xs cursor-pointer';
      } else {
        btn.className = 'flex-1 py-1.5 rounded-lg transition-all text-center text-gray-500 dark:text-gray-400 hover:text-gray-900 cursor-pointer';
      }
    }
  });
  lucide.createIcons();
}

function handleExportBackup() {
  showToast('Creating complete snapshot backup...', 'info');
  const backup = exportFullDataJSON();
  const jsonStr = JSON.stringify(backup, null, 2);
  
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateTag = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `LifeFlow_Full_Backup_${dateTag}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('Backup downloaded successfully! 💾', 'success');
}

function handleImportBackupFile(input) {
  const file = input?.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      cachedBackupImportData = parsed;
      
      const box = document.getElementById('backup-preview-box');
      const nameEl = document.getElementById('preview-filename');
      const dateEl = document.getElementById('preview-date');
      const sumEl = document.getElementById('preview-summary-text');
      
      if (box) box.classList.remove('hidden');
      if (nameEl) nameEl.textContent = file.name;
      if (dateEl) dateEl.textContent = parsed.exportedAt ? new Date(parsed.exportedAt).toLocaleDateString() : 'Ready';
      
      const d = parsed.data || parsed;
      const countCourses = (d.attendance || []).length;
      const countExp = (d.expenses || []).length;
      const countStudy = (d.studySessions || []).length;
      
      if (sumEl) {
        sumEl.innerHTML = `Found: <strong>${countCourses}</strong> courses, <strong>${countExp}</strong> expenses, <strong>${countStudy}</strong> study sessions.`;
      }
    } catch (err) {
      showToast('Error reading backup file: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
}

function confirmImportBackup(mode) {
  if (!cachedBackupImportData) {
    showToast('Please select a valid backup JSON file first', 'error');
    return;
  }

  const res = importFullDataJSON(cachedBackupImportData, mode);
  if (res.success) {
    closeBackupModal();
    showToast(`Data restored successfully (${mode === 'merge' ? 'Merged' : 'Overwritten'})! 🎉`, 'success');
    renderPage(currentPage);
  } else {
    showToast(res.error || 'Restore failed', 'error');
  }
}

function handleResetAllData() {
  const input = document.getElementById('reset-confirm-input')?.value.trim();
  if (input !== 'RESET') {
    showToast('Please type "RESET" to confirm data wipe', 'error');
    return;
  }

  resetAllAppData();
  closeBackupModal();
  showToast('All application data reset to initial defaults', 'info');
  renderPage('dashboard');
}

// ========== MOBILE BOTTOM DOCK & PWA SYSTEM ==========
function toggleMobileMoreDrawer() {
  const d = document.getElementById('mobile-more-drawer');
  if (!d) return;
  if (d.classList.contains('hidden')) {
    d.classList.remove('hidden');
    lucide.createIcons();
  } else {
    d.classList.add('hidden');
  }
}

// Register PWA Service Worker for native app installation
if (typeof window !== 'undefined' && window.addEventListener && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.log('SW registration note:', err);
    });
  });
}
