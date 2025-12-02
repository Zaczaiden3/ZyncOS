import React, { Suspense } from 'react';
import GenerativeTable from './GenerativeTable';

// Lazy load the heavy chart component
const DynamicChart = React.lazy(() => import('./DynamicChart'));

interface ComponentRendererProps {
  config: {
    type: string;
    props: any;
  };
}

const ComponentLoader = () => (
  <div className="w-full h-48 flex items-center justify-center bg-slate-900/30 border border-slate-800 rounded-xl animate-pulse">
    <span className="text-xs font-mono text-cyan-500/50">[LOADING_COMPONENT_MODULE...]</span>
  </div>
);

const ComponentRenderer: React.FC<ComponentRendererProps> = ({ config }) => {
  const { type, props } = config;

  switch (type) {
    case 'chart':
      return (
        <Suspense fallback={<ComponentLoader />}>
          <DynamicChart {...props} />
        </Suspense>
      );
    case 'table':
      return <GenerativeTable {...props} />;
    default:
      return (
        <div className="p-3 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-xs font-mono">
          [ERROR: UNKNOWN_COMPONENT_TYPE: {type}]
        </div>
      );
  }
};

export default ComponentRenderer;
