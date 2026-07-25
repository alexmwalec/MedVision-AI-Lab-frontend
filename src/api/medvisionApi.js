const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000/api";

const parseJson = async (response) => {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
};

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const data = await parseJson(response);

  if (!response.ok) {
    throw new Error(data.message || data.error || "Backend request failed");
  }

  return data;
};

const apiUrl = (value) => {
  if (!value || /^https?:\/\//i.test(value)) {
    return value;
  }

  return `${API_BASE_URL}${value.startsWith("/") ? value : `/${value}`}`;
};

const normalizePatient = (patient) => ({
  ...patient,
  imageUrl: apiUrl(patient.imageUrl),
  heatmapUrl: apiUrl(patient.heatmapUrl)
});

const normalizeAnalysis = (analysis) => ({
  ...analysis,
  heatmapUrl: apiUrl(analysis.heatmapUrl),
  patient: analysis.patient ? normalizePatient(analysis.patient) : analysis.patient
});

export const analyzeCxr = async (payload) => {
  const body = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      body.append(key, value);
    }
  });

  const analysis = await request("/analyze_cxr", {
    method: "POST",
    body
  });

  return normalizeAnalysis(analysis);
};

export const getPatients = async () => {
  const response = await request("/patients");
  const patients = Array.isArray(response) ? response : response.patients || [];

  return {
    ...response,
    patients: patients.map(normalizePatient)
  };
};

export const requestRadiologistReview = (patientId) =>
  request("/feedback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      patientId,
      type: "radiologist_review_requested",
      status: "pending_consultation"
    })
  });

export const submitRadiologistFeedback = (payload) =>
  request("/feedback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
