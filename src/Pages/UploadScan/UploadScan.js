import { useEffect, useRef, useState } from "react";
import { Activity, ArrowRight, CalendarDays, Check, FileImage, History, ImagePlus, LoaderCircle, ShieldCheck, UploadCloud, UserRound, X } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { analyzeCxr, renderScanPreview } from "../../api/medvisionApi";
import "./UploadScan.css";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

export default function UploadScan() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const previewRequestId = useRef(0);
  const [formData, setFormData] = useState({
    name: "", patientId: "", gender: "Female", age: "",
    date: new Date().toISOString().slice(0, 10), clinicalSymptoms: "",
    clinicalHistory: "", image: null, scanType: "Chest X-ray"
  });

  useEffect(() => {
    if (!formData.image) {
      setImagePreview("");
      return undefined;
    }
    const extension = formData.image.name.split(".").pop()?.toLowerCase();
    const dicom = ["dcm", "dicom"].includes(extension) || formData.image.type.includes("dicom");
    if (dicom) return undefined;
    const url = URL.createObjectURL(formData.image);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [formData.image]);

  const formatDateForApi = (date) => {
    if (!date) return date;
    const [year, month, day] = date.split("-");
    return year && month && day ? `${year}-${month}-${day}` : date;
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setFormError("");
  };

  const acceptFile = async (file) => {
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase();
    const supported = ["jpg", "jpeg", "png", "dcm", "dicom"].includes(extension);
    if (!supported) {
      setFormError("Choose a JPG, PNG, or DICOM file.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFormError("The selected file exceeds the 100 MB limit.");
      return;
    }
    const requestId = ++previewRequestId.current;
    const dicom = ["dcm", "dicom"].includes(extension) || file.type.includes("dicom");
    setFormData((current) => ({ ...current, image: file }));
    setImagePreview("");
    setPreviewError("");
    setFormError("");
    if (dicom) {
      setPreviewLoading(true);
      try {
        const preview = await renderScanPreview(file);
        if (requestId === previewRequestId.current) setImagePreview(preview);
      } catch (error) {
        if (requestId === previewRequestId.current) setPreviewError(error.message || "Could not render this DICOM image.");
      } finally {
        if (requestId === previewRequestId.current) setPreviewLoading(false);
      }
    }
  };

  const generatePatientId = () => {
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    return `${datePart}-PAT-${String(Math.floor(Math.random() * 999999) + 1).padStart(6, "0")}`;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");
    if (!formData.image) {
      setFormError("Upload a chest X-ray image before starting the analysis.");
      return;
    }
    const generatedPatientId = generatePatientId();
    const apiDate = formatDateForApi(formData.date);
    const updatedFormData = { ...formData, patientId: generatedPatientId, date: apiDate };
    setLoading(true);
    try {
      const analysis = await analyzeCxr({
        image: updatedFormData.image,
        name: updatedFormData.name,
        patientId: generatedPatientId,
        age: updatedFormData.age,
        gender: updatedFormData.gender,
        date: apiDate,
        scanType: updatedFormData.scanType,
        clinicalSymptoms: updatedFormData.clinicalSymptoms,
        clinicalHistory: updatedFormData.clinicalHistory
      });
      const aiData = Array.isArray(analysis.aiFindings)
        ? analysis.aiFindings
        : Array.isArray(analysis.findings) ? analysis.findings : [];
      const patientId = analysis.patient?.id || analysis.id || generatedPatientId;
      navigate(`/results/${patientId}`, {
        state: {
          aiData,
          heatmapUrl: analysis.heatmapUrl,
          formData: { ...updatedFormData, id: patientId, imageUrl: analysis.imageUrl, date: apiDate }
        }
      });
    } catch (error) {
      console.error("Error uploading scan:", error);
      setFormError(error.message || "The scan could not be analyzed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="upload-page">
      <header className="upload-topbar">
        <Link to="/" className="upload-brand"><span className="upload-brand-mark"><Activity size={16} /></span><span>MedVision <b>AI</b><small> · IMAGING</small></span></Link>
        <nav className="upload-nav" aria-label="Main navigation">
          <span className="upload-nav-current"><ImagePlus size={15} /> New analysis</span>
          <Link to="/consult"><History size={15} /> Study history</Link>
        </nav>
        <div className="upload-secure"><ShieldCheck size={15} /> Secure workspace</div>
      </header>

      <div className="upload-content">
        <section className="upload-intro">
          <div><span className="upload-eyebrow">CHEST X-RAY WORKSPACE</span><h1>Start a new analysis</h1><p>Upload an image and enter the study details to generate AI-assisted findings.</p></div>
          <div className="upload-stepper" aria-label="Analysis steps"><span className="step-active"><i>1</i> Study details</span><span className="step-line" /><span><i>2</i> AI analysis</span><span className="step-line" /><span><i>3</i> Findings</span></div>
        </section>

        <form className="upload-form" onSubmit={handleSubmit}>
          <section className="upload-panel scan-upload-panel">
            <div className="panel-heading"><div className="panel-icon"><FileImage size={18} /></div><div><h2>Imaging study</h2><p>Add a chest X-ray to begin</p></div><span className="required-note">Required</span></div>
            <label className="upload-field-label" htmlFor="scan-type">Study type</label>
            <select id="scan-type" name="scanType" value={formData.scanType} onChange={handleChange} className="upload-control">
              <option>Chest X-ray</option>
            </select>
            <input ref={fileInputRef} type="file" onChange={(event) => acceptFile(event.target.files?.[0])} className="upload-file-input" accept=".jpg,.jpeg,.png,.dcm,.dicom,image/jpeg,image/png,application/dicom,application/octet-stream" />
            <div className={`upload-dropzone ${dragActive ? "drop-active" : ""} ${formData.image ? "has-file" : ""}`} role="button" tabIndex={0} onClick={() => fileInputRef.current?.click()} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); fileInputRef.current?.click(); } }} onDragOver={(event) => { event.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)} onDrop={(event) => { event.preventDefault(); setDragActive(false); acceptFile(event.dataTransfer.files?.[0]); }}>
              {formData.image ? <>
                {imagePreview ? <img className="upload-image-preview" src={imagePreview} alt="Selected chest X-ray preview" /> : <div className="dicom-preview">{previewLoading ? <LoaderCircle className="spin" size={32} /> : <FileImage size={35} />}<b>{previewLoading ? "Preparing scan preview…" : previewError ? "Preview unavailable" : "Image selected"}</b><span>{previewError || "Ready for analysis"}</span></div>}
                <div className="selected-file"><span className="selected-check"><Check size={13} /></span><span><b>Image ready</b><small>{(formData.image.size / (1024 * 1024)).toFixed(2)} MB · Ready for analysis</small></span><button type="button" aria-label="Remove selected file" onClick={(event) => { event.stopPropagation(); previewRequestId.current += 1; setFormData((current) => ({ ...current, image: null })); setPreviewLoading(false); setPreviewError(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}><X size={16} /></button></div>
              </> : <div className="dropzone-prompt"><span className="dropzone-icon"><UploadCloud size={27} /></span><b>Drop your scan here</b><span>or <em>browse files</em> from your device</span><small>JPG, PNG, or DICOM · Maximum file size 100 MB</small></div>}
            </div>
            <div className="upload-privacy"><ShieldCheck size={14} /><span>Patient imaging is processed securely for this analysis.</span></div>
          </section>

          <section className="upload-panel patient-panel">
            <div className="panel-heading"><div className="panel-icon"><UserRound size={18} /></div><div><h2>Patient and study details</h2><p>Provide the information needed to identify this study</p></div></div>
            <div className="patient-fields">
              <div className="field-span-two"><label className="upload-field-label" htmlFor="patient-name">Patient name <span>*</span></label><input id="patient-name" name="name" value={formData.name} onChange={handleChange} className="upload-control" placeholder="Enter patient's full name" autoComplete="name" required /></div>
              <div><label className="upload-field-label" htmlFor="patient-age">Age <span>*</span></label><div className="input-with-suffix"><input id="patient-age" type="number" name="age" value={formData.age} onChange={handleChange} className="upload-control" min="0" max="120" placeholder="e.g. 45" required /><span>years</span></div></div>
              <div><label className="upload-field-label" htmlFor="patient-gender">Gender</label><select id="patient-gender" name="gender" value={formData.gender} onChange={handleChange} className="upload-control"><option>Female</option><option>Male</option><option>Other</option><option>Prefer not to say</option></select></div>
              <div className="field-span-two"><label className="upload-field-label" htmlFor="scan-date">Scan date <span>*</span></label><div className="date-control"><input id="scan-date" type="date" name="date" value={formData.date} onChange={handleChange} className="upload-control" required /><CalendarDays size={16} /></div></div>
              <div className="field-span-two"><label className="upload-field-label" htmlFor="clinical-symptoms">Clinical symptoms <small>(optional)</small></label><textarea id="clinical-symptoms" name="clinicalSymptoms" value={formData.clinicalSymptoms} onChange={handleChange} className="upload-control upload-textarea" placeholder="Add relevant symptoms" rows="2" /></div>
              <div className="field-span-two"><label className="upload-field-label" htmlFor="clinical-history">Relevant history <small>(optional)</small></label><textarea id="clinical-history" name="clinicalHistory" value={formData.clinicalHistory} onChange={handleChange} className="upload-control upload-textarea" placeholder="Add relevant clinical history" rows="2" /></div>
            </div>
            <div className="upload-form-footer">
              {formError && <div className="upload-form-error" role="alert">{formError}</div>}
              <div className="submit-note"><ShieldCheck size={14} /> AI findings support clinical review</div>
              <button type="submit" className="analyze-button" disabled={loading}>{loading ? <><LoaderCircle className="spin" size={17} /> Analyzing scan…</> : <>Analyze scan <ArrowRight size={17} /></>}</button>
            </div>
          </section>
        </form>
        <footer className="upload-footer"><span>MedVision AI · Clinical decision support</span><span>AI-generated findings require qualified clinical review.</span></footer>
      </div>
    </main>
  );
}
