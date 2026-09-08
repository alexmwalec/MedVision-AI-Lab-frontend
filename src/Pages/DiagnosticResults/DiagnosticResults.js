import { useEffect, useState } from "react";
import {
  User,
  Scan,
  AlertCircle,
  CheckCircle,
  Image as ImageIcon,
} from "lucide-react";
import {
  useNavigate,
  useLocation,
  useParams,
  Link,
} from "react-router-dom";
import { getPatient } from "../../api/medvisionApi";

const OHIF_URL =
  process.env.REACT_APP_OHIF_URL || "http://localhost:3001";

export default function DiagnosticResults() {
  const navigate = useNavigate();
  const location = useLocation();
  const { patientId } = useParams();

  const [patientData, setPatientData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadPatient = async () => {
      if (patientId) {
        try {
          const patient = await getPatient(patientId);

          if (!cancelled) {
            setPatientData({
              ...patient,

              // Support both the direct fields and nested DICOM metadata.
              sourceFormat:
                patient.sourceFormat ||
                patient.source_format ||
                patient.dicom?.source_format ||
                null,

              studyInstanceUID:
                patient.studyInstanceUID ||
                patient.study_instance_uid ||
                patient.dicom?.study_instance_uid ||
                null,
            });
          }
        } catch (error) {
          console.error(
            "Unable to load saved patient:",
            error
          );

          if (!cancelled) {
            setPatientData(
              location.state?.patientData || null
            );
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }

        return;
      }

      if (location.state?.patientData) {
        setPatientData(location.state.patientData);
        setLoading(false);
      } else if (
        location.state?.aiData &&
        location.state?.formData
      ) {
        const safeAiData = Array.isArray(
          location.state.aiData
        )
          ? location.state.aiData
          : [location.state.aiData];

        setPatientData({
          ...location.state.formData,
          aiFindings: safeAiData,
          heatmapUrl: location.state.heatmapUrl,
          sourceFormat:
            location.state.sourceFormat ||
            location.state.dicom?.source_format ||
            null,
          studyInstanceUID:
            location.state.studyInstanceUID ||
            location.state.dicom?.study_instance_uid ||
            null,
          dicom: location.state.dicom || null,
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

    if (typeof dateValue === "string") {
      if (
        dateValue.match(/^\d{4}-\d{2}-\d{2}$/)
      ) {
        return dateValue;
      }

      const parsedDate = new Date(dateValue);

      if (!isNaN(parsedDate.getTime())) {
        return parsedDate
          .toISOString()
          .split("T")[0];
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

  const studyInstanceUID =
    patientData.studyInstanceUID ||
    patientData.study_instance_uid ||
    patientData.dicom?.study_instance_uid ||
    null;

  const isDicom =
    String(
      patientData.sourceFormat ||
        patientData.source_format ||
        ""
    ).toLowerCase() === "dicom" ||
    Boolean(studyInstanceUID);

  const dicomViewerUrl = studyInstanceUID
    ? `${OHIF_URL}/viewer?StudyInstanceUIDs=${encodeURIComponent(
        studyInstanceUID
      )}`
    : `${OHIF_URL}/`;

  const hasNotableFindings =
    Array.isArray(patientData.aiFindings) &&
    patientData.aiFindings.some(
      (f) => f.name !== "No Significant Findings"
    );

  return (
    <div className="min-h-screen bg-cyan-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-white">
                MedVision AI
              </h1>
            </div>

            <nav className="flex space-x-8">
              <Link
                to="/"
                className="text-gray-300 hover:text-white font-medium px-3 py-2"
              >
                Uploads
              </Link>

              <button className="text-green-400 font-semibold border-b-2 border-green-400 px-3 py-2">
                Diagnostic Analysis
              </button>

              <Link
                to="/consult"
                className="text-gray-300 hover:text-white font-medium px-3 py-2"
              >
                History
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* =====================================================
              LEFT COLUMN
          ====================================================== */}
          <div className="lg:col-span-2 space-y-6">

            {/* ===================================================
                DICOM / IMAGE VIEWER
            ==================================================== */}
            <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">

              <div className="flex items-center justify-between mb-4">

                <div className="flex items-center">
                  <Scan className="h-5 w-5 text-green-400 mr-2" />

                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      {isDicom
                        ? "DICOM Diagnostic Viewer"
                        : "Scanned Image"}
                    </h2>

                    {isDicom && (
                      <p className="text-xs text-gray-400 mt-1">
                        OHIF Viewer • Orthanc DICOMweb
                      </p>
                    )}
                  </div>
                </div>

              </div>

              {/* =================================================
                  DICOM VIEW
              ================================================== */}

              {isDicom ? (
                <div className="w-full h-[700px] bg-black rounded-xl overflow-hidden border-2 border-gray-600">

                  <iframe
                    title="MedVision DICOM Viewer"
                    src={dicomViewerUrl}
                    className="w-full h-full border-0"
                    allow="fullscreen"
                  />

                </div>
              ) : originalSrc ? (
                <div className="flex justify-center">
                  <img
                    src={originalSrc}
                    alt="Uploaded scan"
                    className="rounded-xl w-full max-h-[700px] object-contain border-2 border-gray-600"
                  />
                </div>
              ) : (
                <div className="h-[500px] flex items-center justify-center bg-gray-900 rounded-xl border-2 border-gray-700">
                  <p className="text-gray-400">
                    No image available
                  </p>
                </div>
              )}

              {/* =================================================
                  DICOM INFORMATION
              ================================================== */}

              {isDicom && (
                <div className="mt-4 bg-gray-900 border border-gray-700 rounded-xl p-4">

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">

                    <div>
                      <span className="text-gray-500">
                        Format
                      </span>

                      <p className="text-gray-200 font-medium">
                        DICOM
                      </p>
                    </div>

                    {patientData.dicom?.modality && (
                      <div>
                        <span className="text-gray-500">
                          Modality
                        </span>

                        <p className="text-gray-200 font-medium">
                          {patientData.dicom.modality}
                        </p>
                      </div>
                    )}

                    {patientData.dicom?.rows && (
                      <div>
                        <span className="text-gray-500">
                          Dimensions
                        </span>

                        <p className="text-gray-200 font-medium">
                          {patientData.dicom.rows} ×{" "}
                          {patientData.dicom.columns}
                        </p>
                      </div>
                    )}

                    {patientData.dicom?.number_of_frames && (
                      <div>
                        <span className="text-gray-500">
                          Frames
                        </span>

                        <p className="text-gray-200 font-medium">
                          {
                            patientData.dicom
                              .number_of_frames
                          }
                        </p>
                      </div>
                    )}

                    {studyInstanceUID && (
                      <div className="md:col-span-2">
                        <span className="text-gray-500">
                          Study Instance UID
                        </span>

                        <p className="text-gray-300 font-mono break-all">
                          {studyInstanceUID}
                        </p>
                      </div>
                    )}

                    {patientData.dicom
                      ?.series_instance_uid && (
                      <div className="md:col-span-2">
                        <span className="text-gray-500">
                          Series Instance UID
                        </span>

                        <p className="text-gray-300 font-mono break-all">
                          {
                            patientData.dicom
                              .series_instance_uid
                          }
                        </p>
                      </div>
                    )}

                  </div>

                </div>
              )}

              {/* =================================================
                  EXISTING AI HEATMAP
              ================================================== */}

              {!isDicom &&
                patientData.heatmapUrl &&
                hasNotableFindings && (
                  <div className="mt-5">

                    <div className="flex items-center mb-3">
                      <Flame className="h-4 w-4 text-orange-400 mr-2" />

                      <span className="text-sm font-semibold text-white">
                        AI Heatmap
                      </span>
                    </div>

                    <img
                      src={patientData.heatmapUrl}
                      alt="AI Grad-CAM heatmap"
                      className="rounded-xl w-full border border-gray-700"
                    />

                  </div>
                )}

              {/* Scan details */}
              <div className="text-center space-y-2 mt-5">
                <p className="text-white font-medium">
                  {patientData.scanType}
                </p>

                <p className="text-gray-400 text-sm">
                  Uploaded:{" "}
                  {formatDate(patientData.date)}
                </p>
              </div>

            </div>

            {/* =====================================================
                PATIENT INFORMATION
            ====================================================== */}

            <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">

              <div className="flex items-center mb-4">
                <User className="h-5 w-5 text-green-400 mr-2" />

                <h2 className="text-lg font-semibold text-white">
                  Patient Information
                </h2>
              </div>

              <div className="space-y-3 text-sm">

                {Object.entries({
                  Name: patientData.name,
                  "Patient ID": patientData.patientId,
                  Age: patientData.age,
                  Gender: patientData.gender,
                  "Scan Type": patientData.scanType,
                  "Date Processed":
                    formatDate(patientData.date),
                }).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between border-b border-gray-700 pb-2"
                  >
                    <span className="text-gray-400">
                      {key}:
                    </span>

                    <span className="text-white font-medium">
                      {value || "N/A"}
                    </span>
                  </div>
                ))}

              </div>
            </div>

          </div>

          {/* =====================================================
              RIGHT COLUMN
          ====================================================== */}

          <div className="lg:col-span-1 space-y-6">

            {/* AI Findings */}
            <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">

              <div className="flex items-center mb-6">
                <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />

                <h2 className="text-lg font-semibold text-white">
                  AI Diagnostic Findings
                </h2>
              </div>

              <div className="space-y-4">

                {patientData.aiFindings &&
                patientData.aiFindings.length > 0 ? (
                  patientData.aiFindings.map(
                    (finding, index) => (
                      <div
                        key={index}
                        className="bg-gray-700 rounded-xl p-4 border-l-4"
                        style={{
                          borderColor:
                            finding.color ||
                            "#6B7280",
                        }}
                      >
                        <div className="flex justify-between items-center mb-2">

                          <span className="text-white font-medium">
                            {finding.name ||
                              "Unknown"}
                          </span>

                          <span className="font-bold text-lg text-white">
                            {finding.probability !=
                            null
                              ? `${finding.probability}%`
                              : "N/A"}
                          </span>

                        </div>

                        <div className="w-full bg-gray-600 rounded-full h-2">

                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${
                                finding.probability ||
                                0
                              }%`,
                              backgroundColor:
                                finding.color ||
                                "#6B7280",
                            }}
                          />

                        </div>

                        <p className="text-gray-300 text-sm mt-2">
                          {finding.description ||
                            "No description available"}
                        </p>

                      </div>
                    )
                  )
                ) : (
                  <p className="text-gray-400">
                    No AI findings available yet.
                  </p>
                )}

              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">

              <div className="flex items-center mb-6">
                <CheckCircle className="h-5 w-5 text-green-400 mr-2" />

                <h2 className="text-lg font-semibold text-white">
                  Clinical Recommendations
                </h2>
              </div>

              {patientData.aiFindings &&
              patientData.aiFindings.length > 0 ? (
                patientData.aiFindings.map(
                  (finding, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-700 rounded-xl p-4 mb-3"
                    >

                      <h3 className="text-white font-semibold mb-2">
                        {finding.name ||
                          "Unknown"}
                      </h3>

                      <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">

                        {finding.recommendations &&
                        finding.recommendations.length >
                          0 ? (
                          finding.recommendations.map(
                            (rec, i) => (
                              <li key={i}>
                                {rec}
                              </li>
                            )
                          )
                        ) : (
                          <li>
                            No recommendations
                            available.
                          </li>
                        )}

                      </ul>

                    </div>
                  )
                )
              ) : (
                <p className="text-gray-400">
                  No recommendations available yet.
                </p>
              )}

            </div>

          </div>

        </div>
      </div>
    </div>
  );
}