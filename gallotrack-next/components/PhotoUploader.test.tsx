import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import PhotoUploader, { type PhotoUploaderValue } from '@/components/PhotoUploader';

const value: PhotoUploaderValue = {
  previewSrc: 'blob:preview',
  fullSrc: 'blob:preview',
  fileName: 'hatch-silver.webp',
  fileSize: 4.7 * 1024 * 1024,
  statusLabel: 'Ready to save',
};

function renderUploader(overrides: Partial<React.ComponentProps<typeof PhotoUploader>> = {}) {
  const props = {
    value: null,
    onChange: vi.fn(),
    onRemove: vi.fn(),
    alt: 'Hatch Silver (1A1)',
    ...overrides,
  };
  render(<PhotoUploader {...props} />);
  return props;
}

describe('PhotoUploader', () => {
  it('selects a file from the dropzone picker', () => {
    const props = renderUploader();
    const input = screen.getByLabelText('Choose a photo for Hatch Silver (1A1)');
    const file = new File(['image'], 'bird.webp', { type: 'image/webp' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(props.onChange).toHaveBeenCalledWith(file);
  });

  it('shows the uploaded file details and confirms removal', () => {
    const props = renderUploader({ value });
    expect(screen.getByText('hatch-silver.webp')).toBeInTheDocument();
    expect(screen.getByText('4.7 MB')).toBeInTheDocument();
    expect(screen.getByText('Ready to save')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    const confirm = screen.getByRole('group', { name: 'Confirm photo removal' });
    fireEvent.click(within(confirm).getByRole('button', { name: 'Remove' }));
    expect(props.onRemove).toHaveBeenCalled();
  });

  it('opens a lightbox from the preview', () => {
    renderUploader({ value });
    fireEvent.click(screen.getByRole('button', { name: 'View larger photo of Hatch Silver (1A1)' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hatch Silver (1A1)' })).toBeInTheDocument();
  });

  it('shows the whole photo with object-contain in the form preview', () => {
    renderUploader({ value });
    expect(screen.getByRole('img', { name: 'Hatch Silver (1A1)' })).toHaveClass('object-contain');
  });

  it('shows progress and a cancel action while uploading', () => {
    const onCancelUpload = vi.fn();
    renderUploader({ value, uploading: true, uploadProgress: 62, onCancelUpload });
    expect(screen.getByRole('progressbar', { name: 'Photo upload progress' })).toHaveAttribute(
      'aria-valuenow',
      '62',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancelUpload).toHaveBeenCalled();
  });

  it('shows processing progress and a cancel action', () => {
    const onCancelUpload = vi.fn();
    renderUploader({ value, processing: true, onCancelUpload });
    expect(
      screen.getByRole('progressbar', { name: 'Photo processing progress' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Processing photo/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancelUpload).toHaveBeenCalled();
  });

  it('shows an error with a retry action', () => {
    const onRetry = vi.fn();
    renderUploader({ value, error: 'Upload failed. Please try again.', onRetry });
    expect(screen.getByRole('alert')).toHaveTextContent('Upload failed. Please try again.');
    fireEvent.click(screen.getByRole('button', { name: /Retry/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('disables editing when requested but keeps the preview viewable', () => {
    renderUploader({ value, disabled: true });
    expect(screen.queryByRole('button', { name: 'Replace' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'View larger photo of Hatch Silver (1A1)' }),
    ).toBeEnabled();
  });
});
