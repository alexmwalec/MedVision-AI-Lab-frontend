const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "http://localhost:8000/api").replace(/\/$/, "");
const API_ORIGIN = API_BASE_URL.replace(/\/api$/, "");

const parseJson = async (response) => {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
};

const request = async (path, options = {}) => {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, options);
  } catch {
    throw new Error(`Unable to reach the API at ${API_BASE_URL}. Ensure the backend is running and allows this frontend origin.`);
  }

  const data = await parseJson(response);

  if (!response.ok) {
    throw new Error(data.message || data.error || "Backend request failed");
  }

  return data;
};

const normalizeFinding = (finding) => {
  const score = finding.probability ?? finding.score ?? 0;
  const probability = score <= 1 ? Math.round(score * 10000) / 100 : score;

  return {
    ...finding,
    name: finding.name || finding.disease || "Unknown",
    probability,
    recommendations: finding.recommendations || []
  };
};

const apiUrl = (value) => {
  if (!value || /^https?:\/\//i.test(value)) {
    return value;
  }

  return `${API_ORIGIN}${value.startsWith("/") ? value : `/${value}`}`;
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

  // The inference route expects these names (rather than the legacy
  // /analyze_cxr fields). Keep the page model independent from that API.
  body.append("xray", payload.image);
  body.append("externalPatientId", payload.patientId);
  body.append("patientName", payload.name);
  body.append("age", payload.age);
  body.append("gender", payload.gender);
  body.append("scanDate", payload.date);
  body.append("scanType", payload.scanType);
  body.append("clinicalSymptoms", payload.clinicalSymptoms || "");
  body.append("clinicalHistory", payload.clinicalHistory || "");

  const analysis = await request("/predict", {
    method: "POST",
    body
  });

  return normalizeAnalysis({
    ...analysis,
    // The current inference response returns a server filesystem path for
    // heatmapPath, which is not safe or reachable from a browser. Only use a
    // URL explicitly exposed by the backend.
    heatmapUrl: analysis.heatmapUrl,
    patient: analysis.patient || {
      id: analysis.patientId,
      patientId: payload.patientId,
      name: payload.name,
      age: payload.age,
      gender: payload.gender,
      scanType: payload.scanType,
      date: payload.date
    },
    aiFindings: (analysis.patient?.aiFindings || analysis.aiFindings || analysis.findings || []).map(normalizeFinding)
  });
};

export const getPatients = async () => {
  const response = await request("/patients");
  const patients = Array.isArray(response) ? response : response.patients || [];

  return {
    ...response,
    patients: patients.map(normalizePatient)
  };
};

export const getPatient = async (patientId) => {
  const response = await request(`/patients/${patientId}`);
  const patient = response.patient || response;

  return {
    ...normalizePatient(patient),
    aiFindings: (patient.aiFindings || []).map(normalizeFinding)
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
