import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Maximize2 } from "lucide-react";

export default function DICOMViewer() {
  const [searchParams] = useSearchParams();

  const studyInstanceUID =
    searchParams.get("StudyInstanceUIDs") ||
    searchParams.get("studyInstanceUID") ||
    "";

  const viewerUrl = useMemo(() => {
    if (!studyInstanceUID) {
      return "http://localhost:3001/";
    }

    return (
      "http://localhost:3001/viewer?StudyInstanceUIDs=" +
      encodeURIComponent(studyInstanceUID)
    );
  }, [studyInstanceUID]);

  const openViewer = () => {
    window.open(
      viewerUrl,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">

      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">

        <div className="max-w-full px-4 sm:px-6 lg:px-8">

          <div className="flex items-center justify-between h-16">

            <div className="flex items-center gap-4">

              <Link
                to="/"
                className="flex items-center text-gray-300 hover:text-white"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back
              </Link>

              <div className="h-6 w-px bg-gray-600" />

              <div>
                <h1 className="text-lg font-bold">
                  MedVision AI
                </h1>

                <p className="text-xs text-gray-400">
                  DICOM Viewer
                </p>
              </div>

            </div>

            <button
              type="button"
              onClick={openViewer}
              className="flex items-center bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm"
            >
              <Maximize2 className="h-4 w-4 mr-2" />
              Open Full Viewer
            </button>

          </div>

        </div>

      </header>

      {/* Viewer */}
      <main className="flex-1 p-3">

        <div className="w-full h-[calc(100vh-5.5rem)] bg-black rounded-xl overflow-hidden border border-gray-700">

          <iframe
            title="MedVision DICOM Viewer"
            src={viewerUrl}
            className="w-full h-full border-0"
            allow="fullscreen"
          />

        </div>

      </main>

    </div>
  );
}