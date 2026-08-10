import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { EvidenceRow } from './EvidenceTable';

// Define the shape of the data we expect to receive from ChatPage
interface RegionalChartProps {
  rawData: EvidenceRow[];
}

export default function RegionalChart({ rawData }: RegionalChartProps) {
  // If there is no data, don't draw anything
  if (!rawData || rawData.length === 0) return null;

  // Process the raw data into regional counts
  const chartData = Object.entries(
    rawData.reduce((acc: Record<string, number>, row: EvidenceRow) => {
      const region = row.address_stateorregion || row.address_stateOrRegion || 'Unknown';
      acc[region] = (acc[region] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, count]) => ({ name, count: Number(count) }));

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mt-2">
      <h4 className="text-sm font-bold text-slate-700 mb-4 tracking-tight">Regional Coverage Breakdown</h4>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            layout="vertical" 
            data={chartData}
            margin={{ top: 0, right: 20, left: 40, bottom: 0 }}
          >
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b', fontWeight: 500}} />
            <Tooltip 
              cursor={{fill: '#f1f5f9'}} 
              contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} 
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.count >= 3 ? '#10B981' : entry.count === 0 ? '#EF4444' : '#F59E0B'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}