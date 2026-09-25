import { useEffect, useRef, useState } from "react";
import { User, Scan, AlertCircle, CheckCircle, Flame, Image as ImageIcon, Maximize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useNavigate, useLocation, useParams, Link } from "react-router-dom";
import { getPatient } from "../../api/medvisionApi";

const diseaseRecommendations = {
  pneumonia: ["Correlate with symptoms and oxygen saturation.", "Arrange clinician or radiologist review and follow-up imaging when indicated."],
  tuberculosis: ["Assess symptoms and exposure history and obtain appropriate microbiological testing.", "Refer to a TB-capable clinician or service for confirmatory evaluation."],
  "pleural effusion": ["Assess respiratory status and the clinical cause.", "Consider clinician-directed ultrasound or further imaging."],
  pneumothorax: ["Seek urgent clinical assessment, especially with chest pain or breathlessness.", "Confirm and manage according to local emergency protocol."],
  cardiomegaly: ["Correlate with cardiac history, examination, and prior imaging.", "Consider cardiovascular assessment if new or symptomatic."],
  edema: ["Assess for breathlessness, fluid overload, and cardiac or renal symptoms.", "Prompt clinician review is recommended."],
  nodule: ["Compare with prior imaging and obtain radiologist review.", "Follow local pulmonary nodule guidance for further imaging or referral."],
  mass: ["Prompt radiologist and treating-clinician review is recommended.", "Compare with prior studies and arrange appropriate diagnostic follow-up."],
  fracture: ["Assess pain, function, and neurovascular status as clinically appropriate.", "Arrange clinician or orthopedic review for confirmation and management."],
  "no significant findings": ["No urgent action is suggested by this AI result alone.", "Continue clinical assessment if symptoms persist or worsen."]
};

const recommendationsFor = (finding) => {
  if (Array.isArray(finding.recommendations) && finding.recommendations.length) return finding.recommendations;
  const condition = (finding.name || "").toLowerCase();
  const key = Object.keys(diseaseRecommendations).find((name) => condition.includes(name));
  return key ? diseaseRecommendations[key] : ["Review this finding in the context of the patient symptoms and history.", "Have a qualified clinician or radiologist confirm the result and determine follow-up."];
};

export default function DiagnosticResults() {
  const navigate = useNavigate();
  const location = useLocation();
  const { patientId } = useParams();
  const viewerRef = useRef(null);

  const [patientData, setPatientData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState("original");
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    let cancelled = false;

    const loadPatient = async () => {
      if (patientId) {
        try {
          const patient = await getPatient(patientId);
          if (!cancelled) setPatientData({ ...location.state?.formData, ...patient, image: patient.image || location.state?.formData?.image, imageUrl: patient.imageUrl || location.state?.formData?.imageUrl, heatmapUrl: patient.heatmapUrl || location.state?.heatmapUrl, aiFindings: patient.aiFindings?.length ? patient.aiFindings : (location.state?.aiData || []) });
        } catch (error) {
          console.error("Unable to load saved patient:", error);
          if (!cancelled) setPatientData(location.state?.patientData || null);
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }

    if (location.state?.patientData) {
      setPatientData(location.state.patientData);
      setLoading(false);
    } else if (location.state?.aiData && location.state?.formData) {
      const safeAiData = Array.isArray(location.state.aiData)
        ? location.state.aiData
        : [location.state.aiData];

      setPatientData({
        ...location.state.formData,
        aiFindings: safeAiData,
        heatmapUrl: location.state.heatmapUrl
      });
      setLoading(false);
    } else {
      navigate("/");
    }
    };

    loadPatient();
    return () => {
      cancelled = true;
    };
  }, [patientId, location.state, navigate]);

  const formatDate = (dateValue) => {
    if (!dateValue) return "N/A";

    if (typeof dateValue === 'string') {
      if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateValue;
      }

      const parsedDate = new Date(dateValue);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString().split('T')[0];
      }

      return dateValue;
    }

    return dateValue;
  };

  if (loading || !patientData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cyan-900 text-white text-lg">
        Loading results...
      </div>
    );
  }

  const originalSrc = patientData.image
    ? URL.createObjectURL(patientData.image)
    : patientData.imageUrl || null;

  const hasHeatmap = Boolean(patientData.heatmapUrl);
  const showingHeatmap = activeView === "heatmap" && hasHeatmap;
  const activeSrc = showingHeatmap ? patientData.heatmapUrl : originalSrc;
  const adjustZoom = (amount) => setZoom((current) => Math.max(0.75, Math.min(1.75, +(current + amount).toFixed(2))));

  const hasNotableFindings =
    patientData.aiFindings &&
    patientData.aiFindings.some((f) => f.name !== "No Significant Findings");

  return (
    <div className="min-h-screen bg-cyan-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-white">MedVision AI</h1>
            </div>
            <nav className="flex space-x-8">
              <Link to="/" className="text-gray-300 hover:text-white font-medium px-3 py-2">
                Uploads
              </Link>
              <button className="text-green-400 font-semibold border-b-2 px-3 py-2">
                Diagnostic Analysis
              </button>
              <Link to="/consult" className="text-gray-300 hover:text-white font-medium px-3 py-2">
                History
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column - Image & Patient Info */}
          <div className="lg:col-span-2 space-y-6">

            {/* Scanned Image */}
            <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Scan className="h-5 w-5 text-green-400 mr-2" />
                  <h2 className="text-lg font-semibold text-white">Scanned Image</h2>
                </div>

                {hasHeatmap && (
                  <div className="flex bg-gray-700 rounded-lg p-1 text-xs font-medium">
                    <button
                      onClick={() => setActiveView("heatmap")}
                      className={`flex items-center px-3 py-1.5 rounded-md transition-colors ${
                        showingHeatmap ? "bg-green-500 text-white" : "text-gray-300 hover:text-white"
                      }`}
                    >
                      <Flame className="h-3.5 w-3.5 mr-1" />
                      Heatmap
                    </button>
                    <button
                      onClick={() => setActiveView("original")}
                      className={`flex items-center px-3 py-1.5 rounded-md transition-colors ${
                        !showingHeatmap ? "bg-green-500 text-white" : "text-gray-300 hover:text-white"
                      }`}
                    >
                      <ImageIcon className="h-3.5 w-3.5 mr-1" />
                      Original
                    </button>
                  </div>
                )}
              </div>

              <div ref={viewerRef} className="mb-3 overflow-hidden rounded-xl border border-slate-600 bg-black shadow-2xl shadow-black/40">
                <div className="flex items-center justify-between border-b border-slate-700 bg-slate-900 px-3 py-2">
                  <div className="flex items-center gap-2 text-xs text-slate-300"><span className="grid h-6 w-6 place-items-center rounded bg-cyan-400/15 text-cyan-300"><Scan size={14}/></span><span className="font-medium">{patientData.scanType || "XR CHEST"}</span><span className="hidden text-slate-500 sm:inline">• Frontal study</span></div>
                  <div className="flex items-center gap-1"><button onClick={() => adjustZoom(-0.1)} aria-label="Zoom out" className="rounded p-1.5 text-slate-300 hover:bg-slate-700"><ZoomOut size={16}/></button><span className="w-10 text-center text-xs text-slate-400">{Math.round(zoom * 100)}%</span><button onClick={() => adjustZoom(0.1)} aria-label="Zoom in" className="rounded p-1.5 text-slate-300 hover:bg-slate-700"><ZoomIn size={16}/></button><button onClick={() => setZoom(1)} aria-label="Reset zoom" className="rounded p-1.5 text-slate-300 hover:bg-slate-700"><RotateCcw size={15}/></button><button onClick={() => viewerRef.current?.requestFullscreen?.()} aria-label="Fullscreen viewer" className="rounded p-1.5 text-slate-300 hover:bg-slate-700"><Maximize2 size={15}/></button></div>
                </div>
                <div className="grid min-h-[620px] grid-cols-[88px_minmax(0,1fr)]">
                  <aside className="border-r border-slate-700 bg-slate-900 p-2"><p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Series</p><button onClick={() => setActiveView("original")} className={`w-full rounded border p-1 transition ${showingHeatmap === false ? "border-cyan-400 bg-cyan-400/10" : "border-transparent hover:border-slate-600"}`}>{originalSrc ? <img src={originalSrc} alt="Original scan thumbnail" className="h-20 w-full rounded object-cover"/> : <ImageIcon className="mx-auto h-8 w-8 text-slate-500"/>}<span className="mt-1 block text-[10px] text-slate-300">Original</span></button>{hasHeatmap && <button onClick={() => setActiveView("heatmap")} className={`mt-2 w-full rounded border p-1 transition ${showingHeatmap ? "border-orange-400 bg-orange-400/10" : "border-transparent hover:border-slate-600"}`}><Flame className="mx-auto h-5 w-5 text-orange-400"/><span className="mt-1 block text-[10px] text-slate-300">Heatmap</span></button>}</aside>
                  <div className="relative flex min-w-0 items-center justify-center overflow-hidden bg-black">{activeSrc ? <img src={activeSrc} alt={showingHeatmap ? "Backend-generated diagnostic heatmap" : "Uploaded scan"} className="max-h-[610px] max-w-full object-contain transition-transform duration-200" style={{ transform: `scale(${zoom})` }}/> : <p className="text-sm text-slate-500">No image available</p>}<span className="absolute left-4 top-4 rounded bg-black/70 px-2 py-1 font-mono text-xs text-cyan-100">R</span><span className="absolute right-4 top-4 rounded bg-black/70 px-2 py-1 text-[10px] text-slate-300">{showingHeatmap ? "AI HEATMAP" : "UPLOADED STUDY"}</span><span className="absolute bottom-4 right-4 text-[10px] text-slate-400">{patientData.name || "Patient"} · {formatDate(patientData.date)}</span></div>
                </div>
              </div>

              {showingHeatmap && (
                <div className="mb-4">
                  {hasNotableFindings ? (
                    <>
                      <p className="text-gray-400 text-xs mb-2">
                        Each color marks a distinct detected condition; box intensity reflects the
                        model's confidence.
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-300">
                        {patientData.aiFindings
                          .filter((f) => f.name !== "No Significant Findings")
                          .map((f, i) => (
                            <span key={i} className="flex items-center">
                              <span
                                className="w-3 h-3 rounded-full mr-1.5"
                                style={{ backgroundColor: f.color || "#6B7280" }}
                              />
                              {f.name} ({f.probability}%)
                            </span>
                          ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-400 text-xs">
                      No regions of concern were highlighted for this scan.
                    </p>
                  )}
                </div>
              )}

              <div className="text-center space-y-2">
                <p className="text-white font-medium">{patientData.scanType}</p>
                <p className="text-gray-400 text-sm">Uploaded: {formatDate(patientData.date)}</p>
              </div>
            </div>

            {/* Patient Information */}
            <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center mb-4">
                <User className="h-5 w-5 text-green-400 mr-2" />
                <h2 className="text-lg font-semibold text-white">Patient Information</h2>
              </div>
              <div className="space-y-3 text-sm">
                {Object.entries({
                  Name: patientData.name,
                  "Patient ID": patientData.patientId,
                  Age: patientData.age,
                  Gender: patientData.gender,
                  "Scan Type": patientData.scanType,
                  "Date Processed": formatDate(patientData.date)
                }).map(([key, value]) => (
                  <div key={key} className="flex justify-between border-b border-gray-700 pb-2">
                    <span className="text-gray-400">{key}:</span>
                    <span className="text-white font-medium">{value || "N/A"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - AI Results */}
          <div className="lg:col-span-1 space-y-6">

            {/* AI Findings */}
            <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center mb-6">
                <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
                <h2 className="text-lg font-semibold text-white">AI Diagnostic Findings</h2>
              </div>

              <div className="space-y-4">
                {patientData.aiFindings && patientData.aiFindings.length > 0 ? (
                  patientData.aiFindings.map((finding, index) => (
                    <div key={index} className={`bg-gray-700 rounded-xl p-4 border-l-4`} style={{ borderColor: finding.color || "#6B7280" }}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white font-medium">{finding.name || "Unknown"}</span>
                        <span className="font-bold text-lg">{finding.probability != null ? `${finding.probability}%` : "N/A"}</span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-2">
                        <div className="h-2 rounded-full" style={{ width: `${finding.probability || 0}%`, backgroundColor: finding.color || "#6B7280" }}></div>
                      </div>
                      <p className="text-gray-300 text-sm mt-2">{finding.description || "No description available"}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400">No AI findings available yet.</p>
                )}
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center mb-6">
                <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                <h2 className="text-lg font-semibold text-white">Clinical Recommendations</h2>
              </div>

              {patientData.aiFindings && patientData.aiFindings.length > 0 ? (
                patientData.aiFindings.map((finding, idx) => (
                  <div key={idx} className="bg-gray-700 rounded-xl p-4 mb-3">
                    <h3 className="text-white font-semibold mb-2">{finding.name || "Unknown"}</h3>
                    <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
                      {recommendationsFor(finding).length > 0 ? (
                        recommendationsFor(finding).map((rec, i) => <li key={i}>{rec}</li>)
                      ) : (
                        <li>No recommendations available.</li>
                      )}
                    </ul>
                  </div>
                ))
              ) : (
                <p className="text-gray-400">No recommendations available yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}