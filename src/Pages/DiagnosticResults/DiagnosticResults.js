import { useEffect, useState } from "react";
import { FileText, User, Scan, AlertCircle, CheckCircle, Download, MessageCircle } from "lucide-react";
import { useNavigate, useLocation, Link } from "react-router-dom";
 
export default function DiagnosticResults() {
  const navigate = useNavigate();
  const location = useLocation();

  const [patientData, setPatientData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, [location.state, navigate]);

  const handleSpecialistConsult = async () => {
    navigate("/consult");
  };

  if (loading || !patientData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cyan-900 text-white text-lg">
        Loading results...
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-cyan-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="bg-green-500 p-2 rounded-lg mr-3">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white">MedVision AI Lab</h1>
            </div>
            <nav className="flex space-x-8">
              <Link to="/" className="text-gray-300 hover:text-white font-medium px-3 py-2">
                Uploads
              </Link>
              <button className="text-green-400 font-semibold border-b-2 px-3 py-2">
                Diagnostic Analysis
              </button>
              <Link to="/consult" className="text-gray-300 hover:text-white font-medium px-3 py-2">
                Consult
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column - Image & Patient Info */}
          <div className="lg:col-span-1 space-y-6">

            {/* Scanned Image */}
            <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center mb-4">
                <Scan className="h-5 w-5 text-green-400 mr-2" />
                <h2 className="text-lg font-semibold text-white">Scanned Image</h2>
              </div>
              <div className="flex justify-center mb-4">
                {patientData.image ? (
                  <img 
                    src={URL.createObjectURL(patientData.image)} 
                    alt="Uploaded Scan" 
                    className="rounded-xl w-full border-2 border-gray-600"
                  />
                ) : patientData.imageUrl ? (
                  <img
                    src={patientData.imageUrl}
                    alt="Uploaded Scan"
                    className="rounded-xl w-full border-2 border-gray-600"
                  />
                ) : (
                  <p className="text-gray-400">No image available</p>
                )}
              </div>
              {patientData.heatmapUrl && (
                <div className="mt-4">
                  <p className="text-gray-400 text-sm mb-2">Grad-CAM Heatmap</p>
                  <img
                    src={patientData.heatmapUrl}
                    alt="AI heatmap"
                    className="rounded-xl w-full border-2 border-gray-600"
                  />
                </div>
              )}
              <div className="text-center space-y-2">
                <p className="text-white font-medium">{patientData.scanType}</p>
                <p className="text-gray-400 text-sm">Uploaded: {patientData.date}</p>
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
                  "Date Processed": patientData.date
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
          <div className="lg:col-span-2 space-y-6">

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
                      {finding.recommendations && finding.recommendations.length > 0 ? (
                        finding.recommendations.map((rec, i) => <li key={i}>{rec}</li>)
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

            {/* Actions */}
            <div className="flex space-x-4">
              <button className="flex-1 bg-green-500 text-white py-3 rounded-xl font-semibold hover:bg-green-600 transition-colors duration-200 flex items-center justify-center">
                <Download className="h-5 w-5 mr-2" />
                Download Report
              </button>

              {/* Specialist Consult */}
              <button 
                onClick={handleSpecialistConsult}
                className="flex-1 bg-blue-500 text-white py-3 rounded-xl font-semibold hover:bg-blue-600 transition-colors duration-200 flex items-center justify-center"
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                Specialist Consult
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
