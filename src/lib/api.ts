const API_URL = "http://localhost:3001/api";

const getHeaders = (isPatchOrDelete = false) => {
  const stored = localStorage.getItem("careConnect_user");
  const headers: Record<string, string> = {};
  if (!isPatchOrDelete) {
    headers["Content-Type"] = "application/json";
  }
  if (stored) {
    try {
      const user = JSON.parse(stored);
      if (user.token) {
        headers["Authorization"] = `Bearer ${user.token}`;
      }
    } catch (e) {
      console.error("Error reading token from localStorage", e);
    }
  }
  return headers;
};

export const fetchPatients = async () => {
  const res = await fetch(`${API_URL}/patients`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error("Failed to fetch patients");
  return res.json();
};

export const createPatient = async (data: any) => {
  const res = await fetch(`${API_URL}/patients`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create patient");
  return res.json();
};

export const deletePatient = async (id: string) => {
  const res = await fetch(`${API_URL}/patients/${id}`, {
    method: "DELETE",
    headers: getHeaders(true),
  });
  if (!res.ok) throw new Error("Failed to delete patient");
  return res.json();
};

export const fetchAppointments = async () => {
  const res = await fetch(`${API_URL}/appointments`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error("Failed to fetch appointments");
  return res.json();
};

export const createAppointment = async (data: any) => {
  const res = await fetch(`${API_URL}/appointments`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create appointment");
  return res.json();
};

export const deleteAppointment = async (id: string) => {
  const res = await fetch(`${API_URL}/appointments/${id}`, {
    method: "DELETE",
    headers: getHeaders(true),
  });
  if (!res.ok) throw new Error("Failed to delete appointment");
  return res.json();
};

export const updateAppointment = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/appointments/${id}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update appointment");
  return res.json();
};

export interface NotificationFilterParams {
  status?: "all" | "unread" | "read";
  category?: "all" | "appointment" | "prescription" | "account" | "general";
  page?: number;
  limit?: number;
}

export const fetchNotifications = async (params?: NotificationFilterParams) => {
  const query = new URLSearchParams();
  if (params?.status) query.append("status", params.status);
  if (params?.category) query.append("category", params.category);
  if (params?.page) query.append("page", params.page.toString());
  if (params?.limit) query.append("limit", params.limit.toString());

  const queryString = query.toString();
  const url = queryString ? `${API_URL}/notifications?${queryString}` : `${API_URL}/notifications`;
  const res = await fetch(url, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error("Failed to fetch notifications");
  return res.json();
};

export const markNotificationRead = async (id: string) => {
  const res = await fetch(`${API_URL}/notifications/${id}/read`, {
    method: "PATCH",
    headers: getHeaders(true),
  });
  if (!res.ok) throw new Error("Failed to mark notification read");
  return res.json();
};

export const markNotificationUnread = async (id: string) => {
  const res = await fetch(`${API_URL}/notifications/${id}/unread`, {
    method: "PATCH",
    headers: getHeaders(true),
  });
  if (!res.ok) throw new Error("Failed to mark notification unread");
  return res.json();
};

export const deleteNotification = async (id: string) => {
  const res = await fetch(`${API_URL}/notifications/${id}`, {
    method: "DELETE",
    headers: getHeaders(true),
  });
  if (!res.ok) throw new Error("Failed to delete notification");
  return res.json();
};

export const triggerUpcomingReminders = async () => {
  const res = await fetch(`${API_URL}/notifications/reminders/send-upcoming`, {
    method: "POST",
    headers: getHeaders(true),
  });
  if (!res.ok) throw new Error("Failed to trigger upcoming reminders");
  return res.json();
};


export const requestOtp = async (email: string, role: string) => {
  const res = await fetch(`${API_URL}/auth/request-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, role }),
  });
  if (!res.ok) throw new Error("Failed to request OTP");
  return res.json();
};

export const verifyOtp = async (email: string, otp: string, role: string, name?: string) => {
  const res = await fetch(`${API_URL}/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp, role, name }),
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to verify OTP");
  }
  return res.json();
};

export const fetchTreatments = async () => {
  const res = await fetch(`${API_URL}/treatments`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error("Failed to fetch treatments");
  return res.json();
};

export const createTreatment = async (data: any) => {
  const res = await fetch(`${API_URL}/treatments`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create treatment");
  return res.json();
};

export const fetchPrescriptions = async () => {
  const res = await fetch(`${API_URL}/prescriptions`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error("Failed to fetch prescriptions");
  return res.json();
};

export const createPrescription = async (data: any) => {
  const res = await fetch(`${API_URL}/prescriptions`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create prescription");
  return res.json();
};

export const fetchInvoices = async () => {
  const res = await fetch(`${API_URL}/invoices`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error("Failed to fetch invoices");
  return res.json();
};

export const createInvoice = async (data: any) => {
  const res = await fetch(`${API_URL}/invoices`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create invoice");
  return res.json();
};

// ==========================================
// 🔐 AUTHENTICATION API METHODS
// ==========================================

export const loginUser = async (credentials: { email: string; password: string; role?: string }) => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Failed to log in.");
  }
  return data;
};

export const registerPatient = async (data: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  age?: number;
  gender?: string;
  bloodGroup?: string;
  address?: string;
}) => {
  const res = await fetch(`${API_URL}/auth/register-patient`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const resData = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(resData.error || "Failed to register patient account.");
  }
  return resData;
};

export const registerDoctor = async (data: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  specialization: string;
  qualifications: string;
  experienceYears?: number;
  hospitalAffiliation?: string;
  medicalLicenseNumber: string;
  consultationFee?: number;
}) => {
  const res = await fetch(`${API_URL}/auth/register-doctor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const resData = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(resData.error || "Failed to submit doctor credential application.");
  }
  return resData;
};

export const fetchCurrentUser = async () => {
  const headers = getHeaders();
  if (!headers["Authorization"]) {
    return null;
  }
  const res = await fetch(`${API_URL}/auth/me`, {
    headers,
  });
  if (!res.ok) {
    throw new Error("Session expired or invalid.");
  }
  return res.json();
};

export const requestPasswordReset = async (email: string) => {
  const res = await fetch(`${API_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to request password reset.");
  return data;
};

export const confirmPasswordReset = async (data: { email: string; resetToken: string; newPassword: string }) => {
  const res = await fetch(`${API_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const resData = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(resData.error || "Failed to reset password.");
  return resData;
};

export const verifyEmailOtp = async (email: string, otp: string) => {
  const res = await fetch(`${API_URL}/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });
  const resData = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(resData.error || "Failed to verify email.");
  return resData;
};

// ==========================================
// 🛡️ ADMIN API METHODS
// ==========================================

export const fetchAdminMetrics = async () => {
  const res = await fetch(`${API_URL}/admin/metrics`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load admin metrics.");
  return res.json();
};

export const fetchAdminDoctors = async () => {
  const res = await fetch(`${API_URL}/admin/doctors`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load doctor applications.");
  return res.json();
};

export const fetchAdminVerifications = async (params?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const query = new URLSearchParams();
  if (params?.status && params.status !== "ALL") query.append("status", params.status);
  if (params?.search) query.append("search", params.search);
  if (params?.page) query.append("page", params.page.toString());
  if (params?.limit) query.append("limit", params.limit.toString());

  const queryString = query.toString();
  const url = queryString ? `${API_URL}/admin/verifications?${queryString}` : `${API_URL}/admin/verifications`;
  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) throw new Error("Failed to fetch verification requests.");
  return res.json();
};

export const reviewAdminVerification = async (
  requestId: string,
  data: {
    status: "APPROVED" | "REJECTED" | "INFO_REQUESTED" | "SUSPENDED";
    reviewNotes?: string;
  }
) => {
  const res = await fetch(`${API_URL}/admin/verifications/${requestId}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  const resData = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(resData.error || "Failed to process verification decision.");
  return resData;
};

export const verifyDoctorStatus = async (
  profileId: string,
  verificationStatus: "VERIFIED" | "REJECTED" | "PENDING",
  rejectionReason?: string
) => {
  const res = await fetch(`${API_URL}/admin/doctors/${profileId}/verify`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify({ verificationStatus, rejectionReason }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to update doctor verification status.");
  return data;
};

export const fetchAdminUsers = async (params?: {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}) => {
  const query = new URLSearchParams();
  if (params?.search) query.append("search", params.search);
  if (params?.role && params.role !== "all") query.append("role", params.role);
  if (params?.status && params.status !== "all") query.append("status", params.status);
  if (params?.page) query.append("page", params.page.toString());
  if (params?.limit) query.append("limit", params.limit.toString());

  const queryString = query.toString();
  const url = queryString ? `${API_URL}/admin/users?${queryString}` : `${API_URL}/admin/users`;
  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) throw new Error("Failed to load users list.");
  return res.json();
};

export const updateUserRole = async (userId: string, role: string) => {
  const res = await fetch(`${API_URL}/admin/users/${userId}/role`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify({ role }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to update role.");
  return data;
};

export const updateUserStatus = async (userId: string, status: "Active" | "Suspended", reason?: string) => {
  const res = await fetch(`${API_URL}/admin/users/${userId}/status`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify({ status, reason }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to update user status.");
  return data;
};

export const fetchAdminAuditLogs = async (params?: {
  search?: string;
  action?: string;
  severity?: string;
  page?: number;
  limit?: number;
}) => {
  const query = new URLSearchParams();
  if (params?.search) query.append("search", params.search);
  if (params?.action && params.action !== "all") query.append("action", params.action);
  if (params?.severity && params.severity !== "all") query.append("severity", params.severity);
  if (params?.page) query.append("page", params.page.toString());
  if (params?.limit) query.append("limit", params.limit.toString());

  const queryString = query.toString();
  const url = queryString ? `${API_URL}/admin/audit-logs?${queryString}` : `${API_URL}/admin/audit-logs`;
  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) throw new Error("Failed to load audit logs.");
  return res.json();
};


// ==========================================
// 🏥 PATIENT PORTAL API METHODS
// ==========================================

export const fetchDoctors = async () => {
  const res = await fetch(`${API_URL}/doctors`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch verified doctors list.");
  return res.json();
};

export const fetchMedicalRecords = async (patientId?: string) => {
  const url = patientId ? `${API_URL}/medical-records?patientId=${patientId}` : `${API_URL}/medical-records`;
  const res = await fetch(url, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load medical records.");
  return res.json();
};

export const createMedicalRecord = async (data: {
  title: string;
  description?: string;
  recordType: string;
  diagnosis?: string;
  recordDate?: string;
  attachments?: any;
  patientId?: string;
  doctorId?: string;
}) => {
  const res = await fetch(`${API_URL}/medical-records`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  const resData = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(resData.error || "Failed to save medical record.");
  return resData;
};

export const deleteMedicalRecord = async (id: string) => {
  const res = await fetch(`${API_URL}/medical-records/${id}`, {
    method: "DELETE",
    headers: getHeaders(true),
  });
  if (!res.ok) throw new Error("Failed to delete medical record.");
  return res.json();
};

export const fetchPatientProfile = async () => {
  const res = await fetch(`${API_URL}/patient/profile`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to load patient profile.");
  return res.json();
};

export const updatePatientProfile = async (data: {
  name?: string;
  phone?: string;
  age?: number;
  gender?: string;
  bloodGroup?: string;
  address?: string;
  emergencyContact?: string;
  allergies?: string;
  medicalHistory?: string;
}) => {
  const res = await fetch(`${API_URL}/patient/profile`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  const resData = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(resData.error || "Failed to update profile.");
  return resData;
};

export const markAllNotificationsRead = async () => {
  const res = await fetch(`${API_URL}/notifications/mark-all-read`, {
    method: "POST",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to mark all notifications as read.");
  return res.json();
};

/* ================= DOCTOR DASHBOARD CLINICAL APIS ================= */

export const fetchDoctorOverview = async (doctorId?: string) => {
  const url = doctorId ? `${API_URL}/doctor/overview?doctorId=${encodeURIComponent(doctorId)}` : `${API_URL}/doctor/overview`;
  const res = await fetch(url, { headers: getHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to fetch doctor overview.");
  return data;
};

export const fetchDoctorAvailability = async (date?: string, doctorId?: string) => {
  const params = new URLSearchParams();
  if (date) params.append("date", date);
  if (doctorId) params.append("doctorId", doctorId);
  const queryStr = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_URL}/doctor/availability${queryStr}`, { headers: getHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to fetch doctor availability.");
  return data;
};

export const updateDoctorAvailability = async (data: any) => {
  const res = await fetch(`${API_URL}/doctor/availability`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  const resData = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(resData.error || "Failed to update availability.");
  return resData;
};

export const fetchDoctorPatients = async (search?: string, doctorId?: string) => {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (doctorId) params.append("doctorId", doctorId);
  const queryStr = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_URL}/doctor/patients${queryStr}`, { headers: getHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to fetch patients.");
  return data;
};

export const fetchDoctorPatientDetail = async (patientId: string) => {
  const res = await fetch(`${API_URL}/doctor/patients/${patientId}`, { headers: getHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to fetch patient detail file.");
  return data;
};

export const createConsultation = async (data: any) => {
  const res = await fetch(`${API_URL}/consultations`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  const resData = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(resData.error || "Failed to record consultation.");
  return resData;
};

export const updateConsultation = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/consultations/${id}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  const resData = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(resData.error || "Failed to update consultation.");
  return resData;
};

export const createDoctorPrescription = async (data: any) => {
  const res = await fetch(`${API_URL}/doctor/prescriptions`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  const resData = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(resData.error || "Failed to issue prescription.");
  return resData;
};

export const updateDoctorPrescription = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/doctor/prescriptions/${id}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  const resData = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(resData.error || "Failed to update prescription.");
  return resData;
};

export const fetchDoctorPrescriptionDetail = async (id: string) => {
  const res = await fetch(`${API_URL}/doctor/prescriptions/${id}`, { headers: getHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to fetch prescription document.");
  return data;
};

export const fetchDoctorProfile = async (doctorId?: string) => {
  const url = doctorId ? `${API_URL}/doctor/profile?doctorId=${encodeURIComponent(doctorId)}` : `${API_URL}/doctor/profile`;
  const res = await fetch(url, { headers: getHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to fetch doctor profile.");
  return data;
};

export const updateDoctorProfile = async (data: any) => {
  const res = await fetch(`${API_URL}/doctor/profile`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  const resData = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(resData.error || "Failed to update doctor profile.");
  return resData;
};



