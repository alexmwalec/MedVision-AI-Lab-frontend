import { BrowserRouter as Router,Routes,Route } from "react-router-dom";
import UploadScan from "./Pages/UploadScan/UploadScan";
import DiagnosticResults from "./Pages/DiagnosticResults/DiagnosticResults";
import Constult from "./Pages/Constult/Constult";
import RadiologistConsultation from "./Pages/Radiologist/ Radiologist Consultation ";

function App(){
  return (
    <Router>
      <div className="min-h-screen bg-gray-800 text-white font-sans">

        <Routes>
        <Route path="/" element={<UploadScan/>}/>
        <Route path="/results" element={<DiagnosticResults/>}/>
        <Route path="/consult" element={<Constult/>}/>
        <Route path="/radiologistconsult" element={<RadiologistConsultation/>}/>

        </Routes>
      </div>
    </Router>
  )
}

export default App;
