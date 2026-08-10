import { AlertTriangle, CheckCircle } from 'lucide-react';

interface AgentAlertsProps {
  agentResponse?: {
    stats?: { label: string; value: number; severity: string }[];
    anomaly_warning?: string | null;
    recommendation?: string;
  };
  anomalies?: string[];
}

export default function AgentAlerts({ agentResponse, anomalies }: AgentAlertsProps) {
  // If there are no alerts or anomalies to show, render nothing
  if (!agentResponse && !anomalies) return null;

  return (
    <div className="mt-4 flex flex-col gap-4 w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* 1. Stats Pills */}
      {agentResponse?.stats && agentResponse.stats.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {agentResponse.stats.map((stat: { label: string; value: number; severity: string }, i: number) => {
            const colors: Record<string, string> = {
              success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
              danger: 'bg-red-100 text-red-800 border-red-200',
              warning: 'bg-amber-100 text-amber-800 border-amber-200',
              normal: 'bg-slate-100 text-slate-800 border-slate-200'
            };
            return (
              <span key={i} className={`px-3 py-1.5 text-xs font-bold border rounded-full shadow-sm ${colors[stat.severity] || colors.normal}`}>
                {stat.value} · {stat.label}
              </span>
            );
          })}
        </div>
      )}

      {/* 2. Anomaly Warning Banner */}
      {agentResponse?.anomaly_warning && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-xl flex gap-3 items-start shadow-sm">
          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
          <p className="text-amber-900 text-sm font-medium m-0 leading-relaxed">{agentResponse.anomaly_warning}</p>
        </div>
      )}

      {/* 3. IDP Pipeline Anomalies */}
      {anomalies && anomalies.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm">
          <h3 className="text-red-800 font-bold text-sm mb-2 flex items-center gap-2">
            <AlertTriangle size={18} /> Critical Anomalies Detected
          </h3>
          <ul className="list-disc pl-5 text-red-700 text-sm space-y-1 text-left">
            {anomalies.map((anomaly: string, idx: number) => (
              <li key={idx}>{anomaly}</li>
            ))}
          </ul>
        </div>
      )}

      {anomalies && anomalies.length === 0 && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl shadow-sm flex items-center gap-2">
          <CheckCircle size={18} className="text-green-600" />
          <h3 className="text-green-800 font-bold text-sm m-0">Facility Verified - No Discrepancies</h3>
        </div>
      )}

      {/* 4. Recommendation Box */}
      {agentResponse?.recommendation && (
        <div className="bg-teal-50 border-l-4 border-teal-500 p-4 rounded-r-xl mt-2 shadow-sm">
          <p className="text-teal-900 text-xs font-bold uppercase mb-1 tracking-wide">Suggested Action</p>
          <p className="text-teal-800 text-sm font-medium m-0 leading-relaxed">{agentResponse.recommendation}</p>
        </div>
      )}
    </div>
  );
}