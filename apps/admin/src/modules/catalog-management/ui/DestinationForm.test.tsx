import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DestinationForm } from './DestinationForm';

describe('DestinationForm', () => {
  it('maps the Vietnamese content fields to the public destination contract', async () => {
    const onSubmit = vi.fn();

    render(<DestinationForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Destination name'), {
      target: { value: 'Sơn Tràng cổ đàm' },
    });
    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'son-trang-co-dam' } });
    fireEvent.change(screen.getByLabelText('Summary'), {
      target: { value: 'Một hành trình di sản ven núi.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create destination' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'son-trang-co-dam',
          translations: [
            expect.objectContaining({
              locale: 'vi',
              name: 'Sơn Tràng cổ đàm',
              summary: 'Một hành trình di sản ven núi.',
            }),
          ],
        }),
      );
    });
  });
});
