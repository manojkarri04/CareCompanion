import { getConfidenceScore, downloadCSV } from '../../../lib/messageUtils';

export interface EvidenceRow {
  pk_unique_id?: string | number;
  name?: string;
  address_city?: string;
  address_stateorregion?: string;
  address_stateOrRegion?: string;
  is_anomaly?: boolean;
  equipment?: unknown[];
  capability?: unknown[];
  procedure?: unknown[];
  source_url?: string;
  [key: string]: unknown;
}

interface EvidenceTableProps {
  rawData?: EvidenceRow[];
}

export default function EvidenceTable({ rawData }: EvidenceTableProps) {
  if (!rawData || rawData.length === 0) return null;

  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="overflow-hidden border border-slate-200 rounded-xl shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-bold border-b border-slate-200 tracking-wider">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Facility</th>
                <th className="px-4 py-3">Region</th>
                <th className="px-4 py-3">Confidence</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {rawData.slice(0, 10).map((row: EvidenceRow, i: number) => {
                let statusClass = "bg-slate-100 text-slate-800 border-slate-200";
                let statusText = "Unknown";
                const hasEq = row.equipment && row.equipment.length > 0;
                const hasCap = row.capability && row.capability.length > 0;
                const hasProc = row.procedure && row.procedure.length > 0;

                if (row.is_anomaly) {
                  statusClass = "bg-blue-100 text-blue-800 border-blue-200";
                  statusText = "Anomaly";
                } else if (!hasEq && !hasCap && !hasProc) {
                  statusClass = "bg-red-100 text-red-800 border-red-200";
                  statusText = "Desert";
                } else if (hasCap && hasEq) {
                  statusClass = "bg-emerald-100 text-emerald-800 border-emerald-200";
                  statusText = "Documented";
                } else {
                  statusClass = "bg-amber-100 text-amber-800 border-amber-200";
                  statusText = "Partial";
                }

                const score = getConfidenceScore(row);
                let scoreColor = "text-amber-600";
                if (score >= 70) scoreColor = "text-emerald-600";
                if (score < 40) scoreColor = "text-red-500";

                return (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">#{row.pk_unique_id}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.name}</td>
                    <td className="px-4 py-3">{row.address_city}, {row.address_stateorregion || row.address_stateOrRegion}</td>
                    <td className="px-4 py-3 font-mono font-medium">
                      <span className={scoreColor}>{score}%</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-bold border rounded-md ${statusClass}`}>
                        {statusText}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.source_url && (
                        <a href={row.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs">
                          {new URL(row.source_url).hostname.replace('www.', '')}
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rawData.length > 10 && (
          <div className="bg-slate-50 p-3 text-center text-xs text-slate-500 font-medium border-t border-slate-200">
            Showing 10 of {rawData.length} results. Use specific queries to narrow down.
          </div>
        )}
      </div>
      
      {/* CSV Export Button */}
      <div className="flex justify-end">
        <button 
          onClick={() => downloadCSV(rawData || [])}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
          Export Results as CSV
        </button>
      </div>
    </div>
  );
}