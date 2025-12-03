import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SystemVisualizer from './SystemVisualizer';
import { SystemStats } from '../types';

// Mock Recharts to avoid ResizeObserver issues in JSDOM
vi.mock('recharts', () => {
  const OriginalModule = vi.importActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div className="recharts-responsive-container w-[800px] h-[800px]">
        {children}
      </div>
    ),
    AreaChart: () => <div>AreaChart</div>,
    Area: () => <div>Area</div>,
    XAxis: () => <div>XAxis</div>,
    YAxis: () => <div>YAxis</div>,
    Tooltip: () => <div>Tooltip</div>,
  };
});

// Mock LatticeVisualizer as it might use WebGL or complex logic
vi.mock('./LatticeVisualizer', () => ({
  default: () => <div data-testid="lattice-visualizer">Lattice Visualizer</div>
}));

describe('SystemVisualizer', () => {
  const mockStats: SystemStats = {
    currentTask: 'SYSTEM_IDLE',
    reflexLatency: [10, 20, 15],
    memoryDepth: [5, 10, 8],
    lastReflexTokens: 100,
    lastMemoryTokens: 200,
    reflexConfidence: 85,
    memoryConfidence: 90,
    neuroConfidence: 88,
    syncRate: 100,
    activeMemoryNodes: 128,
  };

  it('renders without crashing', () => {
    render(
      <SystemVisualizer 
        stats={mockStats} 
        isReflexActive={false} 
        isMemoryActive={false} 
      />
    );
    expect(screen.getByText('System Status')).toBeInTheDocument();
    expect(screen.getByText('SYSTEM_IDLE')).toBeInTheDocument();
  });

  it('displays active status for Reflex Core', () => {
    render(
      <SystemVisualizer 
        stats={{ ...mockStats, currentTask: 'PROCESSING_QUERY' }} 
        isReflexActive={true} 
        isMemoryActive={false} 
      />
    );
    expect(screen.getByText('Processing')).toBeInTheDocument();
    expect(screen.getByText('Reflex Core')).toBeInTheDocument();
  });

  it('displays active status for Memory Core', () => {
    render(
      <SystemVisualizer 
        stats={mockStats} 
        isReflexActive={false} 
        isMemoryActive={true} 
      />
    );
    expect(screen.getByText('Analyzing')).toBeInTheDocument();
    expect(screen.getByText('Memory Core')).toBeInTheDocument();
  });

  it('renders token usage stats', () => {
    render(
      <SystemVisualizer 
        stats={mockStats} 
        isReflexActive={false} 
        isMemoryActive={false} 
      />
    );
    expect(screen.getByText('100')).toBeInTheDocument(); // Reflex tokens
    expect(screen.getByText('200')).toBeInTheDocument(); // Memory tokens
  });

  it('renders confidence bars when heuristics are enabled', () => {
    render(
      <SystemVisualizer 
        stats={mockStats} 
        isReflexActive={false} 
        isMemoryActive={false}
        config={{ showHeuristics: true }}
      />
    );
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.getByText('88%')).toBeInTheDocument();
  });
});
