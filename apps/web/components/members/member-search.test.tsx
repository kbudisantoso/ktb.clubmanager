import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemberSearch } from './member-search';

describe('MemberSearch', () => {
  it('renders with placeholder text', () => {
    render(<MemberSearch value="" onChange={vi.fn()} />);

    expect(screen.getByPlaceholderText('Name oder Mitgliedsnummer suchen...')).toBeInTheDocument();
  });

  it('calls onChange when typing', () => {
    const onChange = vi.fn();
    render(<MemberSearch value="" onChange={onChange} />);

    const input = screen.getByPlaceholderText('Name oder Mitgliedsnummer suchen...');
    fireEvent.change(input, { target: { value: 'Max' } });

    expect(onChange).toHaveBeenCalledWith('Max');
  });

  it('does not show clear button when value is empty', () => {
    render(<MemberSearch value="" onChange={vi.fn()} />);

    expect(screen.queryByLabelText('Suche loeschen')).not.toBeInTheDocument();
  });

  it('shows clear button when value is not empty', () => {
    render(<MemberSearch value="Max" onChange={vi.fn()} />);

    expect(screen.getByLabelText('Suche loeschen')).toBeInTheDocument();
  });

  it('clears value on X button click', () => {
    const onChange = vi.fn();
    render(<MemberSearch value="Max" onChange={onChange} />);

    fireEvent.click(screen.getByLabelText('Suche loeschen'));

    expect(onChange).toHaveBeenCalledWith('');
  });
});
