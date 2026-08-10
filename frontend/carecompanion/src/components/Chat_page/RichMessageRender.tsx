import { Code, Play, AlertTriangle, CheckCircle } from 'lucide-react';

import MapView from './message-types/MapView';
import EvidenceTable from './message-types/EvidenceTable';
import SpecialContent from './message-types/SpecialContent';
import type { Message } from '../../lib/types';

interface RichMessageRendererProps {
  message: Message;
}

export default function RichMessageRenderer({ message }: RichMessageRendererProps) {
  if (message.type !== 'bot') return null;
  return (
    <>
      {message.agent_response && (
        <div className="mt-4 flex flex-col gap-4 w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
          
          {message.agent_response.stats && message.agent_response.stats.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {message.agent_response.stats.map((stat: { label: string; value: number; severity: string }, i: number) => {
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

          {message.agent_response.anomaly_warning && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r-xl flex gap-3 items-start shadow-sm">
              <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
              <p className="text-amber-900 text-sm font-medium m-0 leading-relaxed">{message.agent_response.anomaly_warning}</p>
            </div>
          )}
          {message.agent_response.recommendation && (
            <div className="bg-teal-50 border-l-4 border-teal-500 p-4 rounded-r-xl mt-2 shadow-sm">
              <p className="text-teal-900 text-xs font-bold uppercase mb-1 tracking-wide">Suggested Action</p>
              <p className="text-teal-800 text-sm font-medium m-0 leading-relaxed">{message.agent_response.recommendation}</p>
            </div>
          )}
        </div>
      )} 
      {message.mapData && (
          <MapView mapData={message.mapData} />
      )}
      {message.raw_data && message.raw_data.length > 0 && (
          <EvidenceTable rawData={message.raw_data}/>
      )} 

      {message.video && (
        <a 
          href={message.video.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="mt-4 flex items-center gap-4 bg-red-50 border border-red-200 p-4 rounded-xl hover:bg-red-100 transition-colors max-w-md no-underline group"
        >
          <div className="bg-red-600 group-hover:bg-red-700 text-white p-3 rounded-full shrink-0 transition-colors shadow-sm">
            <Play size={20} fill="currentColor" />
          </div>
          <div>
            <p className="text-red-900 font-bold text-sm m-0 leading-tight mb-1">Recommended Video</p>
            <p className="text-red-700 text-sm m-0 line-clamp-2">{message.video.title}</p>
          </div>
        </a>
      )}

      {message.sql && (
        <details className="mt-4 cursor-pointer outline-none group">
          <summary className="text-xs font-bold text-blue-600 flex items-center gap-1 select-none hover:text-blue-800 transition-colors">
            <Code size={14} /> View Agent Reasoning (SQL)
          </summary>
          <div className="mt-2 bg-slate-900 text-green-400 text-xs p-4 rounded-xl overflow-x-auto font-mono text-left shadow-inner">
            {message.sql}
          </div>
        </details>
      )}

      {message.anomalies && message.anomalies.length > 0 && (
        <div className="mt-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm">
          <h3 className="text-red-800 font-bold text-sm mb-2 flex items-center gap-2">
            <AlertTriangle size={18} /> Critical Anomalies Detected
          </h3>
          <ul className="list-disc pl-5 text-red-700 text-sm space-y-1 text-left">
            {message.anomalies.map((anomaly: string, idx: number) => (
              <li key={idx}>{anomaly}</li>
            ))}
          </ul>
        </div>
      )}

      {message.anomalies && message.anomalies.length === 0 && (
        <div className="mt-4 bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl shadow-sm flex items-center gap-2">
          <CheckCircle size={18} className="text-green-600" />
          <h3 className="text-green-800 font-bold text-sm m-0">Facility Verified - No Discrepancies</h3>
        </div>
      )}

      <SpecialContent specialContent={message.specialContent}/>
    </>
  );
}