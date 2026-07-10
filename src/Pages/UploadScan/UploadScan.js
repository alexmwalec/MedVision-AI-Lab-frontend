import { useState } from "react";
import { Calendar, Upload, User } from "lucide-react";
import { useNavigate, Link } from "react-router-dom"; 
import { analyzeCxr } from "../../api/medvisionApi";

export default function UploadScan() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    patientId: "",
    gender: "Female", 
    age: "",
    date: "",
    clinicalSymptoms: "",
    clinicalHistory: "",
    image: null,
    scanType: "Chest X-ray"
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleImage = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, image: e.target.files[0] });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.image) {
      alert("Please upload an image first!");
      return;
    }
    setLoading(true);

    try {
      const analysis = await analyzeCxr({
        image: formData.image,
        name: formData.name,
        patientId: formData.patientId,
        age: formData.age,
        gender: formData.gender,
        date: formData.date,
        scanType: formData.scanType,
        clinicalSymptoms: formData.clinicalSymptoms,
        clinicalHistory: formData.clinicalHistory
      });

      const aiData = Array.isArray(analysis.aiFindings)
        ? analysis.aiFindings
        : Array.isArray(analysis.findings)
          ? analysis.findings
          : [];

      const patientId = analysis.patient?.id || analysis.id || formData.patientId;

      setLoading(false);

      navigate("/results", { 
        state: { 
          aiData: aiData, 
          heatmapUrl: analysis.heatmapUrl,
          formData: { ...formData, id: patientId} 
        } 
      });

    } catch (err) {
      console.error("Error uploading scan:", err);
      setLoading(false);
      alert("Error uploading scan. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-cyan-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
             <h1 className="text-xl font-bold text-white">MedVision AI Lab</h1>
            </div>

            <nav className="flex space-x-8">
              <Link to = "/" className="text-green-400 font-semibold border-b-2 border-green-400 px-3 py-2">
                Uploads
              </Link>
              <Link
                to="/results"
                className="text-gray-300 hover:text-white font-medium px-3 py-2"
              >
                Diagnostic Analysis
              </Link>
              <Link
                to="/consult"
                className="text-gray-300 hover:text-white font-medium px-3 py-2"
              >
                Consult   
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Image Upload */}
          <div className="bg-gray-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-white mb-4">
              Upload Chest X-ray Image
            </h2>

            <div className="mb-6">
              <input
                name="scanType"
                value={formData.scanType}
                readOnly
                className="w-full p-3 rounded-xl bg-gray-700 text-white border border-gray-600 focus:outline-none"
              />
            </div> 

            <label className="block mb-6">
              <input
                type="file"
                onChange={handleImage}
                className="hidden"
                id="imageUpload"
                accept="image/*"
              />
              <div
                onClick={() => document.getElementById("imageUpload").click()}
                className="cursor-pointer border-2 border-dashed border-gray-600 rounded-2xl p-8 hover:border-green-400 transition-colors duration-200 min-h-[400px] flex flex-col items-center justify-center"
              >
                {formData.image ? (
                  <div className="text-center">
                    <img
                      src={URL.createObjectURL(formData.image)}
                      alt="Uploaded scan"
                      className="rounded-lg mx-auto max-h-80 object-contain mb-4"
                    />
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-white font-medium text-lg mb-2">
                      Supported formats: JPG, PNG, DICOM. Max Size 100MB
                    </p>
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Right Column - Patient Information */}
          <div className="bg-sky-100 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center mb-6">
              <User className="h-6 w-6 text-gray-700 mr-2" />
              <h2 className="text-xl font-bold text-gray-800">Patient Information</h2>
            </div>

            <p className="text-gray-600 mb-6 text-center">
              Fill the patient information below
            </p>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Patient Name
                </label>
                <input
                  name="name"
                  placeholder="Enter full name"
                  className="w-full bg-white border border-gray-300 p-3 rounded-xl focus:border-green-400 focus:outline-none"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Age
                </label>
                <input
                  name="age"
                  placeholder="Enter age"
                  className="w-full text-black bg-white border border-gray-300 p-3 rounded-xl focus:border-green-400 focus:outline-none"
                  value={formData.age}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Gender
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full bg-white text-black border border-gray-300 p-3 rounded-xl focus:border-green-400 focus:outline-none"
                >
                  <option>Female</option>
                  <option>Male</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Scan Date
                </label>
                <div className="flex items-center bg-white border border-gray-300 rounded-xl p-3 focus-within:border-green-400">
                  <input
                    type="date"
                    name="date"
                    className="bg-white text-black flex-grow focus:outline-none"
                    onChange={handleChange}
                    required
                  />
                  <Calendar className="text-gray-400" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-500 text-white p-3 rounded-xl font-semibold hover:bg-green-600 transition-colors duration-200 mt-6 flex items-center justify-center"
              >
                {loading ? "Analyzing..." : "Scan"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
