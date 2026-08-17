import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ImmersiveTranscriptContent } from '../../../shared/contracts';
import { ImmersiveTranscriptPanel } from './ImmersiveTranscriptPanel';

const content: ImmersiveTranscriptContent = {
  locale: 'vi',
  title: 'Câu chuyện Thiên Cầm',
  segments: [
    { id: 'one', startMs: 0, endMs: 1_000, text: 'Bờ biển mở ra trước mắt.' },
    { id: 'two', startMs: 1_000, text: 'Hành trình tiếp tục theo lối dạo.' },
  ],
};

describe('ImmersiveTranscriptPanel semantic contract', () => {
  it('renders transcript content as readable segments and closes through the action', () => {
    const onClose = vi.fn();

    render(<ImmersiveTranscriptPanel content={content} onClose={onClose} />);

    expect(screen.getByRole('dialog', { name: 'Bản chép lời' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Câu chuyện Thiên Cầm' })).toBeInTheDocument();
    expect(screen.getByText('Bờ biển mở ra trước mắt.')).toBeInTheDocument();
    expect(screen.getByText('Hành trình tiếp tục theo lối dạo.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Đóng bản chép lời' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
