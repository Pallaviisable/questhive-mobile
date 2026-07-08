import axios from 'axios';
import { getToken } from './token';


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

/* AUTH */
export const login = (data) => API.post('/auth/login', data);
export const forgotPassword = (email) => API.post('/auth/forgot-password', { email });
export const resendOtp = (email) => API.post('/auth/resend-otp', { email });
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
export const getGroupMemberAnalytics = (groupId) => API.get(`/analytics/group/${groupId}/members`);
export const getGroupAnalytics = (groupId) => API.get(`/analytics/group/${groupId}`);
export const logAnalyticsEvent = (data) => API.post('/analytics/event', data);

/* FEEDBACK */
export const submitFeedback = (data) => API.post('/feedback', data);
export const getAllFeedback = () => API.get('/feedback/all');
export const updateFeedbackStatus = (id, status) => API.patch(`/feedback/${id}/status`, { status });

/* CHAT */
export const getChatMessages = (groupId) => API.get(`/chat/${groupId}/messages`);

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

export const addTaskAttachment = (taskId, data) => API.post(`/tasks/${taskId}/attachments`, data);
export const removeTaskAttachment = (taskId, data) => API.delete(`/tasks/${taskId}/attachments`, { data });
export const getGroupSuggestions = (groupId) => API.get(`/suggestions/group/${groupId}`);