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

export const fetchNotifications = async () => {
  const res = await fetch(`${API_URL}/notifications`, {
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
