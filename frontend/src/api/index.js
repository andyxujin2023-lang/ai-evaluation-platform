import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  switchOrganization: (orgId) => api.post(`/auth/switch-organization/${orgId}`),
};

export const usersApi = {
  listUsers: () => api.get('/users'),
  getUser: (id) => api.get(`/users/${id}`),
  createUser: (data) => api.post('/users', data),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deleteUser: (id) => api.delete(`/users/${id}`),
};

export const organizationsApi = {
  listOrganizations: () => api.get('/organizations'),
  getMyOrganization: () => api.get('/organizations/my'),
  getOrganization: (id) => api.get(`/organizations/${id}`),
  createOrganization: (data) => api.post('/organizations', data),
  updateOrganization: (id, data) => api.put(`/organizations/${id}`, data),
  deleteOrganization: (id) => api.delete(`/organizations/${id}`),
};

export const datasetsApi = {
  listQuestions: (params) => api.get('/datasets', { params }),
  getCategories: () => api.get('/datasets/categories'),
  getQuestion: (id) => api.get(`/datasets/${id}`),
  createQuestion: (data) => api.post('/datasets', data),
  importQuestions: (data) => api.post('/datasets/import', data),
  importExcel: (file, batchId) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/datasets/import/excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      params: batchId ? { batch_id: batchId } : {}
    });
  },
  downloadTemplate: () => {
    window.open('/api/datasets/template/download', '_blank');
  },
  updateQuestion: (id, data) => api.put(`/datasets/${id}`, data),
  deleteQuestion: (id) => api.delete(`/datasets/${id}`),
  batchDeleteQuestions: (ids) => api.post('/datasets/batch-delete', { ids }),
};

export const testBatchesApi = {
  listBatches: () => api.get('/test-batches'),
  getBatch: (id) => api.get(`/test-batches/${id}`),
  getBatchQuestions: (id) => api.get(`/test-batches/${id}/questions`),
  getBatchStats: (id) => api.get(`/test-batches/${id}/stats`),
  createBatch: (data) => api.post('/test-batches', data),
  updateBatch: (id, data) => api.put(`/test-batches/${id}`, data),
  deleteBatch: (id) => api.delete(`/test-batches/${id}`),
};

export const testRunsApi = {
  listTestRuns: () => api.get('/test-runs'),
  getTestRun: (id) => api.get(`/test-runs/${id}`),
  getTestProgress: (id) => api.get(`/test-runs/${id}/progress`),
  getTestResults: (id, category) => api.get(`/test-runs/${id}/results`, { params: category ? { category } : {} }),
  getTestReport: (id) => api.get(`/test-runs/${id}/report`),
  getTestLogs: (id, questionId, logType) => api.get(`/test-runs/${id}/logs`, {
    params: { question_id: questionId, log_type: logType }
  }),
  startTestRun: (data) => api.post('/test-runs', data),
  compareTestRuns: (baseId, compareId) => api.get(`/test-runs/compare/${baseId}/${compareId}`),
  deleteTestRun: (id) => api.delete(`/test-runs/${id}`),
  exportExcel: (id) => {
    window.open(`/api/test-runs/${id}/export/excel`, '_blank');
  },
  exportCsv: (id) => {
    window.open(`/api/test-runs/${id}/export/csv`, '_blank');
  },
};

export const configApi = {
  getConfigs: () => api.get('/config'),
  getConfig: (key) => api.get(`/config/${key}`),
  updateConfig: (key, value) => api.put('/config', { key, value }),
  updateConfigsBatch: (configs) => api.post('/config/batch', { configs }),
};

export const previewApi = {
  chat: (data) => api.post('/preview/chat', data),
  analyze: (data) => api.post('/preview/analyze', data),
  getConversation: (conversationId) => api.get(`/preview/chat/${conversationId}`),
  clearConversation: (conversationId) => api.delete(`/preview/chat/${conversationId}`),
};

export default api;
