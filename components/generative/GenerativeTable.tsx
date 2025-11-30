import React from 'react';

interface GenerativeTableProps {
  data: Record<string, any>[];
  columns?: string[];
  title?: string;
}

const GenerativeTable: React.FC<GenerativeTableProps> = ({ data, columns, title }) => {
  if (!data || data.length === 0) return null;

  const headers = columns || Object.keys(data[0]);

  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 my-2">
      {title && (
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/80">
           <h3 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-fuchsia-500"></span>
            {title}
          </h3>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-950/50 text-slate-400 uppercase tracking-wider">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-3 font-medium border-b border-slate-800">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                {headers.map((header) => (
                  <td key={`${idx}-${header}`} className="px-4 py-3 text-slate-300 whitespace-nowrap">
                    {typeof row[header] === 'object' ? JSON.stringify(row[header]) : String(row[header])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GenerativeTable;
