// Dummy data for testing QuestHive Mobile without a live backend.
// Flip USE_DUMMY_DATA to false in api.js once backend testing is needed.

export const MOCK_USER = {
  id: 'u1', _id: 'u1', fullName: 'Pallavi Sable', email: 'pallavi@test.com',
  username: 'pallavi_s', usernameChanged: false, coins: 120,
  role: 'FAMILY_ADMIN', avatarColor: '#f5c518',
};

/* ---- XP / Frame system (Settings page) ---- */
const FRAME_THRESHOLDS = [
  { min: 20, frame: 'LEGENDARY', title: 'Elite Bee' },
  { min: 15, frame: 'CHAMPION',  title: 'Quest Champion' },
  { min: 10, frame: 'ELITE',     title: 'Dedicated Bee' },
  { min: 6,  frame: 'VETERAN',   title: 'Steady Worker' },
  { min: 3,  frame: 'DEDICATED', title: 'Task Starter' },
  { min: 1,  frame: 'NONE',      title: 'Newcomer' },
];
function frameForLevel(level) {
  return FRAME_THRESHOLDS.find((f) => level >= f.min) || FRAME_THRESHOLDS[FRAME_THRESHOLDS.length - 1];
}
export function buildXpForUser(userId) {
  const level = XP_BY_USER[userId] || 1;
  const totalXp = level * 120;
  const xpForNextLevel = 150;
  const xpIntoCurrentLevel = totalXp % xpForNextLevel;
  const progressPercent = Math.round((xpIntoCurrentLevel / xpForNextLevel) * 100);
  const { frame, title } = frameForLevel(level);
  return { level, totalXp, xpIntoCurrentLevel, xpForNextLevel, progressPercent, frame, title };
}

/* ---- Profile / account mutation mocks ---- */
export function mockUpdateProfile(userId, payload) {
  const u = MOCK_USERS.find((x) => x.id === userId) || MOCK_USER;
  if (payload.fullName) u.fullName = payload.fullName;
  if (payload.newUsername) { u.username = payload.newUsername; u.usernameChanged = true; }
  return { user: u };
}
export function mockDeleteAccount() {
  return { message: 'Account deleted (mock)' };
}
let _pendingEmail = null;
export function mockRequestEmailChange(newEmail) {
  _pendingEmail = newEmail;
  return { message: 'OTP sent (mock)' };
}
export function mockConfirmEmailChange(otp, userId) {
  const u = MOCK_USERS.find((x) => x.id === userId) || MOCK_USER;
  if (_pendingEmail) { u.email = _pendingEmail; _pendingEmail = null; }
  return { user: u };
}

export const MOCK_USERS = [
  { id: 'u1', fullName: 'Pallavi Sable', avatarColor: '#f5c518', email: 'pallavi@test.com', role: 'FAMILY_ADMIN', status: 'ACTIVE' },
  { id: 'u2', fullName: 'Aarav Sharma', avatarColor: '#3b82f6', email: 'aarav@test.com', role: 'MEMBER', status: 'ACTIVE' },
  { id: 'u3', fullName: 'Meera Iyer', avatarColor: '#a855f7', email: 'meera@test.com', role: 'MEMBER', status: 'ACTIVE' },
  { id: 'u4', fullName: 'Rohan Verma', avatarColor: '#22c55e', email: 'rohan@test.com', role: 'MEMBER', status: 'DEACTIVATED' },
];

export const XP_BY_USER = { u1: 12, u2: 5, u3: 18, u4: 2 };

export const MOCK_GROUPS = [
  {
    id: 'g1', name: 'Sable Family', description: 'Household chores & weekly tasks',
    memberIds: ['u1', 'u2', 'u3'], taskIds: ['t1', 't2', 't3'],
    template: 'FAMILY', adminId: 'u1', deactivatedMemberIds: [],
  },
  {
    id: 'g2', name: 'Study Squad', description: 'SPPU final year exam prep group',
    memberIds: ['u1', 'u4'], taskIds: ['t4'],
    template: 'STUDY', adminId: 'u1', deactivatedMemberIds: [],
  },
];

export const MOCK_TASKS_BY_GROUP = {
  g1: [
    { id: 't1', title: 'Grocery shopping', description: 'Buy weekly groceries from the market', status: 'PENDING', priority: 'HIGH', category: 'HOME', assignedTo: 'u2', assignedToName: 'Aarav Sharma', dueDate: '2026-07-12', coins: 20, groupId: 'g1' },
    { id: 't2', title: 'Clean living room', description: 'Vacuum and dust the living room', status: 'COMPLETED', priority: 'MEDIUM', category: 'HOME', assignedTo: 'u3', assignedToName: 'Meera Iyer', dueDate: '2026-07-09', coins: 15, groupId: 'g1', pendingPeerReview: true, bonusCoinsAmount: 25, peerReviewDeadline: '2026-07-11T18:00:00Z' },
    { id: 't3', title: 'Pay electricity bill', description: 'Due before the 15th', status: 'IN_PROGRESS', priority: 'HIGH', category: 'FINANCE', assignedTo: 'u1', assignedToName: 'Pallavi Sable', dueDate: '2026-07-14', coins: 10, groupId: 'g1' },
  ],
  g2: [
    { id: 't4', title: 'Revise Data Mining unit 3', description: 'Similarity measures + clustering', status: 'PENDING', priority: 'HIGH', category: 'STUDY', assignedTo: 'u1', assignedToName: 'Pallavi Sable', dueDate: '2026-07-15', coins: 25, groupId: 'g2' },
  ],
};

export const MOCK_MY_TASKS = [...MOCK_TASKS_BY_GROUP.g1, ...MOCK_TASKS_BY_GROUP.g2];

export const MOCK_PERSONAL_TASKS = [];

let _personalTaskIdCounter = 500;
export function mockCreatePersonalTask(data) {
  const task = {
    id: 'pt' + (_personalTaskIdCounter++),
    title: data.title,
    description: data.description || '',
    status: 'PENDING',
    priority: data.priority || 'MEDIUM',
    category: data.category || 'PERSONAL',
    deadline: data.deadline || null,
    isPersonal: true,
    subtasks: [], comments: [], attachments: [],
  };
  MOCK_PERSONAL_TASKS.unshift(task);
  return task;
}

export const MOCK_ACTIVITIES_BY_GROUP = {
  g1: [
    { type: 'TASK_COMPLETED', actorName: 'Meera Iyer', targetName: 'Clean living room', detail: 'Marked task as completed', coins: 15, createdAt: '2026-07-09T14:30:00Z' },
    { type: 'TASK_ASSIGNED', actorName: 'Pallavi Sable', targetName: 'Aarav Sharma', detail: 'Assigned "Grocery shopping"', coins: 0, createdAt: '2026-07-08T10:00:00Z' },
    { type: 'MEMBER_JOINED', actorName: 'Meera Iyer', targetName: '', detail: 'Joined the group', coins: 0, createdAt: '2026-07-01T09:00:00Z' },
  ],
  g2: [
    { type: 'TASK_ASSIGNED', actorName: 'Pallavi Sable', targetName: 'Pallavi Sable', detail: 'Assigned "Revise Data Mining unit 3"', coins: 0, createdAt: '2026-07-07T11:00:00Z' },
  ],
};

export const MOCK_REDEEM_HISTORY_BY_GROUP = {
  g1: [
    { description: 'Movie night pick', earnedAt: '2026-07-05T18:00:00Z', coinsEarned: 30 },
  ],
  g2: [],
};

export const MOCK_LEADERBOARD_RAW_BY_GROUP = {
  g1: { u3: 145, u1: 120, u2: 80 },
  g2: { u1: 60, u4: 25 },
};
// Flat array form (used by analytics "coins" lookups)
export const MOCK_LEADERBOARD_BY_GROUP = {
  g1: [
    { userId: 'u3', fullName: 'Meera Iyer', coins: 145, rank: 1 },
    { userId: 'u1', fullName: 'Pallavi Sable', coins: 120, rank: 2 },
    { userId: 'u2', fullName: 'Aarav Sharma', coins: 80, rank: 3 },
  ],
  g2: [
    { userId: 'u1', fullName: 'Pallavi Sable', coins: 60, rank: 1 },
    { userId: 'u4', fullName: 'Rohan Verma', coins: 25, rank: 2 },
  ],
};

export const MOCK_CHAT_BY_GROUP = {
  g1: [
    { id: 'c1', senderId: 'u2', senderName: 'Aarav Sharma', text: 'Groceries done, receipts in the drawer', createdAt: '2026-07-09T15:00:00Z' },
    { id: 'c2', senderId: 'u1', senderName: 'Pallavi Sable', text: 'Thanks! Marking it complete', createdAt: '2026-07-09T15:05:00Z' },
  ],
  g2: [],
};

export const MOCK_FAIRNESS_BY_GROUP = {
  g1: {
    fairnessStatus: 'SLIGHTLY_UNEVEN',
    suggestion: 'Aarav and Meera could take on a couple more tasks to balance things out.',
    memberNames: { u1: 'Pallavi Sable', u2: 'Aarav Sharma', u3: 'Meera Iyer' },
    taskCountPerMember: { u1: 5, u2: 4, u3: 3 },
    coinsPerMember: { u1: 120, u2: 95, u3: 70 },
  },
  g2: {
    fairnessStatus: 'FAIR',
    suggestion: 'Task distribution looks balanced.',
    memberNames: {},
    taskCountPerMember: {},
    coinsPerMember: {},
  },
};
export const MOCK_CONCENTRATION_BY_GROUP = {
  g1: { alerts: ['Pallavi Sable has completed 40% of tasks in the last 14 days — consider redistributing.'] },
  g2: { alerts: [] },
};

export const MOCK_REDEEM_OPTIONS_BY_GROUP = {
  g1: [
    { id: 'r1', title: 'Movie Night Pick', coinsCost: 30, groupId: 'g1' },
    { id: 'r2', title: 'Skip a Chore', coinsCost: 50, groupId: 'g1' },
  ],
  g2: [],
};

function getUser(id) {
  return MOCK_USERS.find((u) => u.id === id);
}

export function buildGroupDetail(groupId) {
  const group = MOCK_GROUPS.find((g) => g.id === groupId);
  if (!group) return null;
  const members = group.memberIds.map((id) => getUser(id)).filter(Boolean);
  return { ...group, members };
}

export function buildMemberAnalytics(groupId) {
  const group = MOCK_GROUPS.find((g) => g.id === groupId);
  if (!group) return [];
  const tasks = MOCK_TASKS_BY_GROUP[groupId] || [];
  return group.memberIds.map((id) => {
    const user = getUser(id);
    const assigned = tasks.filter((t) => t.assignedTo === id);
    const completed = assigned.filter((t) => t.status === 'COMPLETED');
    const denied = assigned.filter((t) => t.status === 'DENIED');
    const pending = assigned.filter((t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS');
    const rate = assigned.length > 0 ? Math.round((completed.length / assigned.length) * 100) : 0;
    return {
      userId: id, fullName: user?.fullName, avatarColor: user?.avatarColor,
      level: XP_BY_USER[id] || 1, titleBadge: (XP_BY_USER[id] || 1) >= 10 ? 'Dedicated Bee' : 'Newcomer',
      tasksAssigned: assigned.length, tasksCompleted: completed.length,
      tasksDenied: denied.length, tasksPending: pending.length,
      coins: (MOCK_LEADERBOARD_BY_GROUP[groupId] || []).find((l) => l.userId === id)?.coins || 0,
      totalXp: (XP_BY_USER[id] || 1) * 120, streak: Math.floor(Math.random() * 6),
      completionRatePercent: rate,
    };
  });
}

/* ---- Task mutation helpers (in-memory, for dummy-data testing) ---- */

export const MOCK_SUGGESTIONS_BY_GROUP = {
  g1: [
    { title: 'Take out trash', reason: 'Recurring weekly pattern detected', category: 'HOME', priority: 'LOW' },
    { title: 'Restock cleaning supplies', reason: 'Low stock flagged in recent activity', category: 'HOME', priority: 'MEDIUM' },
  ],
  g2: [],
};

let _taskIdCounter = 100;
const _REVIEW_STATUS = {};

function _findTask(taskId) {
  for (const gid in MOCK_TASKS_BY_GROUP) {
    const t = MOCK_TASKS_BY_GROUP[gid].find((x) => x.id === taskId);
    if (t) return t;
  }
  return null;
}

export function mockCreateTask(groupId, data) {
  const id = 't' + (_taskIdCounter++);
  const assignee = data.assignedToId ? getUser(data.assignedToId) : null;
  const task = {
    id, groupId,
    title: data.title, description: data.description || '',
    status: 'PENDING', priority: data.priority || 'MEDIUM', category: data.category || 'WORK',
    assignedToId: data.assignedToId || null, assignedTo: data.assignedToId || null,
    assignedToName: assignee?.fullName || null, assignedById: 'u1',
    deadline: data.deadline || null,
    coinsReward: data.bonusCoins ? Number(data.bonusCoins) : 10,
    bonusCoins: data.bonusCoins ? Number(data.bonusCoins) : 0,
    subtasks: [], comments: [], pledgeMessage: '', attachments: [],
  };
  if (!MOCK_TASKS_BY_GROUP[groupId]) MOCK_TASKS_BY_GROUP[groupId] = [];
  MOCK_TASKS_BY_GROUP[groupId].unshift(task);
  MOCK_MY_TASKS.unshift(task);
  return task;
}

export function mockUpdateTaskStatus(taskId, status) { const t = _findTask(taskId); if (t) t.status = status; return t; }
export function mockEditTask(taskId, data) { const t = _findTask(taskId); if (t) Object.assign(t, data); return t; }
export function mockDeleteTask(taskId) {
  for (const gid in MOCK_TASKS_BY_GROUP) MOCK_TASKS_BY_GROUP[gid] = MOCK_TASKS_BY_GROUP[gid].filter((x) => x.id !== taskId);
}
export function mockClaimTask(taskId) { const t = _findTask(taskId); if (t) { t.assignedToId = 'u1'; t.assignedToName = 'Pallavi Sable'; } return t; }
export function mockDenyTask(taskId) { const t = _findTask(taskId); if (t) { t.status = 'PENDING'; t.assignedToId = null; } return t; }
export function mockUpdateTaskPriority(taskId, priority) { const t = _findTask(taskId); if (t) t.priority = priority; return t; }

export function mockAddComment(taskId, content) {
  const t = _findTask(taskId); if (!t) return { comments: [] };
  if (!t.comments) t.comments = [];
  t.comments.push({ userId: 'u1', authorName: 'Pallavi Sable', content, createdAt: new Date().toISOString() });
  return t;
}
export function mockAddSubtask(taskId, title) {
  const t = _findTask(taskId); if (!t) return { subtasks: [] };
  if (!t.subtasks) t.subtasks = [];
  t.subtasks.push({ id: 'st' + Date.now(), title, completed: false });
  return t;
}
export function mockCompleteSubtask(taskId, subtaskId) {
  const t = _findTask(taskId); if (!t) return { subtasks: [] };
  const s = (t.subtasks || []).find((x) => x.id === subtaskId);
  if (s) s.completed = true;
  return t;
}
export function mockAddPledge(taskId, message) { const t = _findTask(taskId); if (t) t.pledgeMessage = message; return t; }
export function mockAddAttachment(taskId, url) {
  const t = _findTask(taskId); if (!t) return t;
  if (!t.attachments) t.attachments = [];
  t.attachments.push(url);
  return t;
}
export function mockRemoveAttachment(taskId, url) {
  const t = _findTask(taskId); if (!t) return t;
  t.attachments = (t.attachments || []).filter((u) => u !== url);
  return t;
}
export function mockRequestReview(taskId) {
  _REVIEW_STATUS[taskId] = { status: 'PENDING', flagCount: _REVIEW_STATUS[taskId]?.flagCount || 0 };
  return _REVIEW_STATUS[taskId];
}
export function mockFlagBonus(taskId) {
  const cur = _REVIEW_STATUS[taskId] || { status: 'FLAGGED', flagCount: 0 };
  cur.status = 'FLAGGED'; cur.flagCount = (cur.flagCount || 0) + 1;
  _REVIEW_STATUS[taskId] = cur;
  return cur;
}
export function mockGetReviewStatus(taskId) { return _REVIEW_STATUS[taskId] || null; }

/* ---- Chat mutation helper ---- */
export function mockSendChatMessage(groupId, content) {
  if (!MOCK_CHAT_BY_GROUP[groupId]) MOCK_CHAT_BY_GROUP[groupId] = [];
  const msg = {
    id: 'c' + Date.now(), userId: 'u1', authorName: 'Pallavi Sable',
    content, sentAt: new Date().toISOString(),
  };
  MOCK_CHAT_BY_GROUP[groupId].push(msg);
  return msg;
}

/* ---- Superadmin: Admin requests ---- */
export const MOCK_ADMIN_REQUESTS = [
  { id: 'req1', fullName: 'Rohan Verma', email: 'rohan@test.com', reason: 'Want to manage tasks for my study group.', status: 'PENDING', createdAt: '2026-07-08T10:00:00Z' },
  { id: 'req2', fullName: 'Sneha Kulkarni', email: 'sneha@test.com', reason: 'Setting up a family chore tracker.', status: 'PENDING', createdAt: '2026-07-09T14:30:00Z' },
  { id: 'req3', fullName: 'Aditya Rao', email: 'aditya@test.com', reason: 'Need admin access for hostel group.', status: 'APPROVED', createdAt: '2026-07-05T09:15:00Z' },
];

export function mockApproveRequest(requestId) {
  const req = MOCK_ADMIN_REQUESTS.find((r) => r.id === requestId);
  if (req) req.status = 'APPROVED';
  return req || null;
}
export function mockRejectRequest(requestId, reason = '') {
  const req = MOCK_ADMIN_REQUESTS.find((r) => r.id === requestId);
  if (req) { req.status = 'REJECTED'; req.rejectReason = reason; }
  return req || null;
}

/* ---- Superadmin: Platform user actions ---- */
export function mockDeactivatePlatformUser(userId, reason = '') {
  const u = MOCK_USERS.find((x) => x.id === userId);
  if (u) { u.status = 'DEACTIVATED'; u.deactivateReason = reason; }
  return u || null;
}
export function mockActivatePlatformUser(userId) {
  const u = MOCK_USERS.find((x) => x.id === userId);
  if (u) u.status = 'ACTIVE';
  return u || null;
}
export function mockRemovePlatformUser(userId) {
  const idx = MOCK_USERS.findIndex((x) => x.id === userId);
  if (idx !== -1) MOCK_USERS.splice(idx, 1);
  return { message: 'Removed (mock)' };
}

/* ---- Feedback ---- */
export const MOCK_FEEDBACK = [
  { id: 'fb1', username: 'Aarav Sharma', type: 'BUG', status: 'OPEN', message: 'Chat messages sometimes take a few seconds to appear.', createdAt: '2026-07-09T11:00:00Z' },
  { id: 'fb2', username: 'Meera Iyer', type: 'SUGGESTION', status: 'REVIEWED', message: 'Would love a dark/light theme toggle.', createdAt: '2026-07-07T16:20:00Z' },
];
export function mockUpdateFeedbackStatus(id, status) {
  const fb = MOCK_FEEDBACK.find((f) => f.id === id);
  if (fb) fb.status = status;
  return fb || null;
}
