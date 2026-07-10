import { FileText, User, MessageCircle, Download, CheckCircle, X, Clock, AlertTriangle, Stethoscope, Camera } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { submitRadiologistFeedback } from "../../api/medvisionApi";

export default function RadiologistConsultation() {
  const navigate = useNavigate();
  const { patientId } = useParams();
  const [consultationNotes, setConsultationNotes] = useState("");
  const [selectedFindings, setSelectedFindings] = useState([]);
  const [confidenceLevel, setConfidenceLevel] = useState("high");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock patient data - in real app, this would come from API
  const patientData = {
    id: 1,
    name: "Angela Chiwaya",
    patientId: "OPQ5-WRT1",
    age: "38",
    gender: "Female",
    date: "05-Oct-2025, 09:45",
    scan: "Chest X-ray",
    image: "/xray-sample-1.jpg",
    symptoms: "Fever, cough, shortness of breath for 3 days",
    clinicalHistory: "No significant past medical history. Non-smoker.",
    vitalSigns: {
      temperature: "38.5°C",
      bloodPressure: "130/85 mmHg",
      heartRate: "95 bpm",
      oxygenSaturation: "92%"
    },
    aiFindings: {
      primaryFinding: "Pneumonia",
      confidence: "80%",
      findings: [
        "Consolidation in right lower lobe",
        "Air bronchograms present",
        "Minor pleural effusion"
      ],
      recommendations: [
        "Antibiotic therapy recommended",
        "Chest X-ray follow-up in 48-72 hours",
        "Monitor oxygen saturation"
      ]
    }
  };

  const possibleFindings = [
    { id: 1, name: "Pneumonia", confirmed: true },
    { id: 2, name: "Bronchitis", confirmed: false },
   
    { id: 4, name: "Tuberculosis", confirmed: false },
    { id: 5, name: "Lung Cancer", confirmed: false },
    { id: 6, name: "Pleural Effusion", confirmed: true },
    { id: 7, name: "Normal Variant", confirmed: false }
  ];

  const handleFindingToggle = (findingId) => {
    setSelectedFindings(prev => 
      prev.includes(findingId) 
        ? prev.filter(id => id !== findingId)
        : [...prev, findingId]
    );
  };

  const handleSubmitConsultation = async () => {
    setIsSubmitting(true);
    try {
      await submitRadiologistFeedback({
        patientId: patientId || patientData.id,
        consultationNotes,
        selectedFindings,
        confidenceLevel,
        type: "radiologist_consultation"
      });
      navigate("/consult");
    } catch (error) {
      console.error("Error submitting radiologist feedback:", error);
      alert("Error submitting consultation. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-cyan-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left Side - Brand */}
            <div className="flex items-center">
              <div className="bg-green-500 p-2 rounded-lg mr-3">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white">MedVision AI Lab</h1>
            </div>

            {/* Navigation */}
            <nav className="flex space-x-8">
              <button 
                onClick={() => navigate("/")}
                className="text-gray-300 hover:text-white font-medium px-3 py-2"
              >
                Uploads
              </button>
              <button 
                onClick={() => navigate("/results")}
                className="text-gray-300 hover:text-white font-medium px-3 py-2"
              >
                Diagnostic Analysis
              </button>
              <button 
                onClick={() => navigate("/consult")}
                className="text-green-400 font-semibold border-b-2 border-green-400 px-3 py-2"
              >
                Consult
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column - Patient Info & Scan */}
          <div className="lg:col-span-1 space-y-6">
            {/* Patient Information */}
            <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center mb-4">
                <User className="h-5 w-5 text-green-400 mr-2" />
                <h2 className="text-lg font-semibold text-white">Patient Information</h2>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-gray-700 pb-2">
                  <span className="text-gray-400">Name:</span>
                  <span className="text-white font-medium">{patientData.name}</span>
                </div>
                <div className="flex justify-between border-b border-gray-700 pb-2">
                  <span className="text-gray-400">Patient ID:</span>
                  <span className="text-white font-medium">{patientData.patientId}</span>
                </div>
                <div className="flex justify-between border-b border-gray-700 pb-2">
                  <span className="text-gray-400">Age & Gender:</span>
                  <span className="text-white font-medium">{patientData.age} yrs • {patientData.gender}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Scan Date:</span>
                  <span className="text-white font-medium">{patientData.date}</span>
                </div>
              </div>

              {/* Clinical Information */}
              <div className="mt-6 pt-4 border-t border-gray-700">
                <h3 className="text-white font-semibold mb-3">Clinical Presentation</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-400">Symptoms: </span>
                    <span className="text-white">{patientData.symptoms}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">History: </span>
                    <span className="text-white">{patientData.clinicalHistory}</span>
                  </div>
                </div>
              </div>

              {/* Vital Signs */}
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-700 rounded p-2 text-center">
                  <div className="text-gray-400">Temp</div>
                  <div className="text-white font-semibold">{patientData.vitalSigns.temperature}</div>
                </div>
                <div className="bg-gray-700 rounded p-2 text-center">
                  <div className="text-gray-400">BP</div>
                  <div className="text-white font-semibold">{patientData.vitalSigns.bloodPressure}</div>
                </div>
                <div className="bg-gray-700 rounded p-2 text-center">
                  <div className="text-gray-400">HR</div>
                  <div className="text-white font-semibold">{patientData.vitalSigns.heartRate}</div>
                </div>
                <div className="bg-gray-700 rounded p-2 text-center">
                  <div className="text-gray-400">SpO2</div>
                  <div className="text-white font-semibold">{patientData.vitalSigns.oxygenSaturation}</div>
                </div>
              </div>
            </div>

            {/* Scan Image */}
            <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center mb-4">
                <Camera className="h-5 w-5 text-blue-400 mr-2" />
                <h2 className="text-lg font-semibold text-white">Scan Image</h2>
              </div>
              
              <div className="flex justify-center mb-4">
                <img 
                  src={patientData.image} 
                  alt="Patient Scan" 
                  className="rounded-xl w-full border-2 border-gray-600 max-h-80 object-contain"
                />
              </div>
              
              <div className="text-center space-y-2">
                <p className="text-white font-medium">{patientData.scan}</p>
                <p className="text-gray-400 text-sm">Uploaded: {patientData.date}</p>
                <div className="flex justify-center space-x-2 mt-3">
                
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Consultation Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Findings Reference */}
            <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center mb-6">
                <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
                <h2 className="text-lg font-semibold text-white">AI Preliminary Findings</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-700 rounded-xl p-4">
                  <h3 className="text-green-400 font-semibold mb-3">Primary Finding</h3>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{patientData.aiFindings.primaryFinding}</span>
                    <span className="text-green-400 font-bold">{patientData.aiFindings.confidence}</span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div 
                      className="bg-green-400 h-2 rounded-full" 
                      style={{ width: patientData.aiFindings.confidence }}
                    ></div>
                  </div>
                </div>

                <div className="bg-gray-700 rounded-xl p-4">
                  <h3 className="text-blue-400 font-semibold mb-3">Key Observations</h3>
                  <ul className="text-sm text-gray-300 space-y-1">
                    {patientData.aiFindings.findings.map((finding, index) => (
                      <li key={index}>• {finding}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Radiologist Assessment */}
            <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center mb-6">
                <Stethoscope className="h-5 w-5 text-blue-400 mr-2" />
                <h2 className="text-lg font-semibold text-white">Radiologist Assessment</h2>
              </div>

              {/* Findings Selection */}
              <div className="mb-6">
                <h3 className="text-white font-semibold mb-3">Select Confirmed Findings</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {possibleFindings.map((finding) => (
                    <button
                      key={finding.id}
                      onClick={() => handleFindingToggle(finding.id)}
                      className={`p-2 rounded-lg border text-sm transition-colors ${
                        selectedFindings.includes(finding.id)
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-blue-400'
                      } ${finding.confirmed ? 'border-green-400' : ''}`}
                    >
                      {finding.name}
                      {finding.confirmed && (
                        <CheckCircle className="h-3 w-3 text-green-400 inline ml-1" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Confidence Level */}
              <div className="mb-6">
                <h3 className="text-white font-semibold mb-3">Diagnostic Confidence</h3>
                <div className="grid grid-cols-3 gap-2">
                  {['low', 'medium', 'high'].map((level) => (
                    <button
                      key={level}
                      onClick={() => setConfidenceLevel(level)}
                      className={`p-3 rounded-lg border text-sm font-medium capitalize ${
                        confidenceLevel === level
                          ? level === 'high' ? 'bg-green-500 border-green-500 text-white'
                            : level === 'medium' ? 'bg-yellow-500 border-yellow-500 text-white'
                            : 'bg-red-500 border-red-500 text-white'
                          : 'bg-gray-700 border-gray-600 text-gray-300'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Consultation Notes */}
              <div className="mb-6">
                <h3 className="text-white font-semibold mb-3">Consultation Notes</h3>
                <textarea
                  value={consultationNotes}
                  onChange={(e) => setConsultationNotes(e.target.value)}
                  placeholder="Enter detailed assessment, differential diagnosis, and recommendations..."
                  className="w-full h-32 bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:border-blue-400 focus:outline-none resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={handleSubmitConsultation}
                  disabled={isSubmitting}
                  className="flex-1 bg-green-500 text-white py-3 rounded-xl font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <Clock className="h-5 w-5 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Submit Consultation
                    </>
                  )}
                </button>
                <button
                  onClick={() => navigate("/consult")}
                  className="flex-1 bg-gray-600 text-white py-3 rounded-xl font-semibold hover:bg-gray-700 transition-colors flex items-center justify-center"
                >
                  <X className="h-5 w-5 mr-2" />
                  Cancel
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">
              <h3 className="text-white font-semibold mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button className="bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 transition-colors flex flex-col items-center">
                  <MessageCircle className="h-6 w-6 mb-2" />
                  <span className="text-sm">Message</span>
                </button>
                <button className="bg-purple-500 text-white p-3 rounded-lg hover:bg-purple-600 transition-colors flex flex-col items-center">
                  <Download className="h-6 w-6 mb-2" />
                  <span className="text-sm">Export</span>
                </button>
            
                <button className="bg-gray-600 text-white p-3 rounded-lg hover:bg-gray-700 transition-colors flex flex-col items-center">
                  <FileText className="h-6 w-6 mb-2" />
                  <span className="text-sm">Report</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
