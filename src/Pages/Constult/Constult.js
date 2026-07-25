import { Scan, MessageCircle, Search, Filter, Send } from "lucide-react";
import { useNavigate, Link } from "react-router-dom"; 
import { useState, useEffect } from "react";
import { getPatients, requestRadiologistReview } from "../../api/medvisionApi";

export default function Consult() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredPatients(patients);
    } else {
      const searchLower = searchTerm.toLowerCase().trim();
      const filtered = patients.filter(patient => {
        return (
          patient.name?.toLowerCase().includes(searchLower) ||
          patient.patientId?.toLowerCase().includes(searchLower) ||
          patient.scanType?.toLowerCase().includes(searchLower) ||
          patient.aiFindings?.some(finding => 
            finding.name?.toLowerCase().includes(searchLower)
          ) ||
          patient.date?.includes(searchTerm) ||
          patient.priority?.toLowerCase().includes(searchLower)
        );
      });
      setFilteredPatients(filtered);
    }
  }, [searchTerm, patients]);

  const fetchPatients = async () => {
    try {
      const response = await getPatients();
      const patientsData = Array.isArray(response) ? response : response.patients || [];
      setPatients(patientsData);
      setFilteredPatients(patientsData);
    } catch (error) {
      console.error("Error fetching patients:", error);
    } finally {
      setLoading(false);
    }
  };

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

  const openPatient = (patient) => {
    navigate("/results", { state: { patientData: patient } });
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

        {/* Statistics - Now at the top */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700">
            <div className="text-3xl font-bold text-white mb-1">{patients.length}</div>
            <div className="text-gray-400 text-sm">Total Cases</div>
            <div className="mt-2 w-full bg-gray-700 rounded-full h-1.5">
              <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700">
            <div className="text-3xl font-bold text-red-400 mb-1">
              {patients.filter(p => p.priority === 'critical' || p.priority === 'high').length}
            </div>
            <div className="text-gray-400 text-sm">Urgent Cases</div>
            <div className="mt-2 w-full bg-gray-700 rounded-full h-1.5">
              <div className="bg-red-500 h-1.5 rounded-full" style={{ 
                width: `${patients.length > 0 ? (patients.filter(p => p.priority === 'critical' || p.priority === 'high').length / patients.length) * 100 : 0}%` 
              }}></div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700">
            <div className="text-3xl font-bold text-yellow-400 mb-1">
              {patients.filter(p => p.status === 'pending').length}
            </div>
            <div className="text-gray-400 text-sm">Pending Review</div>
            <div className="mt-2 w-full bg-gray-700 rounded-full h-1.5">
              <div className="bg-yellow-400 h-1.5 rounded-full" style={{ 
                width: `${patients.length > 0 ? (patients.filter(p => p.status === 'pending').length / patients.length) * 100 : 0}%` 
              }}></div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700">
            <div className="text-3xl font-bold text-green-400 mb-1">
              {patients.filter(p => p.status === 'reviewed').length}
            </div>
            <div className="text-gray-400 text-sm">Completed</div>
            <div className="mt-2 w-full bg-gray-700 rounded-full h-1.5">
              <div className="bg-green-400 h-1.5 rounded-full" style={{ 
                width: `${patients.length > 0 ? (patients.filter(p => p.status === 'reviewed').length / patients.length) * 100 : 0}%` 
              }}></div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search patients, conditions, or IDs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-800 text-white pl-10 pr-4 py-3 rounded-xl border border-gray-600 focus:border-green-400 focus:outline-none"
            />
            {searchTerm && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <span className="text-gray-400 text-sm">
                  {filteredPatients.length} results
                </span>
              </div>
            )}
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
            <div className="col-span-1">Scan</div>
            <div className="col-span-2">Patient Information</div>
            <div className="col-span-2">Scan Details</div>
            <div className="col-span-2">AI Findings</div>
            <div className="col-span-2">Priority</div>
            <div className="col-span-3">Actions</div>
          </div>

          {/* Patient Rows */}
          <div className="divide-y divide-gray-700">
            {filteredPatients.length > 0 ? (
              filteredPatients.map((patient) => (
                <div key={patient.id} className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-750 transition-colors items-center">

                  {/* Scan Thumbnail (heatmap if available, falls back to original) */}
                  <div className="col-span-1">
                    <button
                      onClick={() => openPatient(patient)}
                      className="block w-14 h-14 rounded-lg overflow-hidden border border-gray-600 hover:border-green-400 transition-colors"
                      title="View full analysis"
                    >
                      {patient.heatmapUrl || patient.imageUrl ? (
                        <img
                          src={patient.heatmapUrl || patient.imageUrl}
                          alt={`${patient.name || "Patient"} scan`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                          <Scan className="h-5 w-5 text-gray-500" />
                        </div>
                      )}
                    </button>
                  </div>

                  {/* Patient Information */}
                  <div className="col-span-2">
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
                        <p className="text-gray-400">{formatDate(patient.date)}</p>
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
                      {patient.aiFindings?.length > 1 && (
                        <p className="text-gray-400 text-xs mt-0.5">
                          +{patient.aiFindings.length - 1} more
                        </p>
                      )}
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
                        onClick={() => openPatient(patient)}
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
              ))
            ) : (
              <div className="px-6 py-12 text-center text-gray-400">
                <p className="text-lg">No patients found matching your search</p>
                <p className="text-sm mt-2">Try adjusting your search terms</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}