import { Scan, MessageCircle, Search, Filter, Send } from "lucide-react";
import { useNavigate, Link } from "react-router-dom"; 
import { useState, useEffect } from "react";
import { getPatients, requestRadiologistReview } from "../../api/medvisionApi";

export default function Consult() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const response = await getPatients();
      const patientsData = Array.isArray(response) ? response : response.patients || [];
      setPatients(patientsData);
    } catch (error) {
      console.error("Error fetching patients:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'text-red-400 bg-red-400/10 border-red-400';
      case 'high': return 'text-orange-400 bg-orange-400/10 border-orange-400';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400';
      case 'low': return 'text-green-400 bg-green-400/10 border-green-400';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'urgent': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      case 'reviewed': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const handleSendToRadiologist = async (patientId) => {
    try {
      await requestRadiologistReview(patientId);
      
      alert("Case sent to radiologist successfully!");
      fetchPatients();
    } catch (error) {
      console.error("Error sending to radiologist:", error);
      alert("Error sending case to radiologist.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading patients...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-white">MedVision AI Lab</h1>
            </div>

            <nav className="flex space-x-8">
              <Link to="/" className="text-gray-300 hover:text-white font-medium px-3 py-2">
                Uploads
              </Link>
              <Link to="/results" className="text-gray-300 hover:text-white font-medium px-3 py-2">
                Diagnostic Analysis
              </Link>
              <button className="text-green-400 font-semibold border-b-2 border-green-400 px-3 py-2">
                Consult
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Specialist Consultation</h1>
          <p className="text-gray-400">Request expert review for complex cases and second opinions</p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search patients, conditions, or IDs..."
              className="w-full bg-gray-800 text-white pl-10 pr-4 py-3 rounded-xl border border-gray-600 focus:border-green-400 focus:outline-none"
            />
          </div>
          <div className="flex gap-3">
            <button className="bg-gray-800 text-white px-4 py-3 rounded-xl border border-gray-600 hover:border-green-400 transition-colors flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filter
            </button>
            <button className="bg-green-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-600 transition-colors">
              New Consultation
            </button>
          </div>
        </div>

        {/* Patient List */}
        <div className="bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-750 border-b border-gray-700 text-gray-400 font-semibold text-sm">
            <div className="col-span-3">Patient Information</div>
            <div className="col-span-2">Scan Details</div>
            <div className="col-span-2">AI Findings</div>
            <div className="col-span-2">Priority</div>
            <div className="col-span-3">Actions</div>
          </div>

          {/* Patient Rows */}
          <div className="divide-y divide-gray-700">
            {patients.map((patient) => (
              <div key={patient.id} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-750 transition-colors">
                {/* Patient Information */}
                <div className="col-span-3">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${getStatusColor(patient.status || 'pending')}`}></div>
                    <div>
                      <p className="text-white font-semibold">{patient.name}</p>
                      <p className="text-gray-400 text-sm">ID: {patient.patientId}</p>
                      <p className="text-gray-400 text-sm">{patient.age} yrs • {patient.gender}</p>
                    </div>
                  </div>
                </div>

                {/* Scan Details */}
                <div className="col-span-2">
                  <div className="flex items-center text-sm">
                    <Scan className="h-4 w-4 text-blue-400 mr-2" />
                    <div>
                      <p className="text-white">{patient.scanType}</p>
                      <p className="text-gray-400">{patient.date}</p>
                    </div>
                  </div>
                </div>

                {/* AI Findings */}
                <div className="col-span-2">
                  <div className="bg-gray-700 rounded-lg px-3 py-2">
                    <p className="text-white font-medium text-sm">
                      {patient.aiFindings?.[0]?.name || "No findings"}
                    </p>
                    <p className="text-green-400 text-xs">
                      Confidence: {patient.aiFindings?.[0]?.probability || "0"}%
                    </p>
                  </div>
                </div>

                {/* Priority */}
                <div className="col-span-2">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full border ${getPriorityColor(patient.priority || 'medium')}`}>
                    <div className={`w-2 h-2 rounded-full mr-2 ${getPriorityColor(patient.priority || 'medium').split(' ')[0]}`}></div>
                    <span className="text-sm font-medium capitalize">{patient.priority || 'medium'}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="col-span-3">
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleSendToRadiologist(patient.id)}
                      className="flex-1 bg-blue-500 text-white py-2 px-3 rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center"
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Send to Radiologist
                    </button>
                    <button 
                      onClick={() => navigate("/results", { state: { patientData: patient } })}
                      className="flex-1 bg-gray-600 text-white py-2 px-3 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors"
                    >
                      View
                    </button>
                    <button className="bg-gray-600 text-white p-2 rounded-lg hover:bg-gray-700 transition-colors">
                      <MessageCircle className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
          <div className="bg-gray-800 rounded-2xl p-6">
            <div className="text-2xl font-bold text-white mb-2">{patients.length}</div>
            <div className="text-gray-400 text-sm">Total Cases</div>
          </div>
          <div className="bg-gray-800 rounded-2xl p-6">
            <div className="text-2xl font-bold text-red-400 mb-2">
              {patients.filter(p => p.priority === 'critical' || p.priority === 'high').length}
            </div>
            <div className="text-gray-400 text-sm">Urgent Cases</div>
          </div>
          <div className="bg-gray-800 rounded-2xl p-6">
            <div className="text-2xl font-bold text-yellow-400 mb-2">
              {patients.filter(p => p.status === 'pending').length}
            </div>
            <div className="text-gray-400 text-sm">Pending Review</div>
          </div>
          <div className="bg-gray-800 rounded-2xl p-6">
            <div className="text-2xl font-bold text-green-400 mb-2">
              {patients.filter(p => p.status === 'reviewed').length}
            </div>
            <div className="text-gray-400 text-sm">Completed</div>
          </div>
        </div>
      </div>
    </div>
  );
}
