import React from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface ChartData {
  name: string;
  [key: string]: string | number;
}

export interface DynamicChartProps {
  type: 'bar' | 'line' | 'area';
  data: ChartData[];
  title?: string;
  colors?: string[];
  xAxisKey?: string;
  dataKeys: string[];
}

const DEFAULT_COLORS = ['#06b6d4', '#d946ef', '#10b981', '#f59e0b'];

const TooltipItem = ({ entry }: { entry: any }) => {
  const ref = React.useRef<HTMLParagraphElement>(null);
  React.useEffect(() => {
    if (ref.current) {
      ref.current.style.color = entry.color;
    }
  }, [entry.color]);

  return (
    <p ref={ref}>
      {entry.name}: {entry.value}
    </p>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/90 border border-slate-700 p-2 rounded shadow-xl backdrop-blur-sm text-xs font-mono">
        <p className="text-slate-300 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <TooltipItem key={index} entry={entry} />
        ))}
      </div>
    );
  }
  return null;
};

const DynamicChart: React.FC<DynamicChartProps> = ({ type, data, title, colors = DEFAULT_COLORS, xAxisKey = 'name', dataKeys }) => {
  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
            <XAxis dataKey={xAxisKey} stroke="#94a3b8" fontSize={10} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#334155', opacity: 0.2 }} />
            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
            {dataKeys.map((key, index) => (
              <Bar key={key} dataKey={key} fill={colors[index % colors.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        );
      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
            <XAxis dataKey={xAxisKey} stroke="#94a3b8" fontSize={10} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
            {dataKeys.map((key, index) => (
              <Line 
                key={key} 
                type="monotone" 
                dataKey={key} 
                stroke={colors[index % colors.length]} 
                strokeWidth={2}
                dot={{ r: 3, fill: colors[index % colors.length] }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
            <XAxis dataKey={xAxisKey} stroke="#94a3b8" fontSize={10} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
            {dataKeys.map((key, index) => (
              <Area 
                key={key} 
                type="monotone" 
                dataKey={key} 
                stroke={colors[index % colors.length]} 
                fill={colors[index % colors.length]} 
                fillOpacity={0.3} 
              />
            ))}
          </AreaChart>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full p-4 bg-slate-900/50 border border-slate-800 rounded-xl my-2">
      {title && <h3 className="text-sm font-bold text-slate-300 mb-4 font-mono uppercase tracking-wider flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
        {title}
      </h3>}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart() || <div>Invalid Chart Type</div>}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DynamicChart;
