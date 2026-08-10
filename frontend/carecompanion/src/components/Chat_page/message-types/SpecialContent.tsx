import type { SpecialContentPayload } from '../../../lib/types';

interface SpecialContentProps {
  specialContent?: SpecialContentPayload;
}

export default function SpecialContent({ specialContent }: SpecialContentProps) {
  if (!specialContent) return null;

  switch (specialContent.type) {
    case 'summary': {
      const summaryData = specialContent.data as Record<string, unknown>;
      const items = (summaryData.items as string[]) || [];
      return (
        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-blue-900 mb-2 font-bold">{summaryData.title as string}</h3>
          <ul className="space-y-1">
            {items.map((item: string, index: number) => (
              <li key={index} className="text-blue-800 text-sm">• {item}</li>
            ))}
          </ul>
        </div>
      );
    }
    case 'facilities': {
      const facilityData = specialContent.data as Record<string, unknown>;
      const specialties = (facilityData.specialties as string[]) || [];
      const equipment = (facilityData.equipment as string[]) || [];
      const procedures = (facilityData.procedures as string[]) || [];
      return (
        <div className="mt-3 bg-teal-50 border border-teal-200 rounded-lg p-4 shadow-sm text-left">
          <h3 className="text-teal-900 text-lg font-bold border-b border-teal-200 pb-2 mb-2">
            {(facilityData.facilityName as string) || 'Facility Details Extracted'}
          </h3>
          
          {specialties.length > 0 && (
            <div className="mt-3">
              <strong className="text-teal-900 block mb-1 text-sm">Specialties:</strong>
              <div className="flex flex-wrap gap-1">
                {specialties.map((s: string, i: number) => (
                  <span key={i} className="bg-teal-200 text-teal-900 text-xs px-2 py-1 rounded-full font-medium">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {equipment.length > 0 && (
            <div className="mt-3">
              <strong className="text-teal-900 text-sm">Equipment Identified:</strong>
              <ul className="list-disc pl-5 text-teal-800 text-sm mt-1 space-y-1">
                {equipment.map((e: string, i: number) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}

          {procedures.length > 0 && (
            <div className="mt-3">
              <strong className="text-teal-900 text-sm">Procedures Listed:</strong>
              <ul className="list-disc pl-5 text-teal-800 text-sm mt-1 space-y-1">
                {procedures.map((p: string, i: number) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}
        </div>
      );
    }
    default:
      return null;
  }
}