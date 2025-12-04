import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CommandPalette, { CommandOption } from './CommandPalette';
import { Settings } from 'lucide-react';

describe('CommandPalette', () => {
  const mockOnClose = vi.fn();
  const mockAction1 = vi.fn();
  const mockAction2 = vi.fn();

  const commands: CommandOption[] = [
    {
      id: 'cmd1',
      label: 'Command One',
      description: 'Description One',
      icon: <Settings />,
      action: mockAction1,
      category: 'General',
    },
    {
      id: 'cmd2',
      label: 'Command Two',
      description: 'Description Two',
      icon: <Settings />,
      action: mockAction2,
      category: 'General',
    },
    {
      id: 'cmd3',
      label: 'Disabled Command',
      description: 'This is disabled',
      icon: <Settings />,
      action: vi.fn(),
      disabled: true,
      category: 'Advanced',
    },
  ];

  beforeEach(() => {
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(<CommandPalette isOpen={false} onClose={mockOnClose} commands={commands} />);
    expect(screen.queryByPlaceholderText('Type a command...')).not.toBeInTheDocument();
  });

  it('renders when isOpen is true', () => {
    render(<CommandPalette isOpen={true} onClose={mockOnClose} commands={commands} />);
    expect(screen.getByPlaceholderText('Type a command...')).toBeInTheDocument();
    expect(screen.getAllByText('Command One').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Command Two').length).toBeGreaterThan(0);
  });

  it('filters commands based on input', () => {
    render(<CommandPalette isOpen={true} onClose={mockOnClose} commands={commands} />);
    const input = screen.getByPlaceholderText('Type a command...');
    
    fireEvent.change(input, { target: { value: 'Two' } });
    
    expect(screen.queryByText('Command One')).not.toBeInTheDocument();
    expect(screen.getAllByText('Command Two').length).toBeGreaterThan(0);
  });

  it('navigates with arrow keys', () => {
    render(<CommandPalette isOpen={true} onClose={mockOnClose} commands={commands} />);
    
    // Initial selection should be first item
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Command One');

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Command Two');

    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Command One');
  });

  it('executes command on Enter', () => {
    render(<CommandPalette isOpen={true} onClose={mockOnClose} commands={commands} />);
    
    fireEvent.keyDown(window, { key: 'Enter' });
    
    expect(mockAction1).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('executes command on click', () => {
    render(<CommandPalette isOpen={true} onClose={mockOnClose} commands={commands} />);
    
    fireEvent.click(screen.getByText('Command Two'));
    
    expect(mockAction2).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not execute disabled command', () => {
    render(<CommandPalette isOpen={true} onClose={mockOnClose} commands={commands} />);
    
    fireEvent.click(screen.getByText('Disabled Command'));
    
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('closes on Escape', () => {
    render(<CommandPalette isOpen={true} onClose={mockOnClose} commands={commands} />);
    
    fireEvent.keyDown(window, { key: 'Escape' });
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes on backdrop click', () => {
    const { container } = render(<CommandPalette isOpen={true} onClose={mockOnClose} commands={commands} />);
    
    const backdrop = container.querySelector('.fixed > .absolute');
    if (backdrop) {
        fireEvent.click(backdrop);
        expect(mockOnClose).toHaveBeenCalled();
    } else {
        throw new Error('Backdrop not found');
    }
  });
  
  it('handles empty filtered results', () => {
      render(<CommandPalette isOpen={true} onClose={mockOnClose} commands={commands} />);
      const input = screen.getByPlaceholderText('Type a command...');
      fireEvent.change(input, { target: { value: 'NonExistent' } });
      expect(screen.getByText('No matching commands found.')).toBeInTheDocument();
  });

  it('renders without crashing when commands prop is empty', () => {
    render(<CommandPalette isOpen={true} onClose={mockOnClose} commands={[]} />);
    expect(screen.getByPlaceholderText('Type a command...')).toBeInTheDocument();
    expect(screen.getByText('No matching commands found.')).toBeInTheDocument();
  });
});
