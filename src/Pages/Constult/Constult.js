import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, CalendarDays, ClipboardList, Filter, History, Hospital, Search, Send } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { getPatients, requestRadiologistReview } from "../../api/medvisionApi";
import "./Constult.css";

const PAGE_SIZE = 20;

export default function Consult() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [diseaseFilter, setDiseaseFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const fetchPatients = async () => {
    setLoadError("");
    try {
      const result = await getPatients();
      setPatients(Array.isArray(result) ? result : result.patients || []);
    } catch (error) {
      console.error("Unable to load patient history:", error);
      setLoadError(error.message || "Unable to connect to the patient records service.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPatients(); }, []);

  const diseases = useMemo(() => [...new Set(patients.flatMap((patient) => (patient.aiFindings || [])
    .map((finding) => finding.name)
    .filter((name) => name && String(name).toLowerCase() !== "no significant findings")))].sort(), [patients]);

  const filteredPatients = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return patients.filter((patient) => {
      const findings = patient.aiFindings || [];
      const matchesDisease = diseaseFilter === "all" || findings.some((finding) => finding.name === diseaseFilter);
      const matchesQuery = !query || [patient.name, patient.patientId, patient.scanType, patient.date, ...findings.map((finding) => finding.name)]
        .some((value) => String(value || "").toLowerCase().includes(query));
      return matchesDisease && matchesQuery;
    });
  }, [patients, searchTerm, diseaseFilter]);

  useEffect(() => { setPage(1); }, [searchTerm, diseaseFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredPatients.length / PAGE_SIZE));
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);
  const visiblePatients = filteredPatients.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const withFindings = patients.filter((patient) => (patient.aiFindings || []).some((finding) => finding.name && String(finding.name).toLowerCase() !== "no significant findings")).length;
  const urgentCases = patients.filter((patient) => ["high", "urgent", "critical"].includes(String(patient.priority || patient.status || "").toLowerCase())).length;
  const clearStudies = patients.length - withFindings;

  const formatDate = (value) => {
    if (!value) return "Date unavailable";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  };
  const openPatient = (patient) => navigate(`/results/${patient.id}`, { state: { patientData: patient } });
  const referPatient = async (patientId) => {
    try {
      await requestRadiologistReview(patientId);
      window.alert("Case sent to radiologist successfully.");
      fetchPatients();
    } catch (error) {
      console.error("Unable to request radiologist review:", error);
      window.alert(error.message || "Unable to send this case to a radiologist.");
    }
  };

  return (
    <main className="records-page">
      <header className="records-header">
        <Link to="/" className="records-brand"><span><Hospital size={18} /></span><b>MedVision <strong>AI</strong></b></Link>
        <nav><Link to="/">Upload Scan</Link><Link to="/results">Diagnostic Analysis</Link><span className="records-nav-active"><History size={15} /> History</span></nav>
      </header>

      <div className="records-content">
        <div className="records-breadcrumb"><span>Clinical workspace</span><b>/</b><span>Patient records</span></div>
        <section className="records-title-row">
          <div><div className="records-eyebrow"><ClipboardList size={14} /> PATIENT RECORDS</div><h1>Radiology History</h1><p>Review imaging studies, AI findings, and specialist referrals.</p></div>
          <div className="records-date"><CalendarDays size={17} /><span>Study archive</span></div>
        </section>

        <section className="records-stats" aria-label="Record summary">
          <article><div className="stat-icon stat-blue"><ClipboardList size={18} /></div><div><span>Total studies</span><b>{patients.length}</b></div><small>All recorded cases</small></article>
          <article><div className="stat-icon stat-amber"><Activity size={18} /></div><div><span>Studies with findings</span><b>{withFindings}</b></div><small>AI detected a finding</small></article>
          <article><div className="stat-icon stat-red"><AlertTriangle size={18} /></div><div><span>Priority cases</span><b>{urgentCases}</b></div><small>Flagged for attention</small></article>
          <article><div className="stat-icon stat-green"><Activity size={18} /></div><div><span>No significant findings</span><b>{clearStudies}</b></div><small>Based on AI assessment</small></article>
        </section>

        <section className="records-panel">
          <div className="records-panel-heading"><div><h2>Study registry</h2><p>Patient imaging and diagnostic case details</p></div><span className="record-count">{filteredPatients.length} {filteredPatients.length === 1 ? "record" : "records"}</span></div>
          <div className="records-controls">
            <label className="records-search"><Search size={18} /><input aria-label="Search patient records" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search patient, ID, scan type, or finding" />{searchTerm && <button onClick={() => setSearchTerm("")} aria-label="Clear search">Clear</button>}</label>
            <label className="disease-filter"><Filter size={16} /><select aria-label="Filter by disease" value={diseaseFilter} onChange={(event) => setDiseaseFilter(event.target.value)}><option value="all">All diseases</option>{diseases.map((disease) => <option key={disease} value={disease}>{disease}</option>)}</select></label>
          </div>

          <div className="records-table-wrap">
            <table className="records-table"><thead><tr><th>Patient</th><th>Imaging study</th><th>AI assessment</th><th>Actions</th></tr></thead>
              <tbody>{visiblePatients.map((patient) => {
                const finding = patient.aiFindings?.[0];
                const thumbnail = patient.heatmapUrl || patient.imageUrl;
                return <tr key={patient.id}>
                  <td><div className="patient-cell"><button className="record-thumbnail" onClick={() => openPatient(patient)} aria-label={`Open ${patient.name || "patient"} study`}>{thumbnail ? <img src={thumbnail} alt="" /> : <Activity size={18} />}</button><div><b>{patient.name || "Unnamed patient"}</b><span>{patient.patientId ? `ID ${patient.patientId}` : "ID unavailable"}</span><small>{patient.age || "—"} yrs · {patient.gender || "—"}</small></div></div></td>
                  <td><b className="study-type">{patient.scanType || "Imaging study"}</b><span className="study-date">{formatDate(patient.date)}</span></td>
                  <td><b className="ai-result">{finding?.name || "No significant findings"}</b><span className="ai-confidence">{finding?.probability != null ? `${finding.probability}% confidence` : "No confidence score"}</span>{patient.aiFindings?.length > 1 && <small className="more-findings">+{patient.aiFindings.length - 1} additional findings</small>}</td>
                  <td><div className="record-actions"><button className="review-case" onClick={() => openPatient(patient)}>Open case</button><button className="send-review" onClick={() => referPatient(patient.id)} title="Request radiologist review"><Send size={15} /><span>Refer</span></button></div></td>
                </tr>;
              })}</tbody>
            </table>
            {loading && <div className="records-empty"><Activity size={25} /><b>Loading patient records</b><span>Connecting to the MedVision API…</span></div>}
            {!loading && loadError && <div className="records-empty records-load-error"><b>Could not load patient records</b><span>{loadError}</span><button onClick={fetchPatients}>Retry connection</button></div>}
            {!loading && !loadError && filteredPatients.length === 0 && <div className="records-empty"><ClipboardList size={30} /><b>{searchTerm || diseaseFilter !== "all" ? "No matching records" : "No patient records yet"}</b><span>{searchTerm || diseaseFilter !== "all" ? "Adjust the search or disease filter." : "Uploaded studies will appear here for clinical review."}</span></div>}
          </div>
          {pageCount > 1 && <div className="records-pagination"><span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredPatients.length)} of {filteredPatients.length}</span><div><button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>Previous</button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => <button key={number} className={`page-number ${page === number ? "current" : ""}`} aria-current={page === number ? "page" : undefined} onClick={() => setPage(number)}>{number}</button>)}<button onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page === pageCount}>Next</button></div></div>}
          <footer className="records-panel-footer">Patient information is available to authorized care team members.</footer>
        </section>
      </div>
    </main>
  );
}
