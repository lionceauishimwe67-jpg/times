import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiResponse } from '../types';
import { API_ORIGIN } from './network';

const API_URL = API_ORIGIN;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Create axios instance with professional defaults
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  timeout: 10000,
});

// Request interceptor to add auth token and request ID
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request ID for debugging
    config.headers['X-Request-ID'] = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Log requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, config.params || '');
    }

    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and retry logic
api.interceptors.response.use(
  (response: AxiosResponse<ApiResponse<any>>) => {
    // Log successful responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] ✓ ${response.config.url}`, response.data);
    }
    return response;
  },
  async (error: AxiosError<ApiResponse<any>>) => {
    const config = error.config as AxiosRequestConfig & { retryCount?: number };

    // Retry logic for network errors or 5xx errors
    if (
      config &&
      (!error.response || error.response.status >= 500) &&
      (config.retryCount || 0) < MAX_RETRIES
    ) {
      config.retryCount = (config.retryCount || 0) + 1;

      const retryCount = config.retryCount || 1;
      console.warn(`[API] Retry ${retryCount}/${MAX_RETRIES} for ${config.url}`);

      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retryCount));
      return api(config);
    }

    // Handle specific error cases
    if (error.response) {
      const { status } = error.response;

      switch (status) {
        case 401:
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/admin/login';
          break;

        case 403: {
          const forbiddenMsg = String(error.response.data?.error || '');
          const isAuthFailure =
            forbiddenMsg.toLowerCase().includes('token') ||
            forbiddenMsg.toLowerCase().includes('invalid') ||
            forbiddenMsg.toLowerCase().includes('expired') ||
            forbiddenMsg.toLowerCase().includes('authentication');

          if (isAuthFailure) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (!window.location.pathname.includes('/login')) {
              window.location.href = '/admin/login';
            }
          } else {
            console.error('[API] Forbidden access:', error.config?.url, forbiddenMsg);
          }
          break;
        }

        case 404:
          console.error('[API] Resource not found:', error.config?.url);
          break;

        case 422:
          console.error('[API] Validation error:', error.response.data?.error);
          break;

        case 429:
          console.error('[API] Rate limited');
          break;

        case 500:
        case 502:
        case 503:
        case 504:
          console.error('[API] Server error:', status);
          break;

        default:
          console.error('[API] Error:', status, error.response.data);
      }
    } else if (error.request) {
      console.error('[API] Network error - no response received');
    } else {
      console.error('[API] Error:', error.message);
    }

    return Promise.reject(error);
  }
);

// Utility function to handle API errors consistently
export const handleApiError = (error: AxiosError<ApiResponse<any>>): string => {
  if (error.response?.data?.error) {
    return error.response.data.error;
  }

  if (error.response?.status === 401) {
    return 'Session expired. Please log in again.';
  }

  if (error.response?.status === 403) {
    return 'You do not have permission to perform this action.';
  }

  if (error.response?.status === 404) {
    return 'The requested resource was not found.';
  }

  if (error.response?.status && error.response.status >= 500) {
    return 'Server error. Please try again later.';
  }

  if (!error.response) {
    return 'Network error. Please check your connection.';
  }

  return 'An unexpected error occurred. Please try again.';
};

// Auth API
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/api/auth/login', { username, password }),
  register: (username: string, password: string) =>
    api.post('/api/auth/register', { username, password }),
  loginWithSecret: (secret: string) =>
    api.post('/api/auth/admin-secret', { secret }),
  verify: () => api.get('/api/auth/verify'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/api/auth/change-password', { currentPassword, newPassword }),
  registerTeacher: (data: any) =>
    api.post('/api/auth/register-teacher', data),
};

// Timetable API
export const timetableApi = {
  getAllClassesStatus: () => api.get('/api/timetable/all-classes-status'),
  getCurrentSessions: (params?: { classId?: number; level?: string }) =>
    api.get('/api/timetable/current-sessions', { params }),
  getToday: (params?: { classId?: number; dayOfWeek?: number; level?: string }) =>
    api.get('/api/timetable/today', { params }),
  getWeek: (params?: { classId?: number; level?: string }) =>
    api.get('/api/timetable/week', { params }),
  getAll: (params?: { classId?: number; dayOfWeek?: number }) =>
    api.get('/api/timetable/entries', { params }),
  getById: (id: number) => api.get(`/api/timetable/entries/${id}`),
  create: (data: any) => api.post('/api/timetable', data),
  bulkSave: (classId: number, entries: any[]) => api.post('/api/timetable/bulk-save', { classId, entries }),
  update: (id: number, data: any) => api.put(`/api/timetable/${id}`, data),
  delete: (id: number) => api.delete(`/api/timetable/${id}`),
  deleteAll: () => api.delete('/api/timetable'),
  getReferenceData: () => api.get('/api/timetable/reference-data'),
  batchImport: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/timetable/batch-import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};

// Announcements API
export const announcementApi = {
  getAll: () => api.get('/api/announcements'),
  getAllAdmin: () => api.get('/api/announcements/all'),
  getById: (id: number) => api.get(`/api/announcements/${id}`),
  create: (data: FormData) =>
    api.post('/api/announcements', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  update: (id: number, data: FormData) =>
    api.put(`/api/announcements/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id: number) => api.delete(`/api/announcements/${id}`),
  reorder: (orders: { id: number; display_order: number }[]) =>
    api.post('/api/announcements/reorder', { orders }),
  getAvailableImages: () => api.get('/api/announcements/images'),
};

// Display API
export const displayApi = {
  getConfig: (displayId: string) => api.get(`/api/display/config/${displayId}`),
  saveConfig: (displayId: string, data: any) =>
    api.post(`/api/display/config/${displayId}`, data),
  getAllConfigs: () => api.get('/api/display/configs'),
};

// Teachers API
export const teachersApi = {
  getAll: () => api.get('/api/teachers'),
  getSubjects: () => api.get('/api/teachers/subjects'),
  getClasses: () => api.get('/api/teachers/classes'),
  getRooms: () => api.get('/api/teachers/rooms'),
  getTeacherSubjects: (id: number) => api.get(`/api/teachers/${id}/subjects`),
  getTeacherClasses: (id: number) => api.get(`/api/teachers/${id}/classes`),
  getTeacherRooms: (id: number) => api.get(`/api/teachers/${id}/rooms`),
  assignSubjects: (id: number, subjectIds: number[]) => api.post(`/api/teachers/${id}/subjects`, { subjectIds }),
  assignClasses: (id: number, classIds: number[]) => api.post(`/api/teachers/${id}/classes`, { classIds }),
  assignRooms: (id: number, roomIds: number[]) => api.post(`/api/teachers/${id}/rooms`, { roomIds }),
  addSubject: (id: number, subjectId: number) => api.post(`/api/teachers/${id}/subjects/add`, { subjectId }),
  removeSubject: (id: number, subjectId: number) => api.delete(`/api/teachers/${id}/subjects/${subjectId}`),
  removeClass: (id: number, classId: number) => api.delete(`/api/teachers/${id}/classes/${classId}`),
  removeRoom: (id: number, roomId: number) => api.delete(`/api/teachers/${id}/rooms/${roomId}`),
  create: (data: any) => api.post('/api/teachers', data),
  update: (id: number, data: any) => api.post('/api/teachers', { ...data, id }),
  delete: (id: number) => api.delete(`/api/teachers/${id}`),
};

// Notifications API
export const notificationApi = {
  registerDeviceToken: (data: { deviceToken: string; teacherId?: number }) =>
    api.post('/api/notifications/device-token', data),
  updatePreferences: (data: { notificationEnabled?: boolean; notificationAdvanceMinutes?: number }) =>
    api.put('/api/notifications/preferences', data),
  getPreferences: () => api.get('/api/notifications/preferences'),
  getHistory: () => api.get('/api/notifications/history'),
  sendTestNotification: (data: { teacherId: number; via?: string }) =>
    api.post('/api/notifications/test', data),
  markAsRead: (id: number) =>
    api.post(`/api/notifications/${id}/read`),
  getTeacherStatus: (params?: { teacher_id?: number; limit?: number; offset?: number }) =>
    api.get('/api/notifications/teacher-status', { params }),
};

// Bell API (Smart Bell integration)
export const bellApi = {
  triggerManualBell: () => api.post('/api/bell/ring-now'),
  getCurrentSession: () => api.get('/api/bell/current-session'),
  getDevices: () => api.get('/api/bell/devices'),
  getBellLogs: () => api.get('/api/bell/logs'),
  sendHeartbeat: (deviceId: string) => api.post('/api/bell/heartbeat', { device_id: deviceId }),
};

// Break Times API
export const breakTimesApi = {
  getAll: () => api.get('/api/break-times'),
  getById: (id: number) => api.get(`/api/break-times/${id}`),
  create: (data: any) => api.post('/api/break-times', data),
  update: (id: number, data: any) => api.put(`/api/break-times/${id}`, data),
  delete: (id: number) => api.delete(`/api/break-times/${id}`),
};

// Dynamic Events API
export const dynamicEventsApi = {
  getAll: (params?: any) => api.get('/api/dynamic-events', { params }),
  getById: (id: number) => api.get(`/api/dynamic-events/${id}`),
  getUpcomingToday: () => api.get('/api/dynamic-events/upcoming/today'),
  create: (data: any) => api.post('/api/dynamic-events', data),
  update: (id: number, data: any) => api.put(`/api/dynamic-events/${id}`, data),
  delete: (id: number) => api.delete(`/api/dynamic-events/${id}`),
  cancel: (id: number) => api.post(`/api/dynamic-events/${id}/cancel`),
};

// Phone Numbers API (SMS notifications)
export const phoneNumbersApi = {
  getAll: () => api.get('/api/phone-numbers'),
  add: (data: { phone_number: string; name?: string }) => api.post('/api/phone-numbers', data),
  delete: (id: number) => api.delete(`/api/phone-numbers/${id}`),
  toggle: (id: number) => api.post(`/api/phone-numbers/${id}/toggle`),
};

// Students API
export const studentApi = {
  getAll: (params?: { classId?: number; status?: string; search?: string }) =>
    api.get('/api/students', { params }),
  getById: (id: number) => api.get(`/api/students/${id}`),
  create: (data: any) => api.post('/api/students', data),
  update: (id: number, data: any) => api.put(`/api/students/${id}`, data),
  delete: (id: number) => api.delete(`/api/students/${id}`),
  getStats: () => api.get('/api/students/stats'),
  recordAttendance: (data: any) => api.post('/api/students/attendance', data),
};

// Grades API
export const gradeApi = {
  getAll: (params?: { studentId?: number; subjectId?: number; classId?: number; term?: string; academicYear?: string }) =>
    api.get('/api/grades', { params }),
  getByStudent: (studentId: number) => api.get(`/api/grades/student/${studentId}`),
  create: (data: any) => api.post('/api/grades', data),
  update: (id: number, data: any) => api.put(`/api/grades/${id}`, data),
  delete: (id: number) => api.delete(`/api/grades/${id}`),
  getStats: (params?: any) => api.get('/api/grades/stats', { params }),
};

// Alumni API
export const alumniApi = {
  getAll: (params?: { graduationYear?: number; search?: string; status?: string }) =>
    api.get('/api/alumni', { params }),
  getById: (id: number) => api.get(`/api/alumni/${id}`),
  create: (data: any) => api.post('/api/alumni', data),
  update: (id: number, data: any) => api.put(`/api/alumni/${id}`, data),
  delete: (id: number) => api.delete(`/api/alumni/${id}`),
  getStats: () => api.get('/api/alumni/stats'),
};

// Uploads API
export const uploadApi = {
  getAll: (params?: { category?: string; entityType?: string; entityId?: number }) =>
    api.get('/api/uploads', { params }),
  getById: (id: number) => api.get(`/api/uploads/${id}`),
  upload: (formData: FormData) =>
    api.post('/api/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id: number) => api.delete(`/api/uploads/${id}`),
  getStats: () => api.get('/api/uploads/stats'),
};

// Parents API
export const parentApi = {
  getAll: (params?: { search?: string }) => api.get('/api/parents', { params }),
  getById: (id: number) => api.get(`/api/parents/${id}`),
  create: (data: any) => api.post('/api/parents', data),
  update: (id: number, data: any) => api.put(`/api/parents/${id}`, data),
  delete: (id: number) => api.delete(`/api/parents/${id}`),
  linkToStudent: (data: { parentId: number; studentId: number; isPrimary?: boolean }) =>
    api.post('/api/parents/link', data),
  unlinkFromStudent: (data: { parentId: number; studentId: number }) =>
    api.post('/api/parents/unlink', data),
};

// Smart Timetable System API
export const smartTimetableApi = {
  uploadChronogram: (file: File, onProgress?: (p: number) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/api/smart-timetable/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e: any) => {
        if (e.total && onProgress) onProgress(Math.round((e.loaded * 100) / e.total));
      },
    });
  },
  validateChronogram: (uploadId: number) =>
    api.post('/api/smart-timetable/validate', { uploadId }),
  generateTimetable: (uploadId: number, classId: number) =>
    api.post('/api/smart-timetable/generate', { uploadId, classId }),
  generateFromChronogram: (payload: any) =>
    api.post('/api/smart-timetable/generate-from-chronogram', payload),
  saveTimetable: (generationId: number, replaceExisting = true) =>
    api.post('/api/smart-timetable/save', { generationId, replaceExisting }),
  getRealTime: () => api.get('/api/smart-timetable/real-time'),
  getCurrentActivity: (classId: number) =>
    api.get('/api/smart-timetable/current-activity', { params: { classId } }),
  exportTimetable: (params: { generationId?: number; classId?: number; format?: string }) =>
    api.post('/api/smart-timetable/export', params, { responseType: 'blob' }),
  getHistory: (params?: { classId?: number }) =>
    api.get('/api/smart-timetable/history', { params }),
  deleteHistory: (id: number) => api.delete(`/api/smart-timetable/history/${id}`),
  deleteAllHistory: (classId?: number) => api.post('/api/smart-timetable/history/delete-all', { classId }),
  deleteAllTimetable: (classId?: number) => api.post('/api/smart-timetable/timetable/delete-all', { classId }),
  deleteAllUploads: () => api.post('/api/smart-timetable/uploads/delete-all'),
  fullReset: (classId?: number) => api.post('/api/smart-timetable/reset', { classId }),
};

export default api;
