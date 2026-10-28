import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Projects
export const fetchProductions = () => api.get('/productions');
export const createProduction = (data) => api.post('/productions', data);
export const fetchDashboard = (id) => api.get(`/projects/${id}/dashboard`);

// Scripts & Entities
export const uploadScript = (id, formData) => api.post(`/scripts/${id}/analyze`, formData, { headers: { 'Content-Type': 'multipart/form-data' }});
export const fetchEntities = (id, type) => api.get(`/projects/${id}/entities`, { params: { type } });
export const updateEntity = (id, data) => api.put(`/entities/${id}`, data);

// Budget
export const fetchBudget = (id) => api.get(`/budget/${id}`);
export const generateBudgetQuote = (id) => api.post(`/budget/${id}/quote`);
export const allocateBudget = (id) => api.post(`/budget/${id}/allocate`);

// Expenses & Revenue
export const fetchExpenses = (id) => api.get(`/projects/${id}/expenses`);
export const logExpense = (id, data) => api.post(`/projects/${id}/expenses`, data);
// Distributors & Revenue
export const fetchDistributors = () => api.get(`/distributors`);
export const addDistributor = (data) => api.post(`/distributors`, data);
export const fetchDistributionAgreements = (id) => api.get(`/productions/${id}/distribution-agreements`);
export const createDistributionAgreement = (id, data) => api.post(`/productions/${id}/distribution-agreements`, data);
export const fetchRevenueEntries = (agreementId) => api.get(`/distribution-agreements/${agreementId}/revenue`);
export const logRevenueEntry = (agreementId, data) => api.post(`/distribution-agreements/${agreementId}/revenue`, data);

// Artists
export const fetchArtistContracts = (id) => api.get(`/productions/${id}/artist-contracts`);
export const addArtistContract = (id, data) => api.post(`/productions/${id}/artist-contracts`, data);
export const fetchArtistPayments = (contractId) => api.get(`/artist-contracts/${contractId}/payments`);
export const logArtistPayment = (contractId, data) => api.post(`/artist-contracts/${contractId}/payments`, data);

// Equipment Rentals
export const fetchEquipmentRentals = (id) => api.get(`/productions/${id}/rentals`);
export const addEquipmentRental = (id, data) => api.post(`/productions/${id}/rentals`, data);
export const fetchDamageReports = (rentalId) => api.get(`/rentals/${rentalId}/damage-reports`);
export const logDamageReport = (rentalId, data) => api.post(`/rentals/${rentalId}/damage-reports`, data);

// Reports Extensions
export const fetchGSTITCReport = () => api.get(`/report/gst-itc`);
// Rate Cards
export const fetchRateCards = () => api.get('/rate-cards');
export const createRateCard = (data) => api.post('/rate-cards', data);
export const updateRateCard = (id, data) => api.put(`/rate-cards/${id}`, data);
export const activateRateCard = (id) => api.post(`/rate-cards/${id}/activate`);

// Vendors
export const fetchVendors = () => api.get('/vendors');
export const createVendor = (data) => api.post('/vendors', data);
export const fetchVendor = (id) => api.get(`/vendors/${id}`);
export const updateVendor = (id, data) => api.put(`/vendors/${id}`, data);
export const fetchVendorPOs = (id) => api.get(`/vendors/${id}/pos`);

// Purchase Orders
export const fetchPOs = (id) => api.get(`/productions/${id}/pos`);
export const raisePO = (id, data) => api.post(`/productions/${id}/pos`, data);
export const fetchPO = (id) => api.get(`/pos/${id}`);
export const approvePO = (id) => api.put(`/pos/${id}/approve`);
export const rejectPO = (id, data) => api.put(`/pos/${id}/reject`, data);
export const closePO = (id) => api.put(`/pos/${id}/close`);

// Writer's Room Studio
export const fetchStudioDocuments = () => api.get(`/studio/documents`);
export const createStudioDocument = (data) => api.post(`/studio/documents`, data);
export const fetchStudioDocument = (id) => api.get(`/studio/documents/${id}`);
export const saveStudioDocument = (id, data) => api.put(`/studio/documents/${id}`, data);
export const fetchDocumentComments = (id) => api.get(`/studio/documents/${id}/comments`);
export const addDocumentComment = (id, data) => api.post(`/studio/documents/${id}/comments`, data);
export const commitDocumentToProduction = (id) => api.post(`/studio/documents/${id}/commit`);
export const getAISuggestion = (id, data) => api.post(`/studio/documents/${id}/ai-suggest`, data);

// Budget Versions
export const fetchBudgetVersions = (id) => api.get(`/productions/${id}/budget/versions`);
export const createBudgetSnapshot = (id, data) => api.post(`/productions/${id}/budget/versions`, data);
export const lockBudgetVersion = (id) => api.put(`/budget/versions/${id}/lock`);
export const fetchVarianceReport = (id) => api.get(`/budget/versions/${id}/variance`);

// Schedule
export const fetchSchedule = (id) => api.get(`/productions/${id}/schedule`);
export const addShootDay = (id, data) => api.post(`/productions/${id}/schedule`, data);
export const updateShootDayStatus = (id, data) => api.put(`/schedule/${id}`, data);
export const fetchDOOD = (id) => api.get(`/productions/${id}/dood`);

// FX Rates
export const fetchFXRates = () => api.get('/fx-rates');
export const addFXRate = (data) => api.post('/fx-rates', data);

// Audit Log
export const fetchAuditLog = (id) => api.get(`/productions/${id}/audit`);
export const fetchEntityAuditLog = (entityType, entityId) => api.get(`/audit/${entityType}/${entityId}`);

// Re-run shoot-day prediction + budget generation from current (edited) entities
export const recalculatePrediction = (id) => api.post(`/productions/${id}/recalculate`);

// Evaluation Metrics (Precision/Recall/F1 + MAPE)
export const fetchEvaluationMetrics = (id) => api.get(`/productions/${id}/evaluate`);
// Fixed ground-truth extraction test set (reproducible, not tied to a production)
export const fetchExtractionTestSet = () => api.get('/validation/extraction-test-set');
// Shoot-day prediction model — cross-validated accuracy (core AI/ML contribution)
export const fetchShootDayModel = () => api.get('/validation/shoot-day-model');
// Ad-hoc prediction against the deployed model (Evaluation Dashboard "try it" calculator)
export const predictShootDaysAdHoc = (params) => api.get('/validation/predict-shoot-days', { params });

// Ablation study: with vs without fuzzy-string deduplication
export const fetchAblationReport = () => api.get('/validation/ablation-report');
// Confusion matrix: predicted-vs-actual per entity on ground-truth corpus
export const fetchConfusionMatrix = () => api.get('/validation/confusion-matrix');
