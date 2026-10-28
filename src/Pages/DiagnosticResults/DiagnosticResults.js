import { useEffect, useState } from "react";
import { Activity, CheckCircle, Download, FileImage, Flame, Home, Image as ImageIcon, Maximize2, RotateCcw, ScanLine, Search, SlidersHorizontal, User, ZoomIn } from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { getPatient } from "../../api/medvisionApi";
import "./DiagnosticResults.css";

export default function DiagnosticResults() {
  const navigate = useNavigate();
  const location = useLocation();
  const { patientId } = useParams();
  const [patientData, setPatientData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState("heatmap");

  useEffect(() => {
    let cancelled = false;
    const loadPatient = async () => {
      if (patientId) {
        try {
          const patient = await getPatient(patientId);
          if (!cancelled) setPatientData(patient);
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
        const findings = Array.isArray(location.state.aiData) ? location.state.aiData : [location.state.aiData];
        setPatientData({ ...location.state.formData, aiFindings: findings, heatmapUrl: location.state.heatmapUrl });
        setLoading(false);
      } else navigate("/");
    };
    loadPatient();
    return () => { cancelled = true; };
  }, [patientId, location.state, navigate]);

  const formatDate = (value) => {
    if (!value) return "N/A";
    if (typeof value === "string") {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 10);
    }
    return value;
  };

  if (loading || !patientData) return <div className="diagnostic-loading">Loading results…</div>;

  const originalSrc = patientData.image ? URL.createObjectURL(patientData.image) : patientData.imageUrl || null;
  const hasHeatmap = Boolean(patientData.heatmapUrl);
  const showingHeatmap = activeView === "heatmap" && hasHeatmap;
  const activeSrc = showingHeatmap ? patientData.heatmapUrl : originalSrc;
  const findings = patientData.aiFindings || [];
  const notableFindings = findings.filter((finding) => finding.name !== "No Significant Findings");
  const topFinding = notableFindings[0];

  return (
    <main className="diagnostic-workstation">
      <header className="diagnostic-topbar">
        <Link to="/" className="diagnostic-brand"><span className="brand-mark"><Activity size={15} /></span><span>MedVision <b>INSIGHT</b><small> CXR</small></span></Link>
        <div className="topbar-center"><Link to="/">UPLOAD SCAN</Link><span className="topbar-divider" /><span className="topbar-current">DIAGNOSTIC ANALYSIS</span></div>
        <div className="topbar-patient"><span>{patientData.name || "Patient study"}</span><span className="patient-avatar"><User size={14} /></span></div>
      </header>

      <div className="diagnostic-body">
        <section className="scan-workspace" aria-label="Diagnostic image workspace">
          <div className="scan-toolbar">
            <div className="study-label"><span className="live-dot" /><span>{patientData.scanType || "Chest X-Ray"}</span><span className="study-separator">/</span><span>{formatDate(patientData.date)}</span></div>
            <div className="scan-tools">
              {hasHeatmap && <div className="view-switch" aria-label="Image view">
                <button className={showingHeatmap ? "selected" : ""} onClick={() => setActiveView("heatmap")}><Flame size={13} /> Heatmap</button>
                <button className={!showingHeatmap ? "selected" : ""} onClick={() => setActiveView("original")}><ImageIcon size={13} /> Original</button>
              </div>}
              <button className="icon-tool" title="Zoom"><ZoomIn size={16} /></button><button className="icon-tool" title="Adjust image"><SlidersHorizontal size={16} /></button><button className="icon-tool" title="Reset view"><RotateCcw size={15} /></button><button className="icon-tool" title="Fit image"><Maximize2 size={15} /></button>
            </div>
          </div>
          <div className="scan-stage">
            <div className="scan-image-frame">
              {activeSrc ? <img src={activeSrc} alt={showingHeatmap ? "AI analysis heatmap overlay" : "Uploaded diagnostic scan"} className="scan-image" /> : <div className="scan-empty"><FileImage size={42} /><span>No image available for this study</span></div>}
              <div className="image-caption"><ScanLine size={13} /> {showingHeatmap ? "AI ATTENTION MAP" : "ORIGINAL IMAGE"}</div>
            </div>
            <div className="scan-side-note"><span>STUDY</span><b>{patientData.patientId || "—"}</b><span>PROCESSED</span><b>{formatDate(patientData.date)}</b></div>
          </div>
          <div className="scan-footer"><span><Activity size={12} /> MedVision AI · Clinical decision support</span><span>Review findings with clinical context</span></div>
        </section>

        <aside className="analysis-rail">
          <div className="rail-section rail-study">
            <div className="rail-heading"><span>STUDY OVERVIEW</span><button title="Search study"><Search size={14} /></button></div>
            <h1>{patientData.scanType || "Chest X-Ray"}</h1><p>{patientData.name || "Patient"} <i>·</i> {patientData.age || "—"} yrs <i>·</i> {patientData.gender || "—"}</p>
            <div className="study-meta"><span>Study date</span><b>{formatDate(patientData.date)}</b><span>Patient ID</span><b>{patientData.patientId || "—"}</b></div>
          </div>

          <div className="rail-section controls-section">
            <div className="rail-heading"><span>VIEW CONTROLS</span></div>
            <div className="control-label">IMAGE DISPLAY</div>
            <div className="display-control"><button className={showingHeatmap ? "active" : ""} onClick={() => setActiveView("heatmap")} disabled={!hasHeatmap}><Flame size={14} /> AI Overlay</button><button className={!showingHeatmap ? "active" : ""} onClick={() => setActiveView("original")}><ImageIcon size={14} /> Original</button></div>
            {showingHeatmap && <div className="overlay-legend"><span className="legend-gradient" /><div><span>Lower attention</span><span>Higher attention</span></div></div>}
          </div>

          <div className="rail-section results-section">
            <div className="rail-heading"><span>INSIGHT ANALYSIS</span><span className="ai-badge">AI</span></div>
            <div className="score-title"><span>Top finding</span><span className={`status-pill ${topFinding ? "status-alert" : "status-clear"}`}>{topFinding ? "REVIEW" : "CLEAR"}</span></div>
            <div className="finding-primary">{topFinding?.name || "No significant findings"}</div>
            <div className="score-row"><span>Confidence</span><b>{topFinding?.probability != null ? `${topFinding.probability}%` : "—"}</b></div>
            <div className="score-track"><span style={{ width: `${Math.min(100, Math.max(0, Number(topFinding?.probability) || 0))}%`, background: topFinding?.color || "#21c7bd" }} /></div>
            {topFinding?.description && <p className="finding-description">{topFinding.description}</p>}
            <div className="finding-list">
              {findings.length ? findings.map((finding, index) => <div className="finding-row" key={`${finding.name}-${index}`}><span className="finding-dot" style={{ backgroundColor: finding.color || "#8497a9" }} /><span>{finding.name || "Unknown"}</span><b>{finding.probability != null ? `${finding.probability}%` : "—"}</b></div>) : <p className="muted-copy">No AI findings are available yet.</p>}
            </div>
          </div>

          <div className="rail-section recommendation-section">
            <div className="rail-heading"><span>RECOMMENDATIONS</span><CheckCircle size={14} /></div>
            {findings.length ? findings.map((finding, index) => <div className="recommendation" key={`rec-${index}`}><b>{finding.name || "Clinical review"}</b><p>{finding.recommendations?.length ? finding.recommendations.join(" ") : "Correlate with clinical presentation and review with a qualified clinician."}</p></div>) : <p className="muted-copy">No recommendations available.</p>}
          </div>
          <div className="rail-actions"><button className="report-button" onClick={() => window.print()}><Download size={15} /> Print / Save Report</button><Link to="/consult" className="history-link"><Home size={14} /> View study history</Link></div>
        </aside>
      </div>
    </main>
  );
}
