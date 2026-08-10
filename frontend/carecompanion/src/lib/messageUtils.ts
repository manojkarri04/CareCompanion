import Papa from 'papaparse';
import type { EvidenceRow } from '../components/Chat_page/message-types/EvidenceTable';

// --- HACKATHON HELPERS ---
  
 export const getConfidenceScore = (row: EvidenceRow) => {
    let score = 0;
    if (row.capability && row.capability.length > 0) score += 40;
    if (row.equipment && row.equipment.length > 0) score += 30;
    if (row.procedure && row.procedure.length > 0) score += 20;
    if (row.numberdoctors || row.capacity) score += 10;
    return score;
  };

  export const downloadCSV = (data: EvidenceRow[], filename = 'vf_ghana_results.csv') => {
    if (!data || data.length === 0) return;
    
    // Map the raw data into clean objects for PapaParse
    const exportData = data.map(row => {
      const score = getConfidenceScore(row);
      const hasEq = row.equipment && row.equipment.length > 0;
      const hasCap = row.capability && row.capability.length > 0;
      const hasProc = row.procedure && row.procedure.length > 0;
      
      let statusText = "Partial";
      if (row.is_anomaly) statusText = "Anomaly";
      else if (!hasEq && !hasCap && !hasProc) statusText = "Desert";
      else if (hasCap && hasEq) statusText = "Documented";

      return {
        'ID': row.pk_unique_id,
        'Facility Name': row.name || 'Unknown',
        'City': row.address_city || 'Unknown',
        'Region': row.address_stateorregion || row.address_stateOrRegion || 'Unknown',
        'Confidence Score': `${score}%`,
        'Status': statusText
      };
    });

    const csvString = Papa.unparse(exportData);
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename.replace('.csv', '')}_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };
