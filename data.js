// LifeFlow Data Layer — localStorage persistence + mock data + auth + Supabase Cloud DB

const STORAGE_KEYS = {
  routine: 'lifeflow_routine',
  routineChecks: 'lifeflow_routine_checks',
  streak: 'lifeflow_streak',
  studySessions: 'lifeflow_study',
  expenses: 'lifeflow_expenses',
  goals: 'lifeflow_goals',
  budget: 'lifeflow_budget',
  theme: 'lifeflow_theme',
  lastResetDate: 'lifeflow_last_reset',
  // Study Routine keys
  studyRoutine: 'lifeflow_study_routine',
  studyRoutineChecks: 'lifeflow_study_routine_checks',
  // Auth keys
  users: 'lifeflow_users',
  currentUser: 'lifeflow_current_user',
  // Supabase Cloud DB keys
  supabaseUrl: 'lifeflow_supabase_url',
  supabaseKey: 'lifeflow_supabase_key',
  supabaseEnabled: 'lifeflow_supabase_enabled',
  // Dashboard Scratchpad
  quickNotes: 'lifeflow_quick_notes',
  // Friends Udhar (Loans/Debt)
  udhar: 'lifeflow_udhar',
  // Money Inflow / Income Tracker
  incomes: 'lifeflow_incomes',
  // Monthly Email Report Config
  reportConfig: 'lifeflow_report_config',
  // Class Attendance Tracker
  attendance: 'lifeflow_attendance',
  attendanceLogs: 'lifeflow_attendance_logs',
  // Academic Grades & CGPA Tracker
  grades: 'lifeflow_grades',
  // Full Backup History
  backupHistory: 'lifeflow_backup_history',
  // Achievements & Gamification Badges
  achievements: 'lifeflow_achievements',
};

const GLOBAL_STORAGE_KEYS = new Set([
  'lifeflow_users',
  'lifeflow_current_user',
  'lifeflow_theme',
  'lifeflow_supabase_url',
  'lifeflow_supabase_key',
  'lifeflow_supabase_enabled'
]);

function getScopedKey(key) {
  if (GLOBAL_STORAGE_KEYS.has(key)) {
    return key;
  }
  try {
    const rawUser = localStorage.getItem(STORAGE_KEYS.currentUser);
    if (rawUser) {
      const user = JSON.parse(rawUser);
      if (user && user.id) {
        return `${key}_${user.id}`;
      }
    }
  } catch (e) {}
  return `${key}_guest`;
}

function loadData(key, fallback) {
  try {
    const effectiveKey = getScopedKey(key);
    const d = localStorage.getItem(effectiveKey);
    return d !== null ? JSON.parse(d) : fallback;
  } catch { return fallback; }
}

function saveData(key, val) {
  const effectiveKey = getScopedKey(key);
  localStorage.setItem(effectiveKey, JSON.stringify(val));
  // Auto-sync to Supabase cloud if active
  if (typeof syncKeyToSupabase === 'function') {
    syncKeyToSupabase(effectiveKey, val);
  }
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const DEFAULT_ATTENDANCE_SUBJECTS = [
  {
    id: 'sub_1',
    name: 'Data Structures & Algorithms',
    code: 'CS201',
    teacher: 'Prof. Sharma',
    minRequiredPct: 75,
    attended: 22,
    total: 26,
    history: []
  },
  {
    id: 'sub_2',
    name: 'Database Management Systems',
    code: 'CS202',
    teacher: 'Dr. Patel',
    minRequiredPct: 75,
    attended: 19,
    total: 24,
    history: []
  },
  {
    id: 'sub_3',
    name: 'Computer Networks',
    code: 'CS203',
    teacher: 'Prof. Das',
    minRequiredPct: 75,
    attended: 14,
    total: 20,
    history: []
  },
  {
    id: 'sub_4',
    name: 'Operating Systems',
    code: 'CS204',
    teacher: 'Dr. Mishra',
    minRequiredPct: 75,
    attended: 18,
    total: 22,
    history: []
  },
  {
    id: 'sub_5',
    name: 'Discrete Mathematics',
    code: 'MATH201',
    teacher: 'Prof. Sen',
    minRequiredPct: 75,
    attended: 15,
    total: 21,
    history: []
  }
];

const GRADE_POINTS = {
  'O': 10,
  'A+': 9,
  'A': 8,
  'B+': 7,
  'B': 6,
  'C': 5,
  'P': 4,
  'F': 0
};

const DEFAULT_GRADE_DATA = {
  activeSemester: 'Semester 4',
  targetCGPA: 8.5,
  pastSemesters: [
    { id: 'sem_1', name: 'Semester 1', sgpa: 8.40, totalCredits: 22 },
    { id: 'sem_2', name: 'Semester 2', sgpa: 8.65, totalCredits: 24 },
    { id: 'sem_3', name: 'Semester 3', sgpa: 8.10, totalCredits: 23 }
  ],
  currentCourses: [
    { id: 'gc_1', code: 'CS201', name: 'Data Structures & Algorithms', credits: 4, grade: 'A+' },
    { id: 'gc_2', code: 'CS202', name: 'Database Management Systems', credits: 4, grade: 'A' },
    { id: 'gc_3', code: 'CS203', name: 'Computer Networks', credits: 3, grade: 'B+' },
    { id: 'gc_4', code: 'CS204', name: 'Operating Systems', credits: 3, grade: 'A' },
    { id: 'gc_5', code: 'MATH201', name: 'Discrete Mathematics', credits: 4, grade: 'B+' },
    { id: 'gc_6', code: 'CS205', name: 'Software Engineering Lab', credits: 2, grade: 'O' }
  ]
};

function isDemoUser() {
  const user = getCurrentUser();
  return user && user.id === 'demo_user';
}

// ========== AUTH SYSTEM ==========

// Simple hash for passwords (not crypto-secure, but fine for localStorage demo)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'lifeflow_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getUsers() {
  return loadData(STORAGE_KEYS.users, []);
}

function saveUsers(users) {
  saveData(STORAGE_KEYS.users, users);
}

function getCurrentUser() {
  return loadData(STORAGE_KEYS.currentUser, null);
}

function setCurrentUser(user) {
  if (user) {
    // Store session with user info (no password)
    saveData(STORAGE_KEYS.currentUser, {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    });
  } else {
    localStorage.removeItem(STORAGE_KEYS.currentUser);
  }
}

async function registerUser(name, email, password) {
  const users = getUsers();

  // Check if email already exists
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return { success: false, error: 'An account with this email already exists.' };
  }

  const hashedPw = await hashPassword(password);
  const newUser = {
    id: uid(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: hashedPw,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveUsers(users);

  // Initialize a 100% FRESH, CLEAN slate for this new user ID
  initNewUserData(newUser.id, newUser.name);

  setCurrentUser(newUser);

  return { success: true, user: newUser };
}

async function loginUser(email, password) {
  const users = getUsers();
  const hashedPw = await hashPassword(password);
  const user = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === hashedPw);

  if (!user) {
    return { success: false, error: 'Invalid email or password.' };
  }

  setCurrentUser(user);
  return { success: true, user };
}

function logoutUser() {
  setCurrentUser(null);
}

function isLoggedIn() {
  return getCurrentUser() !== null;
}

// Create a demo account if it doesn't exist yet

// Initialize 100% Brand-New, Clean Workspace for a New User
function initNewUserData(userId, name) {
  const k = (key) => `${key}_${userId}`;
  
  // Clean Daily Routine checklist (all unchecked)
  localStorage.setItem(k(STORAGE_KEYS.routine), JSON.stringify(DEFAULT_ROUTINE));
  localStorage.setItem(k(STORAGE_KEYS.routineChecks), JSON.stringify({}));
  localStorage.setItem(k(STORAGE_KEYS.streak), JSON.stringify({ current: 0, best: 0, lastCheckDate: '' }));
  
  // Clean Study Sessions & Routine
  localStorage.setItem(k(STORAGE_KEYS.studySessions), JSON.stringify([]));
  localStorage.setItem(k(STORAGE_KEYS.studyRoutine), JSON.stringify(DEFAULT_STUDY_ROUTINE));
  localStorage.setItem(k(STORAGE_KEYS.studyRoutineChecks), JSON.stringify({}));
  
  // Clean Finances (0 expenses, 0 incomes)
  localStorage.setItem(k(STORAGE_KEYS.expenses), JSON.stringify([]));
  localStorage.setItem(k(STORAGE_KEYS.incomes), JSON.stringify([]));
  localStorage.setItem(k(STORAGE_KEYS.budget), JSON.stringify(15000));
  
  // Clean Goals & Friends Lending
  localStorage.setItem(k(STORAGE_KEYS.goals), JSON.stringify([]));
  localStorage.setItem(k(STORAGE_KEYS.udhar), JSON.stringify([]));
  
  // Personalized Welcome Scratchpad Note
  const firstName = (name || 'Friend').trim().split(' ')[0];
  const welcomeNote = `Welcome ${firstName}!

This is your private LifeFlow workspace. Use this scratchpad to jot down quick notes, daily goals, or reminders.`;
  localStorage.setItem(k(STORAGE_KEYS.quickNotes), JSON.stringify(welcomeNote));
  
  // Clean Class Attendance (0 courses added yet)
  localStorage.setItem(k(STORAGE_KEYS.attendance), JSON.stringify([]));
  localStorage.setItem(k(STORAGE_KEYS.attendanceLogs), JSON.stringify([]));
  
  // Clean Academic Grades & CGPA Calculator (0 courses added yet)
  localStorage.setItem(k(STORAGE_KEYS.grades), JSON.stringify({
    activeSemester: 'Semester 1',
    targetCGPA: 8.5,
    pastSemesters: [],
    currentCourses: []
  }));
  
  // Clean Achievements & Backup History
  localStorage.setItem(k(STORAGE_KEYS.achievements), JSON.stringify([]));
  localStorage.setItem(k(STORAGE_KEYS.backupHistory), JSON.stringify([]));
}

// Initialize rich sample data for Demo Account
function initDemoUserData(userId = 'demo_user') {
  const k = (key) => `${key}_${userId}`;
  if (localStorage.getItem(k(STORAGE_KEYS.routine)) === null) {
    localStorage.setItem(k(STORAGE_KEYS.routine), JSON.stringify(DEFAULT_ROUTINE));
  }
  if (localStorage.getItem(k(STORAGE_KEYS.routineChecks)) === null) {
    const checks = {};
    checks[todayStr()] = { r1: true, r2: true, r3: true, r5: true };
    localStorage.setItem(k(STORAGE_KEYS.routineChecks), JSON.stringify(checks));
  }
  if (localStorage.getItem(k(STORAGE_KEYS.studyRoutine)) === null) {
    localStorage.setItem(k(STORAGE_KEYS.studyRoutine), JSON.stringify(DEFAULT_STUDY_ROUTINE));
  }
  if (localStorage.getItem(k(STORAGE_KEYS.studyRoutineChecks)) === null) {
    const sChecks = {};
    sChecks[todayStr()] = { sr1: true, sr2: true };
    localStorage.setItem(k(STORAGE_KEYS.studyRoutineChecks), JSON.stringify(sChecks));
  }
  if (localStorage.getItem(k(STORAGE_KEYS.streak)) === null) {
    localStorage.setItem(k(STORAGE_KEYS.streak), JSON.stringify({ current: 7, best: 14, lastCheckDate: todayStr() }));
  }
  if (localStorage.getItem(k(STORAGE_KEYS.studySessions)) === null) {
    localStorage.setItem(k(STORAGE_KEYS.studySessions), JSON.stringify(DEFAULT_STUDY_SESSIONS));
  }
  if (localStorage.getItem(k(STORAGE_KEYS.expenses)) === null) {
    localStorage.setItem(k(STORAGE_KEYS.expenses), JSON.stringify(DEFAULT_EXPENSES));
  }
  if (localStorage.getItem(k(STORAGE_KEYS.incomes)) === null) {
    localStorage.setItem(k(STORAGE_KEYS.incomes), JSON.stringify(DEFAULT_INCOMES));
  }
  if (localStorage.getItem(k(STORAGE_KEYS.goals)) === null) {
    localStorage.setItem(k(STORAGE_KEYS.goals), JSON.stringify(DEFAULT_GOALS));
  }
  if (localStorage.getItem(k(STORAGE_KEYS.budget)) === null) {
    localStorage.setItem(k(STORAGE_KEYS.budget), JSON.stringify(DEFAULT_BUDGET));
  }
  if (localStorage.getItem(k(STORAGE_KEYS.udhar)) === null) {
    localStorage.setItem(k(STORAGE_KEYS.udhar), JSON.stringify(DEFAULT_UDHAR));
  }
  if (localStorage.getItem(k(STORAGE_KEYS.quickNotes)) === null) {
    localStorage.setItem(k(STORAGE_KEYS.quickNotes), JSON.stringify(DEFAULT_SCRATCHPAD_NOTE));
  }
  if (localStorage.getItem(k(STORAGE_KEYS.attendance)) === null) {
    localStorage.setItem(k(STORAGE_KEYS.attendance), JSON.stringify(DEFAULT_ATTENDANCE_SUBJECTS));
  }
  if (localStorage.getItem(k(STORAGE_KEYS.attendanceLogs)) === null) {
    localStorage.setItem(k(STORAGE_KEYS.attendanceLogs), JSON.stringify([]));
  }
  if (localStorage.getItem(k(STORAGE_KEYS.grades)) === null) {
    localStorage.setItem(k(STORAGE_KEYS.grades), JSON.stringify(DEFAULT_GRADE_DATA));
  }
}

async function ensureDemoAccount() {
  const users = getUsers();
  if (!users.find(u => u.email === 'demo@lifeflow.app')) {
    const hashedPw = await hashPassword('demo123');
    users.push({
      id: 'demo_user',
      name: 'Demo User',
      email: 'demo@lifeflow.app',
      password: hashedPw,
      createdAt: new Date().toISOString(),
    });
    saveUsers(users);
  }
  initDemoUserData('demo_user');
}
ensureDemoAccount();

// ========== SUPABASE CLOUD DATABASE INTEGRATION ==========

let supabaseClient = null;

function getSupabaseConfig() {
  return {
    url: localStorage.getItem(STORAGE_KEYS.supabaseUrl) || '',
    key: localStorage.getItem(STORAGE_KEYS.supabaseKey) || '',
    enabled: localStorage.getItem(STORAGE_KEYS.supabaseEnabled) === 'true'
  };
}

function saveSupabaseConfig(url, key, enabled) {
  localStorage.setItem(STORAGE_KEYS.supabaseUrl, (url || '').trim());
  localStorage.setItem(STORAGE_KEYS.supabaseKey, (key || '').trim());
  localStorage.setItem(STORAGE_KEYS.supabaseEnabled, enabled ? 'true' : 'false');
  return initSupabase();
}

function initSupabase() {
  const config = getSupabaseConfig();
  if (window.supabase && config.url && config.key && config.enabled) {
    try {
      supabaseClient = window.supabase.createClient(config.url, config.key);
      console.log('⚡ Supabase Client successfully initialized');
      return supabaseClient;
    } catch (err) {
      console.error('Failed to init Supabase client:', err);
      supabaseClient = null;
    }
  } else {
    supabaseClient = null;
  }
  return supabaseClient;
}

function isSupabaseConnected() {
  return supabaseClient !== null;
}

function getCurrentUserEmail() {
  const u = getCurrentUser();
  return (u && u.email) ? u.email : 'guest@lifeflow.app';
}

async function syncKeyToSupabase(key, val) {
  if (!supabaseClient) return;
  // Don't loop or sync supabase credentials into cloud
  if (
    key === STORAGE_KEYS.supabaseUrl ||
    key === STORAGE_KEYS.supabaseKey ||
    key === STORAGE_KEYS.supabaseEnabled
  ) return;

  try {
    const userEmail = getCurrentUserEmail();
    const rowId = `${userEmail}_${key}`;
    await supabaseClient.from('lifeflow_sync').upsert({
      id: rowId,
      user_id: userEmail,
      key: key,
      data: val,
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn(`Supabase sync warning for key "${key}":`, err);
  }
}

async function testSupabaseConnection(url, key) {
  const cleanUrl = (url || '').trim();
  const cleanKey = (key || '').trim();
  if (!cleanUrl || !cleanKey) {
    return { success: false, message: 'Please provide both Project URL and Anon API Key' };
  }
  if (!window.supabase) {
    return { success: false, message: 'Supabase JS library is not loaded. Please verify internet connection.' };
  }
  try {
    const testClient = window.supabase.createClient(cleanUrl, cleanKey);
    const { data, error } = await testClient.from('lifeflow_sync').select('key').limit(1);
    if (error) {
      if (error.code === '42P01' || (error.message && (error.message.includes('relation') || error.message.includes('does not exist')))) {
        return {
          success: true,
          tableMissing: true,
          message: 'Connected to Supabase! However, the "lifeflow_sync" table was not found yet. Click "Copy SQL Schema" below and run it in your Supabase SQL Editor.'
        };
      }
      return { success: false, message: error.message || 'Connection test failed' };
    }
    return { success: true, message: 'Successfully connected to Supabase Cloud Database!' };
  } catch (err) {
    return { success: false, message: err.message || 'Network / connection error' };
  }
}

async function pushAllToSupabase() {
  if (!supabaseClient) {
    throw new Error('Supabase is not connected. Configure credentials first.');
  }
  const userEmail = getCurrentUserEmail();
  const keysToSync = [
    STORAGE_KEYS.routine,
    STORAGE_KEYS.routineChecks,
    STORAGE_KEYS.studyRoutine,
    STORAGE_KEYS.studyRoutineChecks,
    STORAGE_KEYS.streak,
    STORAGE_KEYS.studySessions,
    STORAGE_KEYS.expenses,
    STORAGE_KEYS.goals,
    STORAGE_KEYS.budget,
    STORAGE_KEYS.theme,
    STORAGE_KEYS.quickNotes,
    STORAGE_KEYS.udhar,
    STORAGE_KEYS.incomes,
    STORAGE_KEYS.reportConfig
  ];
  const rows = [];
  for (const k of keysToSync) {
    const val = loadData(k, null);
    if (val !== null) {
      rows.push({
        id: `${userEmail}_${k}`,
        user_id: userEmail,
        key: k,
        data: val,
        updated_at: new Date().toISOString()
      });
    }
  }

  const { error } = await supabaseClient.from('lifeflow_sync').upsert(rows);
  if (error) throw error;
  return { success: true, count: rows.length };
}

async function pullAllFromSupabase() {
  if (!supabaseClient) {
    throw new Error('Supabase is not connected. Configure credentials first.');
  }
  const userEmail = getCurrentUserEmail();
  const { data, error } = await supabaseClient
    .from('lifeflow_sync')
    .select('key, data')
    .eq('user_id', userEmail);

  if (error) throw error;
  if (!data || data.length === 0) {
    return { success: true, count: 0, message: 'No cloud records found for this account.' };
  }

  let updated = 0;
  data.forEach(item => {
    if (item.key && item.data !== undefined) {
      localStorage.setItem(item.key, JSON.stringify(item.data));
      updated++;
    }
  });

  return { success: true, count: updated, message: `Successfully pulled ${updated} datasets from cloud!` };
}

function getSupabaseSqlSchema() {
  return `-- ===============================================
-- LifeFlow Cloud Database Schema for Supabase
-- Paste and run this in your Supabase SQL Editor:
-- ===============================================

CREATE TABLE IF NOT EXISTS lifeflow_sync (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  key TEXT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE lifeflow_sync ENABLE ROW LEVEL SECURITY;

-- Allow read & write access for public demo with Anon Key
DROP POLICY IF EXISTS "Allow anon read write on lifeflow_sync" ON lifeflow_sync;
CREATE POLICY "Allow anon read write on lifeflow_sync"
  ON lifeflow_sync
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- (Optional) Enable Realtime replication
ALTER PUBLICATION supabase_realtime ADD TABLE lifeflow_sync;
`;
}

// ========== DEFAULT MOCK DATA ==========

const DEFAULT_SCRATCHPAD_NOTE = 'Welcome to LifeFlow Tracker!\n\nUse this scratchpad for quick ideas, daily priorities, or exam prep notes.';

const DEFAULT_ROUTINE = [
  { id: 'r1', name: 'Wake up at 6:30 AM', period: 'Morning' },
  { id: 'r2', name: 'Morning stretches & yoga', period: 'Morning' },
  { id: 'r3', name: 'Healthy breakfast', period: 'Morning' },
  { id: 'r4', name: 'Review today\'s goals', period: 'Morning' },
  { id: 'r5', name: 'Deep work block (2 hrs)', period: 'Afternoon' },
  { id: 'r6', name: 'Lunch break + walk', period: 'Afternoon' },
  { id: 'r7', name: 'Study/Course work', period: 'Afternoon' },
  { id: 'r8', name: 'Exercise / Gym', period: 'Evening' },
  { id: 'r9', name: 'Read for 30 min', period: 'Evening' },
  { id: 'r10', name: 'Journal & reflect', period: 'Night' },
  { id: 'r11', name: 'Prepare for tomorrow', period: 'Night' },
  { id: 'r12', name: 'Sleep by 11 PM', period: 'Night' },
];

const DEFAULT_ROUTINE_CHECKS = {};

// Default Study Routine slots
const DEFAULT_STUDY_ROUTINE = [
  { id: 'sr1', subject: 'Mathematics', topic: 'Calculus & Problem Solving', time: '06:30 AM - 08:00 AM', duration: 90, period: 'Morning' },
  { id: 'sr2', subject: 'Computer Science', topic: 'Algorithms & Data Structures Practice', time: '11:00 AM - 12:30 PM', duration: 90, period: 'Morning' },
  { id: 'sr3', subject: 'Physics', topic: 'Concepts, Derivations & Numerical Practice', time: '03:00 PM - 04:30 PM', duration: 90, period: 'Afternoon' },
  { id: 'sr4', subject: 'Core Subjects', topic: 'Revision & Flashcards', time: '06:30 PM - 07:30 PM', duration: 60, period: 'Evening' },
  { id: 'sr5', subject: 'Self Assessment', topic: 'Mock Test & Doubt Clearing', time: '09:30 PM - 10:30 PM', duration: 60, period: 'Night' },
];

const DEFAULT_STUDY_SESSIONS = [
  { id: 's1', subject: 'Mathematics', topic: 'Linear Algebra — Eigenvalues', duration: 45, date: daysAgo(0), notes: 'Covered eigenvalue decomposition. Need to practice more problems.' },
  { id: 's2', subject: 'Physics', topic: 'Quantum Mechanics Basics', duration: 60, date: daysAgo(0), notes: 'Wave-particle duality and Schrodinger equation intro.' },
  { id: 's3', subject: 'Computer Science', topic: 'Dynamic Programming', duration: 90, date: daysAgo(1), notes: 'Solved 5 DP problems on LeetCode. Memoization vs tabulation.' },
  { id: 's4', subject: 'Mathematics', topic: 'Calculus — Integration by Parts', duration: 50, date: daysAgo(1), notes: 'LIATE rule and practice problems.' },
  { id: 's5', subject: 'English', topic: 'Essay Writing Structure', duration: 30, date: daysAgo(2), notes: 'Thesis statement, body paragraphs, conclusion framework.' },
  { id: 's6', subject: 'Computer Science', topic: 'Graph Algorithms — BFS/DFS', duration: 75, date: daysAgo(2), notes: 'Implemented BFS and DFS from scratch. Solved 3 graph problems.' },
  { id: 's7', subject: 'Physics', topic: 'Thermodynamics — Laws', duration: 40, date: daysAgo(3), notes: 'First and second laws. Entropy concept.' },
  { id: 's8', subject: 'Mathematics', topic: 'Probability Distributions', duration: 55, date: daysAgo(3), notes: 'Normal, binomial, Poisson distributions.' },
  { id: 's9', subject: 'Computer Science', topic: 'System Design Basics', duration: 65, date: daysAgo(4), notes: 'Load balancers, caching, database sharding.' },
  { id: 's10', subject: 'Physics', topic: 'Optics — Interference', duration: 35, date: daysAgo(5), notes: 'Young double slit experiment derivation.' },
  { id: 's11', subject: 'Mathematics', topic: 'Differential Equations', duration: 70, date: daysAgo(5), notes: 'First order ODEs, separable and exact.' },
  { id: 's12', subject: 'Computer Science', topic: 'React & State Management', duration: 80, date: daysAgo(6), notes: 'Built a todo app with useReducer.' },
];

const DEFAULT_EXPENSES = [
  { id: 'e1', amount: 250, category: 'Food', description: 'Lunch at college canteen', date: daysAgo(0), payment: 'UPI' },
  { id: 'e2', amount: 499, category: 'Study Material', description: 'Algorithms textbook (used)', date: daysAgo(0), payment: 'UPI' },
  { id: 'e3', amount: 150, category: 'Travel', description: 'Metro pass recharge', date: daysAgo(1), payment: 'Card' },
  { id: 'e4', amount: 89, category: 'Food', description: 'Coffee + snacks', date: daysAgo(1), payment: 'Cash' },
  { id: 'e5', amount: 299, category: 'Entertainment', description: 'Netflix subscription', date: daysAgo(2), payment: 'Card' },
  { id: 'e6', amount: 1200, category: 'Bills', description: 'Electricity bill share', date: daysAgo(3), payment: 'Net Banking' },
  { id: 'e7', amount: 180, category: 'Food', description: 'Dinner with friends', date: daysAgo(3), payment: 'UPI' },
  { id: 'e8', amount: 350, category: 'Study Material', description: 'LeetCode Premium (monthly)', date: daysAgo(4), payment: 'Card' },
  { id: 'e9', amount: 120, category: 'Travel', description: 'Auto rickshaw', date: daysAgo(5), payment: 'Cash' },
  { id: 'e10', amount: 450, category: 'Food', description: 'Weekly groceries', date: daysAgo(6), payment: 'UPI' },
  { id: 'e11', amount: 199, category: 'Entertainment', description: 'Spotify subscription', date: daysAgo(7), payment: 'Card' },
  { id: 'e12', amount: 600, category: 'Bills', description: 'Internet bill', date: daysAgo(8), payment: 'Net Banking' },
];

const DEFAULT_GOALS = [
  {
    id: 'g1', title: 'Master Data Structures & Algorithms', category: 'Academic',
    dueDate: '2026-12-31',
    milestones: [
      { id: 'm1', text: 'Complete Arrays & Strings', done: true },
      { id: 'm2', text: 'Finish Trees & Graphs', done: true },
      { id: 'm3', text: 'Dynamic Programming (50 problems)', done: false },
      { id: 'm4', text: 'Solve 200 LeetCode problems', done: false },
    ]
  },
  {
    id: 'g2', title: 'Build Personal Portfolio Website', category: 'Short-term',
    dueDate: '2026-10-15',
    milestones: [
      { id: 'm5', text: 'Design wireframes', done: true },
      { id: 'm6', text: 'Build homepage', done: true },
      { id: 'm7', text: 'Add project showcase', done: false },
      { id: 'm8', text: 'Deploy to production', done: false },
    ]
  },
  {
    id: 'g3', title: 'Get Fit — 6 Month Transformation', category: 'Long-term',
    dueDate: '2027-03-20',
    milestones: [
      { id: 'm9', text: 'Join gym & get trainer', done: true },
      { id: 'm10', text: 'Consistent for 1 month', done: true },
      { id: 'm11', text: 'Reach 70kg target weight', done: false },
      { id: 'm12', text: '5km run under 25 min', done: false },
      { id: 'm13', text: 'Complete 6-month streak', done: false },
    ]
  },
  {
    id: 'g4', title: 'Learn Japanese (N5 Level)', category: 'Long-term',
    dueDate: '2027-06-01',
    milestones: [
      { id: 'm14', text: 'Master Hiragana', done: true },
      { id: 'm15', text: 'Master Katakana', done: false },
      { id: 'm16', text: 'Learn 100 Kanji', done: false },
      { id: 'm17', text: 'Pass N5 mock test', done: false },
    ]
  },
  {
    dueDate: '2027-01-15',
    milestones: [
      { id: 'm18', text: 'Literature review complete', done: true },
      { id: 'm19', text: 'Data collection finished', done: false },
      { id: 'm20', text: 'Draft paper written', done: false },
      { id: 'm21', text: 'Submit to journal', done: false },
    ]
  },
  {
    id: 'g6', title: 'Read 24 Books This Year', category: 'Short-term',
    dueDate: '2026-12-31',
    milestones: [
      { id: 'm22', text: 'Finish 6 books (Q1)', done: true },
      { id: 'm23', text: 'Finish 12 books (Q2)', done: true },
      { id: 'm24', text: 'Finish 18 books (Q3)', done: false },
      { id: 'm25', text: 'Finish 24 books (Q4)', done: false },
    ]
  },
];

const DEFAULT_BUDGET = 8000;

const DEFAULT_UDHAR = [
  { id: 'u1', friend: 'Rahul Sharma', amount: 450, type: 'gave', note: 'College canteen lunch split', date: daysAgo(2), dueDate: daysAgo(-3), status: 'pending' },
  { id: 'u2', friend: 'Amit Patel', amount: 1200, type: 'gave', note: 'Shared hostel electricity bill', date: daysAgo(5), dueDate: daysAgo(-1), status: 'pending' },
  { id: 'u3', friend: 'Priya Das', amount: 200, type: 'took', note: 'Auto rickshaw emergency cash', date: daysAgo(1), dueDate: daysAgo(-2), status: 'pending' },
  { id: 'u4', friend: 'Bikash Mohanty', amount: 350, type: 'gave', note: 'Movie tickets share', date: daysAgo(8), dueDate: daysAgo(0), status: 'settled', settledDate: daysAgo(1) },
  { id: 'u5', friend: 'Sneha Rao', amount: 500, type: 'took', note: 'Borrowed for books purchase', date: daysAgo(12), dueDate: daysAgo(2), status: 'settled', settledDate: daysAgo(3) },
];

const DEFAULT_INCOMES = [
  { id: 'inc1', amount: 8000, source: 'Parents / Pocket Money', description: 'Monthly allowance from parents', date: daysAgo(2), payment: 'UPI' },
  { id: 'inc2', amount: 3500, source: 'Freelance / Projects', description: 'Web design UI project fee', date: daysAgo(5), payment: 'Bank Transfer' },
  { id: 'inc3', amount: 1200, source: 'Tuition / Teaching', description: 'Math tutoring fee', date: daysAgo(9), payment: 'Cash' },
  { id: 'inc4', amount: 500, source: 'Gift / Reward', description: 'Birthday gift money', date: daysAgo(12), payment: 'UPI' },
  { id: 'inc5', amount: 350, source: 'Refund / Cashback', description: 'Shopping return refund', date: daysAgo(16), payment: 'UPI' },
];

const DEFAULT_REPORT_CONFIG = {
  enabled: true,
  receiverEmail: '',
  gmailUser: '',
  gmailAppPassword: '',
  smtpHost: 'smtp.gmail.com',
  smtpPort: 465,
  lastSentMonth: '',
  autoDownloadPdf: true
};

// ========== INITIALIZE DATA ==========

function initData() {
  ensureDemoAccount();
  checkDailyReset();
  initSupabase();
}

function checkDailyReset() {
  const lastReset = localStorage.getItem(STORAGE_KEYS.lastResetDate);
  const today = todayStr();
  if (lastReset !== today) {
    localStorage.setItem(STORAGE_KEYS.lastResetDate, today);
  }
}
// ========== DATA ACCESS ==========
function getRoutine() { return loadData(STORAGE_KEYS.routine, DEFAULT_ROUTINE); }
function getRoutineChecks() { return loadData(STORAGE_KEYS.routineChecks, {}); }
function getTodayChecks() {
  const all = getRoutineChecks();
  return all[todayStr()] || {};
}
function setRoutineCheck(taskId, checked) {
  const all = getRoutineChecks();
  if (!all[todayStr()]) all[todayStr()] = {};
  all[todayStr()][taskId] = checked;
  saveData(STORAGE_KEYS.routineChecks, all);
}
function getStreak() { return loadData(STORAGE_KEYS.streak, 0); }
function setStreak(v) { saveData(STORAGE_KEYS.streak, v); }
function getStudySessions() { return loadData(STORAGE_KEYS.studySessions, isDemoUser() ? DEFAULT_STUDY_SESSIONS : []); }
function addStudySession(s) {
  const all = getStudySessions();
  all.unshift(s);
  saveData(STORAGE_KEYS.studySessions, all);
}
function getExpenses() { return loadData(STORAGE_KEYS.expenses, isDemoUser() ? DEFAULT_EXPENSES : []); }
function addExpenseEntry(e) {
  const all = getExpenses();
  all.unshift(e);
  saveData(STORAGE_KEYS.expenses, all);
}
function getGoals() { return loadData(STORAGE_KEYS.goals, isDemoUser() ? DEFAULT_GOALS : []); }
function saveGoals(g) { saveData(STORAGE_KEYS.goals, g); }
function getBudget() { return loadData(STORAGE_KEYS.budget, 8000); }
function setBudget(v) { saveData(STORAGE_KEYS.budget, v); }
function getTheme() { return localStorage.getItem(STORAGE_KEYS.theme) || 'dark'; }
function setThemePref(t) { localStorage.setItem(STORAGE_KEYS.theme, t); }

function addRoutineTask(task) {
  const all = getRoutine();
  all.push(task);
  saveData(STORAGE_KEYS.routine, all);
}

function removeRoutineTask(id) {
  let all = getRoutine();
  all = all.filter(t => t.id !== id);
  saveData(STORAGE_KEYS.routine, all);
}

// ========== STUDY ROUTINE DATA ACCESS ==========
function getStudyRoutine() {
  return loadData(STORAGE_KEYS.studyRoutine, isDemoUser() ? DEFAULT_STUDY_ROUTINE : []);
}

function getStudyRoutineChecks() {
  return loadData(STORAGE_KEYS.studyRoutineChecks, {});
}

function getTodayStudyChecks() {
  const all = getStudyRoutineChecks();
  return all[todayStr()] || {};
}

function setStudyRoutineCheck(slotId, checked) {
  const all = getStudyRoutineChecks();
  if (!all[todayStr()]) all[todayStr()] = {};
  all[todayStr()][slotId] = checked;
  saveData(STORAGE_KEYS.studyRoutineChecks, all);
}

function addStudyRoutineSlot(slot) {
  const all = getStudyRoutine();
  all.push(slot);
  saveData(STORAGE_KEYS.studyRoutine, all);
}

function removeStudyRoutineSlot(id) {
  let all = getStudyRoutine();
  all = all.filter(s => s.id !== id);
  saveData(STORAGE_KEYS.studyRoutine, all);
}

function getStudyRoutineCompletion() {
  const routine = getStudyRoutine();
  const checks = getTodayStudyChecks();
  if (routine.length === 0) return 0;
  const done = routine.filter(r => checks[r.id]).length;
  return Math.round((done / routine.length) * 100);
}

// Stats helpers
function getTodayStudyHours() {
  const sessions = getStudySessions().filter(s => s.date === todayStr());
  const totalMin = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  return (totalMin / 60).toFixed(1);
}

function getRoutineCompletion() {
  const routine = getRoutine();
  const checks = getTodayChecks();
  if (routine.length === 0) return 0;
  const done = routine.filter(r => checks[r.id]).length;
  return Math.round((done / routine.length) * 100);
}

function getMonthlySpent() {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  return getExpenses()
    .filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === month && d.getFullYear() === year;
    })
    .reduce((sum, e) => sum + e.amount, 0);
}

function getActiveGoals() {
  return getGoals().filter(g => {
    const progress = getGoalProgress(g);
    return progress < 100;
  }).length;
}

function getGoalProgress(goal) {
  if (!goal.milestones || goal.milestones.length === 0) return 0;
  const done = goal.milestones.filter(m => m.done).length;
  return Math.round((done / goal.milestones.length) * 100);
}

function getDaysLeft(dateStr) {
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Initialize on load
initData();

// Delete expense by ID
function deleteExpense(id) {
  let all = getExpenses();
  all = all.filter(e => e.id !== id);
  saveData(STORAGE_KEYS.expenses, all);
}

// ========== UNIQUE DASHBOARD HELPERS ==========
function getQuickNotes() {
  return localStorage.getItem(STORAGE_KEYS.quickNotes) || '';
}

function saveQuickNotes(text) {
  localStorage.setItem(STORAGE_KEYS.quickNotes, text);
  if (typeof syncKeyToSupabase === 'function') {
    syncKeyToSupabase(STORAGE_KEYS.quickNotes, text);
  }
}

function getSafeDailySpend() {
  const budget = getBudget();
  const spent = getMonthlySpent();
  const remaining = Math.max(0, budget - spent);
  
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(1, daysInMonth - now.getDate() + 1);
  
  return {
    remaining,
    daysRemaining,
    dailySafe: Math.round(remaining / daysRemaining)
  };
}

function getLifeScore() {
  const routinePct = getRoutineCompletion();
  const studyRoutinePct = getStudyRoutineCompletion();
  
  const budget = getBudget();
  const spent = getMonthlySpent();
  const remainingPct = budget > 0 ? Math.min(100, Math.max(0, ((budget - spent) / budget) * 100)) : 100;
  
  // Weights: Routine (40%), Study Routine (35%), Budget (25%)
  const score = Math.round((routinePct * 0.40) + (studyRoutinePct * 0.35) + (remainingPct * 0.25));
  
  let label = 'Steady Flow';
  let badgeClass = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800';
  let emoji = '⚡';
  
  if (score >= 80) {
    label = 'Peak Performance';
    badgeClass = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
    emoji = '🚀';
  } else if (score >= 60) {
    label = 'High Momentum';
    badgeClass = 'bg-accent/10 text-accent border-accent/20';
    emoji = '🔥';
  } else if (score >= 40) {
    label = 'In Progress';
    badgeClass = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800';
    emoji = '🌱';
  } else {
    label = 'Getting Started';
    badgeClass = 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800';
    emoji = '🎯';
  }
  
  return { score, label, badgeClass, emoji, routinePct, studyRoutinePct, remainingPct: Math.round(remainingPct) };
}

function getDayProgress() {
  const now = new Date();
  const totalMinutes = now.getHours() * 60 + now.getMinutes();
  return Math.round((totalMinutes / 1440) * 100);
}

// ========== FRIENDS UDHAR (KHATA / LOANS) ==========
function getUdharRecords() {
  return loadData(STORAGE_KEYS.udhar, isDemoUser() ? DEFAULT_UDHAR : []);
}

function addUdharRecord(record) {
  const all = getUdharRecords();
  all.unshift(record);
  saveData(STORAGE_KEYS.udhar, all);
}

function settleUdharRecord(id) {
  const all = getUdharRecords();
  const rec = all.find(r => r.id === id);
  if (rec) {
    rec.status = 'settled';
    rec.settledDate = todayStr();
    saveData(STORAGE_KEYS.udhar, all);
  }
}

function unsettleUdharRecord(id) {
  const all = getUdharRecords();
  const rec = all.find(r => r.id === id);
  if (rec) {
    rec.status = 'pending';
    delete rec.settledDate;
    saveData(STORAGE_KEYS.udhar, all);
  }
}

function deleteUdharRecord(id) {
  let all = getUdharRecords();
  all = all.filter(r => r.id !== id);
  saveData(STORAGE_KEYS.udhar, all);
}

function getUdharSummary() {
  const all = getUdharRecords();
  const pendingGave = all.filter(r => r.type === 'gave' && r.status === 'pending');
  const pendingTook = all.filter(r => r.type === 'took' && r.status === 'pending');
  
  const totalToGet = pendingGave.reduce((sum, r) => sum + r.amount, 0);
  const totalToPay = pendingTook.reduce((sum, r) => sum + r.amount, 0);
  const netBalance = totalToGet - totalToPay;
  
  const activeFriendsSet = new Set([...pendingGave, ...pendingTook].map(r => r.friend));

  return {
    totalToGet,
    totalToPay,
    netBalance,
    pendingGaveCount: pendingGave.length,
    pendingTookCount: pendingTook.length,
    activeFriendsCount: activeFriendsSet.size,
    totalRecords: all.length,
    settledCount: all.filter(r => r.status === 'settled').length
  };
}


// ========== MONEY INFLOW / INCOME TRACKER ==========
function getIncomes() {
  return loadData(STORAGE_KEYS.incomes, isDemoUser() ? DEFAULT_INCOMES : []);
}

function addIncomeEntry(entry) {
  const all = getIncomes();
  all.unshift(entry);
  saveData(STORAGE_KEYS.incomes, all);
}

function deleteIncome(id) {
  let all = getIncomes();
  all = all.filter(i => i.id !== id);
  saveData(STORAGE_KEYS.incomes, all);
}

function getMonthlyIncome() {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  return getIncomes()
    .filter(i => {
      const d = new Date(i.date);
      return d.getMonth() === month && d.getFullYear() === year;
    })
    .reduce((sum, i) => sum + i.amount, 0);
}

function getTotalIncome() {
  return getIncomes().reduce((sum, i) => sum + i.amount, 0);
}

function getNetSavings() {
  return getMonthlyIncome() - getMonthlySpent();
}

function getIncomeSourceEmoji(source) {
  const map = {
    'Parents / Pocket Money': '👨‍👩‍👦',
    'Salary / Stipend': '💼',
    'Freelance / Projects': '💻',
    'Tuition / Teaching': '🎓',
    'Gift / Reward': '🎁',
    'Udhar Return': '🤝',
    'Refund / Cashback': '🔄',
    'Investments': '📈',
    'Other': '💵'
  };
  return map[source] || '💵';
}

function getIncomeSourceClass(source) {
  const map = {
    'Parents / Pocket Money': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    'Salary / Stipend': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
    'Freelance / Projects': 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
    'Tuition / Teaching': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    'Gift / Reward': 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
    'Udhar Return': 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20',
    'Refund / Cashback': 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20',
    'Investments': 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20',
    'Other': 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20'
  };
  return map[source] || map['Other'];
}

// ========== MONTHLY REPORT & EMAIL AUTOMATION ==========


function getReportConfig() {
  const cfg = loadData(STORAGE_KEYS.reportConfig, DEFAULT_REPORT_CONFIG);
  if (!cfg.receiverEmail) {
    cfg.receiverEmail = getCurrentUserEmail();
  }
  return cfg;
}

function saveReportConfig(cfg) {
  saveData(STORAGE_KEYS.reportConfig, cfg);
}

function getMonthlyReportData(year, month) {
  const now = new Date();
  const y = year !== undefined ? parseInt(year) : now.getFullYear();
  const m = month !== undefined ? parseInt(month) : now.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthLabel = `${monthNames[m]} ${y}`;

  // 1. User details
  const user = getCurrentUser() || { name: 'LifeFlow User', email: getCurrentUserEmail() };

  // 2. Expenses this month
  const monthlyExpenses = getExpenses().filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === y && d.getMonth() === m;
  });
  const totalSpent = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);

  const expenseCategories = {};
  monthlyExpenses.forEach(e => {
    expenseCategories[e.category] = (expenseCategories[e.category] || 0) + e.amount;
  });

  // 3. Incomes this month
  const monthlyIncomes = getIncomes().filter(i => {
    const d = new Date(i.date);
    return d.getFullYear() === y && d.getMonth() === m;
  });
  const totalIncome = monthlyIncomes.reduce((sum, i) => sum + i.amount, 0);

  const incomeSources = {};
  monthlyIncomes.forEach(i => {
    incomeSources[i.source] = (incomeSources[i.source] || 0) + i.amount;
  });

  const netSavings = totalIncome - totalSpent;
  const budget = getBudget();
  const budgetRemaining = budget - totalSpent;
  const budgetUsedPct = budget > 0 ? Math.round((totalSpent / budget) * 100) : 0;

  // 4. Study Sessions this month
  const monthlyStudy = getStudySessions().filter(s => {
    const d = new Date(s.date);
    return d.getFullYear() === y && d.getMonth() === m;
  });
  const totalStudyMinutes = monthlyStudy.reduce((sum, s) => sum + s.duration, 0);
  const totalStudyHours = (totalStudyMinutes / 60).toFixed(1);

  const studySubjects = {};
  monthlyStudy.forEach(s => {
    studySubjects[s.subject] = (studySubjects[s.subject] || 0) + s.duration;
  });

  // 5. Daily Habits Routine
  const routine = getRoutine();
  const routineChecks = getRoutineChecks();
  let daysEvaluated = 0;
  let totalHabitChecks = 0;
  Object.keys(routineChecks).forEach(dateStr => {
    const d = new Date(dateStr);
    if (d.getFullYear() === y && d.getMonth() === m) {
      daysEvaluated++;
      const checks = routineChecks[dateStr] || {};
      totalHabitChecks += Object.values(checks).filter(Boolean).length;
    }
  });
  const possibleHabitChecks = daysEvaluated * (routine.length || 1);
  const habitCompletionRate = possibleHabitChecks > 0 ? Math.round((totalHabitChecks / possibleHabitChecks) * 100) : 0;

  // 6. Friends Lending & Debt
  const udharSummary = getUdharSummary();

  // 7. Goals status
  const goals = getGoals();
  const activeGoals = goals.filter(g => getGoalProgress(g) < 100);
  const completedGoals = goals.filter(g => getGoalProgress(g) === 100);

  return {
    monthLabel,
    year: y,
    month: m,
    generatedAt: new Date().toLocaleString(),
    user,
    finance: {
      totalIncome,
      totalSpent,
      netSavings,
      budget,
      budgetRemaining,
      budgetUsedPct,
      incomeSources,
      expenseCategories,
      incomeCount: monthlyIncomes.length,
      expenseCount: monthlyExpenses.length
    },
    study: {
      totalMinutes: totalStudyMinutes,
      totalHours: totalStudyHours,
      sessionCount: monthlyStudy.length,
      subjects: studySubjects
    },
    habits: {
      totalRoutines: routine.length,
      daysTracked: daysEvaluated,
      completionRate: habitCompletionRate,
      streak: getStreak()
    },
    lending: udharSummary,
    goals: {
      total: goals.length,
      active: activeGoals.length,
      completed: completedGoals.length
    }
  };
}


// ========== CLASS ATTENDANCE TRACKER ==========

// DEFAULT_ATTENDANCE_SUBJECTS defined at top

function getAttendanceSubjects() {
  return loadData(STORAGE_KEYS.attendance, isDemoUser() ? DEFAULT_ATTENDANCE_SUBJECTS : []);
}

function saveAttendanceSubjects(subjects) {
  saveData(STORAGE_KEYS.attendance, subjects);
}

function getAttendanceLogs() {
  return loadData(STORAGE_KEYS.attendanceLogs, []);
}

function saveAttendanceLogs(logs) {
  saveData(STORAGE_KEYS.attendanceLogs, logs);
}

function calculateBunkStatus(attended, total, minReq) {
  minReq = minReq || 75;
  if (!total || total === 0) {
    return { pct: 100, safe: true, canBunk: 0, mustAttend: 0, status: 'safe', message: 'No classes conducted yet.' };
  }
  const pct = Math.round((attended / total) * 100);
  const targetFrac = minReq / 100;

  if (pct >= minReq) {
    const canBunk = Math.floor((attended / targetFrac) - total);
    return {
      pct,
      safe: true,
      canBunk: Math.max(0, canBunk),
      status: canBunk > 0 ? 'safe' : 'borderline',
      message: canBunk > 0 
        ? `You can safely bunk ${canBunk} more class${canBunk > 1 ? 'es' : ''} and stay >= ${minReq}%.`
        : `On track (${pct}%), but bunking the next class will drop you below ${minReq}%!`
    };
  } else {
    const mustAttend = Math.ceil(((targetFrac * total) - attended) / (1 - targetFrac));
    return {
      pct,
      safe: false,
      mustAttend: Math.max(1, mustAttend),
      status: 'danger',
      message: `Shortage (${pct}%)! You must attend the next ${mustAttend} consecutive class${mustAttend > 1 ? 'es' : ''} to reach ${minReq}%.`
    };
  }
}

function getAttendanceSummary() {
  const subjects = getAttendanceSubjects();
  let totalAttended = 0;
  let totalClasses = 0;
  let safeCount = 0;
  let warningCount = 0;
  let dangerCount = 0;

  subjects.forEach(s => {
    totalAttended += (s.attended || 0);
    totalClasses += (s.total || 0);
    const b = calculateBunkStatus(s.attended, s.total, s.minRequiredPct);
    if (b.pct >= s.minRequiredPct) safeCount++;
    else if (b.pct >= (s.minRequiredPct - 10)) warningCount++;
    else dangerCount++;
  });

  const overallPct = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 100;

  return {
    totalSubjects: subjects.length,
    totalAttended,
    totalClasses,
    totalAbsent: totalClasses - totalAttended,
    overallPct,
    safeCount,
    warningCount,
    dangerCount
  };
}

function markClassAttendance(subjectId, status) {
  const subjects = getAttendanceSubjects();
  const sub = subjects.find(s => s.id === subjectId);
  if (!sub) return null;

  if (status === 'present') {
    sub.attended = (sub.attended || 0) + 1;
    sub.total = (sub.total || 0) + 1;
  } else if (status === 'absent') {
    sub.total = (sub.total || 0) + 1;
  } else if (status === 'cancelled') {
    // Cancelled class does not affect attendance percentage
  } else if (status === 'undo') {
    if (sub.total > 0) {
      const logs = getAttendanceLogs();
      const lastIndex = logs.findIndex(l => l.subjectId === subjectId);
      if (lastIndex !== -1) {
        const lastLog = logs[lastIndex];
        if (lastLog.status === 'present' && sub.attended > 0) {
          sub.attended--;
          sub.total--;
        } else if (lastLog.status === 'absent') {
          sub.total--;
        }
        logs.splice(lastIndex, 1);
        saveAttendanceLogs(logs);
      } else {
        if (sub.attended > 0) sub.attended--;
        sub.total--;
      }
    }
  }

  if (status !== 'undo') {
    const logs = getAttendanceLogs();
    logs.unshift({
      id: uid(),
      subjectId: sub.id,
      subjectName: sub.name,
      code: sub.code,
      status: status,
      date: new Date().toISOString(),
      timestamp: Date.now()
    });
    saveAttendanceLogs(logs.slice(0, 50));
  }

  saveAttendanceSubjects(subjects);
  return sub;
}

function addAttendanceSubject(name, code, teacher, minRequiredPct, attended, total) {
  const subjects = getAttendanceSubjects();
  const newSub = {
    id: uid(),
    name: name.trim(),
    code: (code || '').trim().toUpperCase(),
    teacher: (teacher || '').trim(),
    minRequiredPct: parseInt(minRequiredPct) || 75,
    attended: Math.max(0, parseInt(attended) || 0),
    total: Math.max(0, parseInt(total) || 0),
    history: []
  };
  subjects.push(newSub);
  saveAttendanceSubjects(subjects);
  return newSub;
}

function deleteAttendanceSubject(id) {
  let subjects = getAttendanceSubjects();
  subjects = subjects.filter(s => s.id !== id);
  saveAttendanceSubjects(subjects);
}


// ========== ACADEMIC GRADES & SGPA / CGPA CALCULATOR ==========
// GRADE_POINTS & DEFAULT_GRADE_DATA defined at top

function getGradeData() {
  return loadData(STORAGE_KEYS.grades, isDemoUser() ? DEFAULT_GRADE_DATA : { activeSemester: 'Semester 1', targetCGPA: 8.5, pastSemesters: [], currentCourses: [] });
}

function saveGradeData(data) {
  saveData(STORAGE_KEYS.grades, data);
}

function calculateSGPA(courses) {
  if (!courses || courses.length === 0) return 0;
  let totalCredits = 0;
  let weightedPoints = 0;
  courses.forEach(c => {
    const credit = parseFloat(c.credits) || 0;
    const pt = GRADE_POINTS[c.grade] !== undefined ? GRADE_POINTS[c.grade] : (parseFloat(c.gradePoint) || 0);
    totalCredits += credit;
    weightedPoints += credit * pt;
  });
  if (totalCredits === 0) return 0;
  return parseFloat((weightedPoints / totalCredits).toFixed(2));
}

function calculateCGPA(pastSemesters, currentSGPA, currentCredits) {
  let totalCredits = 0;
  let totalWeighted = 0;
  (pastSemesters || []).forEach(s => {
    const cred = parseFloat(s.totalCredits) || 0;
    const sgpa = parseFloat(s.sgpa) || 0;
    totalCredits += cred;
    totalWeighted += cred * sgpa;
  });
  if (currentSGPA > 0 && currentCredits > 0) {
    totalCredits += currentCredits;
    totalWeighted += currentCredits * currentSGPA;
  }
  if (totalCredits === 0) return 0;
  return parseFloat((totalWeighted / totalCredits).toFixed(2));
}

function addGradeCourse(code, name, credits, grade) {
  const data = getGradeData();
  const newCourse = {
    id: uid(),
    code: (code || '').trim().toUpperCase(),
    name: (name || 'Course').trim(),
    credits: Math.max(1, parseInt(credits) || 3),
    grade: grade || 'A'
  };
  data.currentCourses = data.currentCourses || [];
  data.currentCourses.push(newCourse);
  saveGradeData(data);
  return newCourse;
}

function updateGradeCourse(id, updates) {
  const data = getGradeData();
  data.currentCourses = (data.currentCourses || []).map(c => {
    if (c.id === id) {
      return { ...c, ...updates };
    }
    return c;
  });
  saveGradeData(data);
}

function deleteGradeCourse(id) {
  const data = getGradeData();
  data.currentCourses = (data.currentCourses || []).filter(c => c.id !== id);
  saveGradeData(data);
}

function addPastSemester(name, sgpa, credits) {
  const data = getGradeData();
  const newSem = {
    id: uid(),
    name: (name || 'Semester').trim(),
    sgpa: Math.min(10, Math.max(0, parseFloat(sgpa) || 0)),
    totalCredits: Math.max(1, parseInt(credits) || 20)
  };
  data.pastSemesters = data.pastSemesters || [];
  data.pastSemesters.push(newSem);
  saveGradeData(data);
  return newSem;
}

function deletePastSemester(id) {
  const data = getGradeData();
  data.pastSemesters = (data.pastSemesters || []).filter(s => s.id !== id);
  saveGradeData(data);
}


// ========== FULL DATA BACKUP & RESTORE ENGINE ==========
function exportFullDataJSON() {
  const backup = {
    app: 'LifeFlow Tracker',
    schemaVersion: '2.5.0',
    exportedAt: new Date().toISOString(),
    user: getCurrentUser() || { name: 'Student', email: 'student@lifeflow.app' },
    data: {
      routine: getRoutine(),
      routineChecks: getRoutineChecks(),
      streak: getStreak(),
      studySessions: getStudySessions(),
      studyRoutine: getStudyRoutine(),
      studyRoutineChecks: getStudyRoutineChecks(),
      expenses: getExpenses(),
      incomes: getIncomes(),
      budget: getBudget(),
      goals: getGoals(),
      udhar: getUdharRecords(),
      quickNotes: getQuickNotes(),
      attendance: getAttendanceSubjects(),
      attendanceLogs: getAttendanceLogs(),
      grades: getGradeData(),
      achievements: loadData(STORAGE_KEYS.achievements, []),
      theme: getTheme()
    }
  };

  // Record backup history
  const history = loadData(STORAGE_KEYS.backupHistory, []);
  history.unshift({
    timestamp: backup.exportedAt,
    itemCount: Object.keys(backup.data).reduce((acc, k) => acc + (Array.isArray(backup.data[k]) ? backup.data[k].length : 1), 0)
  });
  saveData(STORAGE_KEYS.backupHistory, history.slice(0, 10));

  // Trigger achievement for backup
  unlockAchievement('badge_data_vault');

  return backup;
}

function importFullDataJSON(jsonString, mode = 'merge') {
  let parsed;
  try {
    parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
  } catch (err) {
    return { success: false, error: 'Invalid JSON format: ' + err.message };
  }

  if (!parsed || (!parsed.data && !parsed.routine)) {
    return { success: false, error: 'Unrecognized backup format. Must be a valid LifeFlow JSON backup.' };
  }

  const d = parsed.data || parsed;

  if (mode === 'overwrite') {
    if (d.routine) saveData(STORAGE_KEYS.routine, d.routine);
    if (d.routineChecks) saveData(STORAGE_KEYS.routineChecks, d.routineChecks);
    if (d.streak) saveData(STORAGE_KEYS.streak, d.streak);
    if (d.studySessions) saveData(STORAGE_KEYS.studySessions, d.studySessions);
    if (d.studyRoutine) saveData(STORAGE_KEYS.studyRoutine, d.studyRoutine);
    if (d.studyRoutineChecks) saveData(STORAGE_KEYS.studyRoutineChecks, d.studyRoutineChecks);
    if (d.expenses) saveData(STORAGE_KEYS.expenses, d.expenses);
    if (d.incomes) saveData(STORAGE_KEYS.incomes, d.incomes);
    if (d.budget !== undefined) saveData(STORAGE_KEYS.budget, d.budget);
    if (d.goals) saveData(STORAGE_KEYS.goals, d.goals);
    if (d.udhar) saveData(STORAGE_KEYS.udhar, d.udhar);
    if (d.quickNotes !== undefined) saveData(STORAGE_KEYS.quickNotes, d.quickNotes);
    if (d.attendance) saveData(STORAGE_KEYS.attendance, d.attendance);
    if (d.attendanceLogs) saveData(STORAGE_KEYS.attendanceLogs, d.attendanceLogs);
    if (d.grades) saveData(STORAGE_KEYS.grades, d.grades);
    if (d.achievements) saveData(STORAGE_KEYS.achievements, d.achievements);
  } else {
    // MERGE mode: preserve existing, add non-duplicate records by ID
    const mergeArray = (current, incoming) => {
      const ids = new Set((current || []).map(x => x.id || JSON.stringify(x)));
      const merged = [...(current || [])];
      (incoming || []).forEach(item => {
        const key = item.id || JSON.stringify(item);
        if (!ids.has(key)) {
          merged.push(item);
          ids.add(key);
        }
      });
      return merged;
    };

    if (d.studySessions) saveData(STORAGE_KEYS.studySessions, mergeArray(getStudySessions(), d.studySessions));
    if (d.expenses) saveData(STORAGE_KEYS.expenses, mergeArray(getExpenses(), d.expenses));
    if (d.incomes) saveData(STORAGE_KEYS.incomes, mergeArray(getIncomes(), d.incomes));
    if (d.goals) saveData(STORAGE_KEYS.goals, mergeArray(getGoals(), d.goals));
    if (d.udhar) saveData(STORAGE_KEYS.udhar, mergeArray(getUdharRecords(), d.udhar));
    if (d.attendance) saveData(STORAGE_KEYS.attendance, mergeArray(getAttendanceSubjects(), d.attendance));
    if (d.attendanceLogs) saveData(STORAGE_KEYS.attendanceLogs, mergeArray(getAttendanceLogs(), d.attendanceLogs));
    if (d.grades && d.grades.currentCourses) {
      const g = getGradeData();
      g.currentCourses = mergeArray(g.currentCourses, d.grades.currentCourses);
      if (d.grades.pastSemesters) g.pastSemesters = mergeArray(g.pastSemesters, d.grades.pastSemesters);
      saveGradeData(g);
    }
  }

  return {
    success: true,
    mode,
    version: parsed.schemaVersion || '1.0',
    exportedAt: parsed.exportedAt || 'Unknown'
  };
}

function resetAllAppData() {
  saveData(STORAGE_KEYS.routine, DEFAULT_ROUTINE);
  saveData(STORAGE_KEYS.routineChecks, {});
  saveData(STORAGE_KEYS.streak, { current: 0, best: 0, lastCheckDate: '' });
  saveData(STORAGE_KEYS.studySessions, DEFAULT_STUDY_SESSIONS);
  saveData(STORAGE_KEYS.expenses, DEFAULT_EXPENSES);
  saveData(STORAGE_KEYS.incomes, DEFAULT_INCOMES);
  saveData(STORAGE_KEYS.goals, DEFAULT_GOALS);
  saveData(STORAGE_KEYS.budget, 15000);
  saveData(STORAGE_KEYS.udhar, DEFAULT_UDHAR);
  saveData(STORAGE_KEYS.quickNotes, DEFAULT_SCRATCHPAD_NOTE);
  saveData(STORAGE_KEYS.attendance, DEFAULT_ATTENDANCE_SUBJECTS);
  saveData(STORAGE_KEYS.attendanceLogs, []);
  saveData(STORAGE_KEYS.grades, DEFAULT_GRADE_DATA);
  saveData(STORAGE_KEYS.achievements, []);
}

// ========== WEEKLY ANALYTICS & GAMIFIED ACHIEVEMENTS ==========
function getStartOfWeek(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getWeeklyPerformanceData() {
  const startOfWeek = getStartOfWeek();
  const now = new Date();
  const studySessions = getStudySessions();
  const expenses = getExpenses();
  const attendance = getAttendanceSummary();
  const budget = getBudget();
  const streak = getStreak();

  // 1. Weekly study hours
  const weeklyStudySessions = studySessions.filter(s => {
    const sDate = new Date(s.date || s.timestamp);
    return sDate >= startOfWeek && sDate <= now;
  });
  const weeklyStudyMinutes = weeklyStudySessions.reduce((acc, s) => acc + (parseInt(s.duration) || 0), 0);
  const weeklyStudyHours = parseFloat((weeklyStudyMinutes / 60).toFixed(1));
  const weeklyStudyTargetHours = 12.0;

  // 2. Weekly spending
  const weeklyExpenses = expenses.filter(e => {
    const eDate = new Date(e.date);
    return eDate >= startOfWeek && eDate <= now;
  });
  const weeklySpent = weeklyExpenses.reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0);
  const weeklyBudgetLimit = parseFloat((budget / 4).toFixed(0));

  // 3. Weekly Habit Score
  const checks = getRoutineChecks();
  const todayKey = todayStr();
  const routine = getRoutine();
  const totalRoutineItems = routine.length || 1;
  const todayCompletedCount = (checks[todayKey] || []).length;
  const habitCompletionRate = Math.min(100, Math.round((todayCompletedCount / totalRoutineItems) * 100));

  // 4. Overall Weekly Composite Score (out of 100)
  // Study 35%, Attendance 35%, Habits 15%, Budget 15%
  const studyScore = Math.min(100, Math.round(((weeklyStudyHours || 0) / (weeklyStudyTargetHours || 12)) * 100)) || 0;
  const attendanceScore = attendance.overallPct || 0;
  const habitScore = habitCompletionRate || 0;
  const safeBudgetLimit = weeklyBudgetLimit > 0 ? weeklyBudgetLimit : 3750;
  const budgetScore = weeklySpent <= safeBudgetLimit ? 100 : Math.max(0, Math.round((1 - ((weeklySpent - safeBudgetLimit) / safeBudgetLimit)) * 100));

  const compositeScore = Math.round(
    ((studyScore || 0) * 0.35) + 
    ((attendanceScore || 0) * 0.35) + 
    ((habitScore || 0) * 0.15) + 
    ((budgetScore || 0) * 0.15)
  ) || 0;

  let grade = 'A+';
  let badgeColor = '#10b981';
  let message = 'Exceptional performance! You are firing on all cylinders.';
  if (compositeScore < 50) {
    grade = 'D';
    badgeColor = '#ef4444';
    message = 'Critical week: Boost your study hours and attend more classes.';
  } else if (compositeScore < 70) {
    grade = 'C';
    badgeColor = '#f59e0b';
    message = 'Fair progress: Focus on keeping attendance safe and logging study sessions.';
  } else if (compositeScore < 85) {
    grade = 'B+';
    badgeColor = '#6366f1';
    message = 'Solid work! Keep up the momentum to reach top-tier productivity.';
  }

  return {
    startOfWeek: startOfWeek.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    endOfWeek: now.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    weeklyStudyHours,
    weeklyStudyTargetHours,
    weeklyStudySessionsCount: weeklyStudySessions.length,
    weeklySpent,
    weeklyBudgetLimit,
    attendanceRate: attendance.overallPct,
    safeCoursesCount: attendance.safeCount,
    totalCourses: attendance.totalSubjects,
    habitCompletionRate,
    compositeScore,
    grade,
    badgeColor,
    message
  };
}

const BADGE_DEFINITIONS = [
  {
    id: 'badge_attendance_champ',
    title: 'Attendance Champion',
    icon: 'graduation-cap',
    category: 'Academic',
    desc: 'Maintain overall class attendance ≥ 80%',
    check: () => {
      const sum = getAttendanceSummary();
      return { unlocked: sum.overallPct >= 80, progress: sum.overallPct, max: 80, unit: '%' };
    }
  },
  {
    id: 'badge_safe_zone',
    title: 'Safe Zone Master',
    icon: 'shield-check',
    category: 'Academic',
    desc: 'Keep all registered courses in Safe Zone (≥75%)',
    check: () => {
      const sum = getAttendanceSummary();
      const safe = sum.dangerCount === 0 && sum.totalSubjects > 0;
      return { unlocked: safe, progress: sum.safeCount, max: sum.totalSubjects, unit: 'courses' };
    }
  },
  {
    id: 'badge_focus_legend',
    title: 'Focus Legend',
    icon: 'timer',
    category: 'Study',
    desc: 'Log 10+ total Pomodoro study hours',
    check: () => {
      const sessions = getStudySessions();
      const totalMinutes = sessions.reduce((acc, s) => acc + (parseInt(s.duration) || 0), 0);
      const hours = parseFloat((totalMinutes / 60).toFixed(1));
      return { unlocked: hours >= 10, progress: hours, max: 10, unit: 'hrs' };
    }
  },
  {
    id: 'badge_budget_ninja',
    title: 'Budget Ninja',
    icon: 'wallet',
    category: 'Finance',
    desc: 'Keep current monthly spending within budget',
    check: () => {
      const exp = getExpenses();
      const budget = getBudget();
      const now = new Date();
      const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const spent = exp.filter(e => e.date.startsWith(thisMonth)).reduce((acc, e) => acc + parseFloat(e.amount || 0), 0);
      const isUnder = spent <= budget && spent > 0;
      return { unlocked: isUnder, progress: spent, max: budget, unit: '₹' };
    }
  },
  {
    id: 'badge_streak_fire',
    title: 'Habit Streak Master',
    icon: 'zap',
    category: 'Productivity',
    desc: 'Achieve a 5-day consecutive routine streak',
    check: () => {
      const s = getStreak();
      const current = Math.max(s.current || 0, s.best || 0);
      return { unlocked: current >= 5, progress: current, max: 5, unit: 'days' };
    }
  },
  {
    id: 'badge_goal_crusher',
    title: 'Goal Crusher',
    icon: 'target',
    category: 'Productivity',
    desc: 'Complete at least 2 milestone goals',
    check: () => {
      const goals = getGoals();
      const done = goals.filter(g => g.completed).length;
      return { unlocked: done >= 2, progress: done, max: 2, unit: 'goals' };
    }
  },
  {
    id: 'badge_debt_free',
    title: 'Settlement Pro',
    icon: 'hand-coins',
    category: 'Finance',
    desc: 'Zero unsettled debts with friends',
    check: () => {
      const udhar = getUdharRecords();
      const unsettled = udhar.filter(u => u.status !== 'settled').length;
      return { unlocked: unsettled === 0 && udhar.length > 0, progress: udhar.length - unsettled, max: Math.max(1, udhar.length), unit: 'settled' };
    }
  },
  {
    id: 'badge_data_vault',
    title: 'Data Vault Master',
    icon: 'hard-drive',
    category: 'Safety',
    desc: 'Download your full LifeFlow JSON data backup',
    check: () => {
      const history = loadData(STORAGE_KEYS.backupHistory, []);
      const unlocked = history.length > 0;
      return { unlocked, progress: history.length > 0 ? 1 : 0, max: 1, unit: 'backup' };
    }
  }
];

function unlockAchievement(id) {
  const current = loadData(STORAGE_KEYS.achievements, []);
  if (!current.includes(id)) {
    current.push(id);
    saveData(STORAGE_KEYS.achievements, current);
  }
}

function evaluateAchievements() {
  const unlockedIds = new Set(loadData(STORAGE_KEYS.achievements, []));

  return BADGE_DEFINITIONS.map(badge => {
    const res = badge.check();
    const isUnlocked = unlockedIds.has(badge.id) || res.unlocked;
    if (res.unlocked && !unlockedIds.has(badge.id)) {
      unlockAchievement(badge.id);
    }
    const pct = Math.min(100, Math.max(0, Math.round((res.progress / res.max) * 100)));
    return {
      ...badge,
      unlocked: isUnlocked,
      progress: res.progress,
      max: res.max,
      unit: res.unit,
      progressPct: pct
    };
  });
}
