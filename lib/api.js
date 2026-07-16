import axios from 'axios';
import { getToken } from './token';
import {
  MOCK_USER, MOCK_USERS, MOCK_GROUPS, MOCK_TASKS_BY_GROUP, MOCK_MY_TASKS,
  MOCK_ACTIVITIES_BY_GROUP, MOCK_REDEEM_HISTORY_BY_GROUP, MOCK_LEADERBOARD_BY_GROUP, MOCK_LEADERBOARD_RAW_BY_GROUP,
  MOCK_CHAT_BY_GROUP, mockSendChatMessage, MOCK_FAIRNESS_BY_GROUP, MOCK_CONCENTRATION_BY_GROUP,
  MOCK_ADMIN_REQUESTS, mockApproveRequest, mockRejectRequest,
  mockDeactivatePlatformUser, mockActivatePlatformUser, mockRemovePlatformUser,
  MOCK_FEEDBACK, mockUpdateFeedbackStatus, MOCK_REDEEM_OPTIONS_BY_GROUP,
  buildXpForUser, mockUpdateProfile, mockDeleteAccount, mockRequestEmailChange, mockConfirmEmailChange,
  XP_BY_USER, buildGroupDetail, buildMemberAnalytics,
  MOCK_SUGGESTIONS_BY_GROUP, mockCreateTask, mockUpdateTaskStatus, mockEditTask,
  MOCK_PERSONAL_TASKS, mockCreatePersonalTask,
  mockDeleteTask, mockClaimTask, mockDenyTask, mockUpdateTaskPriority,
  mockAddComment, mockAddSubtask, mockCompleteSubtask, mockAddPledge,
  mockAddAttachment, mockRemoveAttachment, mockRequestReview, mockFlagBonus, mockGetReviewStatus,
} from './mockData';

// 🔧 Set to false once you want to hit the real backend again.
export const USE_DUMMY_DATA = false;

const API = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api',
});

let authFailureHandler = null;
export const setAuthFailureHandler = (fn) => {
  authFailureHandler = fn;
};

API.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && authFailureHandler) {
      authFailureHandler();
    }
    return Promise.reject(error);
  }
);

/* -------- Dummy-data adapter (only active when USE_DUMMY_DATA = true) -------- */
const realAdapter = axios.defaults.adapter;
const delay = (ms = 250) => new Promise((res) => setTimeout(res, ms));
const ok = (data) => ({ data, status: 200, statusText: 'OK', headers: {}, config: {} });
const parseBody = (data) => {
  if (!data) return {};
  if (typeof data === 'string') { try { return JSON.parse(data); } catch { return {}; } }
  return data;
};

const ROUTES = [
  // AUTH
  { m: 'post', re: /^\/auth\/login$/, h: () => ok({ token: 'mock-token', user: MOCK_USER }) },
  { m: 'post', re: /^\/auth\/register$/, h: () => ok({ token: 'mock-token', user: MOCK_USER }) },
  { m: 'post', re: /^\/auth\/verify-email$/, h: () => ok({ token: 'mock-token', user: MOCK_USER }) },
  { m: 'post', re: /^\/auth\/forgot-password$/, h: () => ok({ message: 'OTP sent (mock)' }) },
  { m: 'post', re: /^\/auth\/resend-otp$/, h: () => ok({ message: 'OTP resent (mock)' }) },
  { m: 'post', re: /^\/auth\/reset-password$/, h: () => ok({ message: 'Password reset (mock)' }) },
  { m: 'post', re: /^\/invite\/request-access$/, h: () => ok({ message: 'Request submitted (mock)' }) },
  { m: 'get',  re: /^\/invite\/validate/, h: () => ok({ valid: true, groupName: 'Sable Family' }) },

  // GROUPS
  { m: 'get',  re: /^\/groups\/my$/, h: () => ok(MOCK_GROUPS) },
  { m: 'post', re: /^\/groups\/create$/, h: (_, body) => {
      const newGroup = { id: 'g' + Date.now(), adminId: 'u1', deactivatedMemberIds: [], memberIds: ['u1'], taskIds: [], ...body };
      MOCK_GROUPS.push(newGroup);
      MOCK_TASKS_BY_GROUP[newGroup.id] = [];
      return ok(newGroup);
    } },
  { m: 'get',  re: /^\/groups\/([^/]+)\/detail$/, h: (mArr) => ok(buildGroupDetail(mArr[1])) },
  { m: 'get',  re: /^\/groups\/([^/]+)$/, h: (mArr) => ok(MOCK_GROUPS.find((g) => g.id === mArr[1])) },
  { m: 'get',  re: /^\/groups\/([^/]+)\/activities$/, h: (mArr) => ok(MOCK_ACTIVITIES_BY_GROUP[mArr[1]] || []) },
  { m: 'get',  re: /^\/groups\/([^/]+)\/health$/, h: (mArr) => {
      const tasks = MOCK_TASKS_BY_GROUP[mArr[1]] || [];
      const completed = tasks.filter((t) => t.status === 'COMPLETED').length;
      const pct = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
      return ok({ status: pct >= 70 ? 'HEALTHY' : pct >= 40 ? 'AT_RISK' : 'CRITICAL', healthPercent: pct, completed, total: tasks.length, overdue: 0 });
    } },
  { m: 'post', re: /^\/groups\/([^/]+)\/invite-email$/, h: () => ok({ message: 'Invite sent (mock)' }) },
  { m: 'post', re: /^\/groups\/([^/]+)\/leave$/, h: () => ok({ message: 'Left group (mock)' }) },
  { m: 'delete',re: /^\/groups\/([^/]+)\/members\/([^/]+)$/, h: () => ok({ message: 'Removed (mock)' }) },
  { m: 'post', re: /^\/groups\/([^/]+)\/members\/([^/]+)\/deactivate$/, h: () => ok({ message: 'Deactivated (mock)' }) },
  { m: 'post', re: /^\/groups\/([^/]+)\/members\/([^/]+)\/reactivate$/, h: () => ok({ message: 'Reactivated (mock)' }) },
  { m: 'delete',re: /^\/groups\/([^/]+)$/, h: () => ok({ message: 'Deleted (mock)' }) },

  // TASKS
  { m: 'get', re: /^\/tasks\/my$/, h: () => ok(MOCK_MY_TASKS) },
  { m: 'get', re: /^\/tasks\/my\/personal$/, h: () => ok(MOCK_PERSONAL_TASKS) },
  { m: 'post', re: /^\/tasks\/personal$/, h: (_, body) => ok(mockCreatePersonalTask(body)) },
  { m: 'get', re: /^\/tasks\/group\/([^/]+)\/assigned-by-me$/, h: (mArr) => ok((MOCK_TASKS_BY_GROUP[mArr[1]] || []).filter((t) => t.assignedById === 'u1')) },
  { m: 'get', re: /^\/tasks\/group\/([^/]+)$/, h: (mArr) => ok(MOCK_TASKS_BY_GROUP[mArr[1]] || []) },
  { m: 'post', re: /^\/tasks\/group$/, h: (_, body) => ok(mockCreateTask(body.groupId, body)) },
  { m: 'patch', re: /^\/tasks\/([^/]+)\/status$/, h: (_, body, mArr) => ok(mockUpdateTaskStatus(mArr[1], body.status)) },
  { m: 'put', re: /^\/tasks\/([^/]+)$/, h: (_, body, mArr) => ok(mockEditTask(mArr[1], body)) },
  { m: 'delete', re: /^\/tasks\/([^/]+)$/, h: (mArr) => { mockDeleteTask(mArr[1]); return ok({ message: 'Deleted (mock)' }); } },
  { m: 'post', re: /^\/tasks\/([^/]+)\/claim$/, h: (mArr) => ok(mockClaimTask(mArr[1])) },
  { m: 'post', re: /^\/tasks\/([^/]+)\/deny$/, h: (mArr) => ok(mockDenyTask(mArr[1])) },
  { m: 'patch', re: /^\/tasks\/([^/]+)\/priority$/, h: (_, body, mArr) => ok(mockUpdateTaskPriority(mArr[1], body.priority)) },
  { m: 'post', re: /^\/tasks\/([^/]+)\/comments$/, h: (_, body, mArr) => ok(mockAddComment(mArr[1], body.content)) },
  { m: 'post', re: /^\/tasks\/([^/]+)\/subtasks$/, h: (_, body, mArr) => ok(mockAddSubtask(mArr[1], body.title)) },
  { m: 'patch', re: /^\/tasks\/([^/]+)\/subtasks\/([^/]+)\/complete$/, h: (mArr) => ok(mockCompleteSubtask(mArr[1], mArr[2])) },
  { m: 'post', re: /^\/tasks\/([^/]+)\/pledge$/, h: (_, body, mArr) => ok(mockAddPledge(mArr[1], body.message)) },
  { m: 'post', re: /^\/tasks\/([^/]+)\/attachments$/, h: (_, body, mArr) => ok(mockAddAttachment(mArr[1], body.url)) },
  { m: 'delete', re: /^\/tasks\/([^/]+)\/attachments$/, h: (mArr, body) => ok(mockRemoveAttachment(mArr[1], body.url)) },
  { m: 'post', re: /^\/fairness\/tasks\/([^/]+)\/bonus-review$/, h: (mArr) => ok(mockRequestReview(mArr[1])) },
  { m: 'post', re: /^\/fairness\/tasks\/([^/]+)\/flag-bonus$/, h: (mArr) => ok(mockFlagBonus(mArr[1])) },
  { m: 'get', re: /^\/fairness\/tasks\/([^/]+)\/review-status$/, h: (mArr) => ok(mockGetReviewStatus(mArr[1])) },
  { m: 'get', re: /^\/suggestions\/group\/([^/]+)$/, h: (mArr) => ok(MOCK_SUGGESTIONS_BY_GROUP[mArr[1]] || []) },

  // REWARDS
  { m: 'get', re: /^\/rewards\/my$/, h: () => ok([]) },
  { m: 'get', re: /^\/rewards\/group\/([^/]+)\/leaderboard$/, h: (mArr) => ok(MOCK_LEADERBOARD_RAW_BY_GROUP[mArr[1]] || {}) },
  { m: 'get', re: /^\/rewards\/group\/([^/]+)\/redeem-options$/, h: (mArr) => ok(MOCK_REDEEM_OPTIONS_BY_GROUP[mArr[1]] || []) },
  { m: 'get', re: /^\/rewards\/group\/([^/]+)\/redeem-history$/, h: (mArr) => ok(MOCK_REDEEM_HISTORY_BY_GROUP[mArr[1]] || []) },
  { m: 'post', re: /^\/rewards\/redeem\/([^/]+)$/, h: () => ok({ message: 'Redeemed (mock)' }) },

  // XP & ANALYTICS
  { m: 'get', re: /^\/xp\/me$/, h: () => ok(buildXpForUser('u1')) },
  { m: 'put', re: /^\/auth\/profile$/, h: (_, body) => ok(mockUpdateProfile('u1', body)) },
  { m: 'delete', re: /^\/auth\/account$/, h: () => ok(mockDeleteAccount()) },
  { m: 'post', re: /^\/auth\/email-change\/request$/, h: (_, body) => ok(mockRequestEmailChange(body.newEmail)) },
  { m: 'post', re: /^\/auth\/email-change\/confirm$/, h: () => ok(mockConfirmEmailChange('', 'u1')) },
  { m: 'get', re: /^\/rewards\/my\/coins$/, h: () => ok({ coins: MOCK_USER.coins || 0 }) },
  { m: 'get', re: /^\/xp\/user\/([^/]+)$/, h: (mArr) => ok({ level: XP_BY_USER[mArr[1]] || 1, xp: (XP_BY_USER[mArr[1]] || 1) * 120 }) },
  { m: 'get', re: /^\/analytics\/group\/([^/]+)\/members$/, h: (mArr) => ok(buildMemberAnalytics(mArr[1])) },

  // CHAT / FAIRNESS
  { m: 'get', re: /^\/chat\/([^/]+)\/messages$/, h: (mArr) => ok(MOCK_CHAT_BY_GROUP[mArr[1]] || []) },
  { m: 'post', re: /^\/chat\/([^/]+)\/messages$/, h: (mArr, body) => ok(mockSendChatMessage(mArr[1], body.content)) },
  { m: 'get', re: /^\/fairness\/([^/]+)\/concentration$/, h: (mArr) => ok(MOCK_CONCENTRATION_BY_GROUP[mArr[1]] || { alerts: [] }) },
  { m: 'get', re: /^\/fairness\/([^/]+)$/, h: (mArr) => ok(MOCK_FAIRNESS_BY_GROUP[mArr[1]] || {}) },

  // NOTIFICATIONS
  { m: 'get', re: /^\/notifications$/, h: () => ok([]) },
  { m: 'get', re: /^\/notifications\/unread-count$/, h: () => ok({ count: 0 }) },

  // SUPERADMIN
  { m: 'get', re: /^\/superadmin\/requests\/all$/, h: () => ok(MOCK_ADMIN_REQUESTS) },
  { m: 'post', re: /^\/superadmin\/requests\/([^/]+)\/approve$/, h: (mArr) => ok(mockApproveRequest(mArr[1])) },
  { m: 'post', re: /^\/superadmin\/requests\/([^/]+)\/reject$/, h: (mArr, body) => ok(mockRejectRequest(mArr[1], body.reason)) },
  { m: 'get', re: /^\/superadmin\/users$/, h: () => ok(MOCK_USERS) },
  { m: 'post', re: /^\/superadmin\/users\/([^/]+)\/deactivate$/, h: (mArr, body) => ok(mockDeactivatePlatformUser(mArr[1], body.reason)) },
  { m: 'post', re: /^\/superadmin\/users\/([^/]+)\/activate$/, h: (mArr) => ok(mockActivatePlatformUser(mArr[1])) },
  { m: 'delete', re: /^\/superadmin\/users\/([^/]+)$/, h: (mArr) => ok(mockRemovePlatformUser(mArr[1])) },

  // FEEDBACK
  { m: 'get', re: /^\/feedback\/all$/, h: () => ok(MOCK_FEEDBACK) },
  { m: 'patch', re: /^\/feedback\/([^/]+)\/status$/, h: (mArr, body) => ok(mockUpdateFeedbackStatus(mArr[1], body.status)) },
];

if (USE_DUMMY_DATA) {
  API.defaults.adapter = async (config) => {
    const method = (config.method || 'get').toLowerCase();
    const url = (config.url || '').split('?')[0];
    const body = parseBody(config.data);
    for (const route of ROUTES) {
      if (route.m !== method) continue;
      const match = url.match(route.re);
      if (match) {
        await delay();
        return route.h(match, body, match);
      }
    }
    // Not mocked yet — reject cleanly instead of crashing on a non-callable adapter.
    const err = new Error(`[Mock API] No mock route for ${method.toUpperCase()} ${url}`);
    err.config = config;
    err.response = { status: 501, statusText: 'Not Implemented', data: { message: err.message }, headers: {}, config };
    return Promise.reject(err);
  };
}

/* AUTH */
export const login = (data) => API.post('/auth/login', data);
export const getMe = () => API.get('/auth/me');
export const forgotPassword = (email) => API.post('/auth/forgot-password', { email });
export const resendOtp = (email) => API.post('/auth/forgot-password', { email });
export const resetPassword = (data) => API.post('/auth/reset-password', data);
export const verifyEmail = (data) => API.post('/auth/verify-email', data);
export const updateProfile = (data) => API.put('/auth/profile', data);
export const deleteAccount = (data) => API.delete('/auth/account', { data });
export const requestEmailChange = (data) => API.post('/auth/email-change/request', data);
export const confirmEmailChange = (data) => API.post('/auth/email-change/confirm', data);
export const completeTour = () => API.post('/auth/tour-complete');

/* INVITE & REGISTRATION */
export const validateInvite = (token) => API.get(`/invite/validate?token=${token}`);
export const registerWithInvite = (data) => API.post('/auth/register', data);
export const requestAdminAccess = (data) => API.post('/invite/request-access', data);

/* GROUPS */
export const createGroup = (data) => API.post('/groups/create', data);
export const joinGroup = (inviteCode) => API.post('/groups/join', { inviteCode });
export const getMyGroups = () => API.get('/groups/my');
export const getGroup = (groupId) => API.get(`/groups/${groupId}`);
export const getGroupDetail = (groupId) => API.get(`/groups/${groupId}/detail`);
export const inviteByEmail = (groupId, email) => API.post(`/groups/${groupId}/invite-email`, { email });
export const leaveGroup = (groupId) => API.post(`/groups/${groupId}/leave`);
export const removeMember = (groupId, memberId, reason) => API.delete(`/groups/${groupId}/members/${memberId}`, { params: reason ? { reason } : {} });
export const deactivateMember = (groupId, memberId, reason = '') => API.post(`/groups/${groupId}/members/${memberId}/deactivate`, { reason });
export const reactivateMember = (groupId, memberId) => API.post(`/groups/${groupId}/members/${memberId}/reactivate`);
export const deleteGroup = (groupId) => API.delete(`/groups/${groupId}`);
export const regenerateCode = (groupId) => API.post(`/groups/${groupId}/regenerate-code`);
export const getGroupActivities = (groupId) => API.get(`/groups/${groupId}/activities`);

/* TASKS */
export const createGroupTask = (data) => API.post('/tasks/group', data);
export const createPersonalTask = (data) => API.post('/tasks/personal', data);
export const updateTaskStatus = (taskId, status) => API.patch(`/tasks/${taskId}/status`, { status });
export const editTask = (taskId, data) => API.put(`/tasks/${taskId}`, data);
export const deleteTask = (taskId) => API.delete(`/tasks/${taskId}`);
export const getMyTasks = () => API.get('/tasks/my');
export const getMyPersonalTasks = () => API.get('/tasks/my/personal');
export const getMyTasksByStatus = (status) => API.get(`/tasks/my/status/${status}`);
export const getGroupTasks = (groupId) => API.get(`/tasks/group/${groupId}`);
export const getGroupTasksByStatus = (groupId, status) => API.get(`/tasks/group/${groupId}/status/${status}`);
export const claimTask = (taskId) => API.post(`/tasks/${taskId}/claim`);
export const denyTask = (taskId) => API.post(`/tasks/${taskId}/deny`);
export const getTasksAssignedByMe = (groupId) => API.get(`/tasks/group/${groupId}/assigned-by-me`);
export const updateTaskPriority = (taskId, priority) => API.patch(`/tasks/${taskId}/priority`, { priority });

/* LOCATION */
export const updateLocation = (data) => API.post('/location/update', data);
export const getGroupLocations = (groupId) => API.get(`/location/group/${groupId}`);
export const getMyLocation = () => API.get('/location/me');

/* REWARDS */
export const getMyRewards = () => API.get('/rewards/my');
export const getMyCoins = () => API.get('/rewards/my/coins');
export const getGroupRewards = (groupId) => API.get(`/rewards/group/${groupId}`);
export const getLeaderboard = (groupId) => API.get(`/rewards/group/${groupId}/leaderboard`);
export const createRedeemOption = (groupId, data) => API.post(`/rewards/group/${groupId}/redeem-options`, data);
export const getRedeemOptions = (groupId) => API.get(`/rewards/group/${groupId}/redeem-options`);
export const redeemOption = (optionId) => API.post(`/rewards/redeem/${optionId}`);
export const deleteRedeemOption = (optionId) => API.delete(`/rewards/redeem-options/${optionId}`);
export const getRedeemHistory = (groupId) => API.get(`/rewards/group/${groupId}/redeem-history`);

/* SUPER ADMIN */
export const getSuperAdminRequests = () => API.get('/superadmin/requests');
export const getAllSuperAdminRequests = () => API.get('/superadmin/requests/all');
export const approveAdminRequest = (requestId) => API.post(`/superadmin/requests/${requestId}/approve`);
export const rejectAdminRequest = (requestId, reason = '') => API.post(`/superadmin/requests/${requestId}/reject`, { reason });
export const getSuperAdminUsers = () => API.get('/superadmin/users');
export const deactivatePlatformUser = (userId, reason = '') => API.post(`/superadmin/users/${userId}/deactivate`, { reason });
export const activatePlatformUser = (userId) => API.post(`/superadmin/users/${userId}/activate`);
export const removePlatformUser = (userId) => API.delete(`/superadmin/users/${userId}`);

/* XP & ANALYTICS */
export const getMyXP = () => API.get('/xp/me');
export const getUserXP = (userId) => API.get(`/xp/user/${userId}`);
export const getGroupMemberAnalytics = (groupId) => API.get(`/analytics/group/${groupId}/members`);
export const getGroupAnalytics = (groupId) => API.get(`/analytics/group/${groupId}`);
export const logAnalyticsEvent = (data) => API.post('/analytics/event', data);

/* FEEDBACK */
export const submitFeedback = (data) => API.post('/feedback', data);
export const getAllFeedback = () => API.get('/feedback/all');
export const updateFeedbackStatus = (id, status) => API.patch(`/feedback/${id}/status`, { status });

/* CHAT */
export const getChatMessages = (groupId) => API.get(`/chat/${groupId}/messages`);
export const sendChatMessage = (groupId, content) => API.post(`/chat/${groupId}/messages`, { content });

/* TASK EXTRAS */
export const addTaskComment = (taskId, data) => API.post(`/tasks/${taskId}/comments`, data);
export const getTaskComments = (taskId) => API.get(`/tasks/${taskId}/comments`);
export const addSubtask = (taskId, data) => API.post(`/tasks/${taskId}/subtasks`, data);
export const completeSubtask = (taskId, subtaskId) => API.patch(`/tasks/${taskId}/subtasks/${subtaskId}/complete`);
export const addCommitmentPledge = (taskId, data) => API.post(`/tasks/${taskId}/pledge`, data);

/* FAIRNESS */
export const getFairnessReport = (groupId) => API.get(`/fairness/${groupId}`);
export const getConcentrationReport = (groupId) => API.get(`/fairness/${groupId}/concentration`);

/* HEALTH BAR */
export const getGroupHealth = (groupId) => API.get(`/groups/${groupId}/health`);

/* ANALYTICS */
export const getPlatformAnalytics = () => API.get('/analytics/platform');

/* PEER REVIEW */
export const requestBonusReview = (taskId, bonusCoins) => API.post(`/fairness/tasks/${taskId}/bonus-review`, { bonusCoins });
export const flagBonus = (taskId) => API.post(`/fairness/tasks/${taskId}/flag-bonus`);
export const getReviewStatus = (taskId) => API.get(`/fairness/tasks/${taskId}/review-status`);

/* NOTIFICATIONS */
export const getNotifications = () => API.get('/notifications');
export const getUnreadCount = () => API.get('/notifications/unread-count');
export const markAllRead = () => API.post('/notifications/mark-all-read');
export const markNotificationRead = (id) => API.post(`/notifications/${id}/read`);

export const addTaskAttachment = async () => {};
export const removeTaskAttachment = async () => {};
export const getGroupSuggestions = (groupId) => API.get(`/suggestions/group/${groupId}`);
