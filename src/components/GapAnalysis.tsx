import { useState, useEffect } from 'react';
import { Download, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { analyzeAddressGaps, saveAnalysisResult } from '../services/gapAnalysisService';
import { generateCSVReport, generateHTMLReport, generateTextReport, downloadReport } from '../utils/reportGenerator';
import type { GapAnalysisReport } from '../services/gapAnalysisService';

export default function GapAnalysis() {
  const [report, setReport] = useState<GapAnalysisReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedStreet, setExpandedStreet] = useState<string | null>(null);

  useEffect(() => {
    loadAnalysis();
  }, []);

  const loadAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeAddressGaps();
      setReport(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze gaps');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAnalysis = async () => {
    if (!report) return;
    setLoading(true);
    try {
      await saveAnalysisResult(report);
      alert('Analysis saved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save analysis');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!report) return;
    const csv = generateCSVReport(report);
    downloadReport(`cedar-pointe-gaps-${new Date().getTime()}.csv`, csv, 'text/csv');
  };

  const handleDownloadHTML = () => {
    if (!report) return;
    const html = generateHTMLReport(report);
    downloadReport(`cedar-pointe-gaps-${new Date().getTime()}.html`, html, 'text/html');
  };

  const handleDownloadText = () => {
    if (!report) return;
    const text = generateTextReport(report);
    downloadReport(`cedar-pointe-gaps-${new Date().getTime()}.txt`, text, 'text/plain');
  };

  if (loading && !report) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-slate-600 mx-auto mb-3"></div>
          <p className="text-slate-600">Analyzing address gaps...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Address Gap Analysis</h2>
          <p className="text-slate-600">Identify missing address numbers and potential research opportunities</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">Analysis Summary</h3>
              <p className="text-sm text-slate-600">
                Generated {report ? new Date(report.analysisDate).toLocaleString() : 'never'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={loadAnalysis}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
              <button
                onClick={handleSaveAnalysis}
                disabled={loading || !report}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-600 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <CheckCircle2 size={16} />
                Save Analysis
              </button>
            </div>
          </div>

          {report && (
            <div className="p-6 grid grid-cols-4 gap-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">Total Properties</div>
                <div className="text-2xl font-bold text-slate-900">{report.totalProperties}</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">Gaps Found</div>
                <div className="text-2xl font-bold text-red-600">{report.totalGapsFound}</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">Verified Properties</div>
                <div className="text-2xl font-bold text-green-600">{report.verifiedProperties}</div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-sm text-slate-600 mb-1">Completion</div>
                <div className="text-2xl font-bold text-blue-600">{report.completionPercentage}%</div>
              </div>
            </div>
          )}
        </div>

        {report && (
          <>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Export Report</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleDownloadCSV}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <Download size={14} />
                    CSV
                  </button>
                  <button
                    onClick={handleDownloadHTML}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <Download size={14} />
                    HTML
                  </button>
                  <button
                    onClick={handleDownloadText}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <Download size={14} />
                    Text
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
              <div className="p-6 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-4">Gaps by Street</h3>
              </div>
              <div className="divide-y divide-slate-200">
                {report.gapsByStreet.map(street => (
                  <div key={street.streetKey} className="p-4 hover:bg-slate-50 transition-colors">
                    <button
                      onClick={() =>
                        setExpandedStreet(
                          expandedStreet === street.streetKey ? null : street.streetKey
                        )
                      }
                      className="w-full text-left flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">
                          {street.direction} {street.streetName} {street.streetSuffix}
                        </div>
                        <div className="text-sm text-slate-600 mt-1">
                          {street.actualProperties} of {street.totalNumbers} addresses ({street.gapPercentage.toFixed(1)}% gap)
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-slate-900">{street.gapCount}</div>
                        <div className="text-xs text-slate-500">gaps</div>
                      </div>
                    </button>

                    {expandedStreet === street.streetKey && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <div className="grid grid-cols-3 gap-2">
                          {street.gaps.map((gap, idx) => (
                            <div
                              key={idx}
                              className="text-xs bg-red-50 border border-red-200 rounded px-2 py-1 text-red-700"
                            >
                              {gap.fullAddress}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
              <h4 className="font-semibold mb-2">About This Analysis</h4>
              <ul className="space-y-1 text-blue-800 list-disc list-inside">
                <li>Gaps represent missing address numbers in sequential ranges</li>
                <li>May indicate water features, easements, infrastructure, or non-buildable areas</li>
                <li>High gap percentages (&gt;10%) warrant investigation in GIS records</li>
                <li>Further verification needed via Miami-Dade County Property Appraiser</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
