import React, { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ChickenPhotoField from '@/components/ChickenPhotoField';
import { CHICKEN_PHOTO_SETUP_MESSAGE } from '@/lib/chicken-photo';

const processPhoto = vi.hoisted(() => vi.fn());

vi.mock('react-easy-crop', () => ({
  default: () => <div data-testid="photo-cropper" />,
}));

vi.mock('@/lib/chicken-photo', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/chicken-photo')>();
  return { ...actual, processChickenPhoto: processPhoto };
});

const createObjectURL = vi.fn(() => 'blob:preview');
const revokeObjectURL = vi.fn();

function Harness({
  canEdit = true,
  imageUrl = null,
  uploadError = null,
  uploading = false,
}: {
  canEdit?: boolean;
  imageUrl?: string | null;
  uploadError?: string | null;
  uploading?: boolean;
}) {
  const [pending, setPending] = useState<{ full: File; thumbnail: File } | null>(null);
  const [removed, setRemoved] = useState(false);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <ChickenPhotoField
        name="Hatch Silver"
        code="1A1"
        imageUrl={imageUrl}
        pendingFile={pending?.full ?? null}
        pendingThumbnail={pending?.thumbnail ?? null}
        removed={removed}
        uploading={uploading}
        uploadProgress={40}
        uploadError={uploadError}
        canEdit={canEdit}
        onPendingChange={(files) => {
          setPending(files);
          if (files) setRemoved(false);
        }}
        onRemove={() => {
          setPending(null);
          setRemoved(true);
        }}
      />
    </form>
  );
}

function chooseFile(input: HTMLElement, file: File) {
  fireEvent.change(input, { target: { files: [file] } });
}

const fileInput = () => screen.getByLabelText('Choose a photo for Hatch Silver (1A1)');
const dropzone = () => screen.getByTestId('chicken-photo-dropzone');

describe('ChickenPhotoField', () => {
  beforeEach(() => {
    processPhoto.mockReset();
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: revokeObjectURL,
    });
    processPhoto.mockResolvedValue({
      full: new File(['full'], 'chicken-photo.webp', { type: 'image/webp' }),
      thumbnail: new File(['thumb'], 'chicken-photo-thumb.webp', { type: 'image/webp' }),
      previewUrl: '',
    });
  });

  it('shows a single dropzone empty state with optional helper text', () => {
    render(<Harness />);
    expect(screen.getByText('Click to upload or drag and drop')).toBeInTheDocument();
    expect(screen.getByText('JPG, PNG or WebP, up to 5 MB')).toBeInTheDocument();
    expect(screen.getByText('Optional')).toBeInTheDocument();
    expect(screen.queryByText(/1600px|256px|Alt text/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('rejects wrong file types with the friendly message', () => {
    render(<Harness />);
    chooseFile(fileInput(), new File(['hello'], 'notes.txt', { type: 'text/plain' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Unsupported file. Please upload a JPG, PNG or WebP image.',
    );
  });

  it('rejects files over 5 MB and reports the actual size', () => {
    render(<Harness />);
    const file = new File(['x'], 'large.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024 + 1 });
    chooseFile(fileInput(), file);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This file is 5.1 MB. Maximum size is 5 MB.',
    );
  });

  it.each([
    ['image/jpeg', 'bird.jpg'],
    ['image/png', 'bird.png'],
    ['image/webp', 'bird.webp'],
  ])('accepts %s and shows the crop step', (type, name) => {
    render(<Harness />);
    chooseFile(fileInput(), new File(['image'], name, { type }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByTestId('photo-cropper')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use photo' })).toBeInTheDocument();
  });

  it('processes the cropped photo and shows its file name and size', async () => {
    render(<Harness />);
    chooseFile(fileInput(), new File(['image'], 'bird.webp', { type: 'image/webp' }));
    fireEvent.click(screen.getByRole('button', { name: 'Use photo' }));
    await waitFor(() => expect(processPhoto).toHaveBeenCalled());
    expect(await screen.findByText('bird.webp')).toBeInTheDocument();
    expect(screen.getByText('5 B')).toBeInTheDocument();
    expect(screen.getByText('Ready to save')).toBeInTheDocument();
  });

  it('discards a pending crop when cancelled', () => {
    render(<Harness />);
    chooseFile(fileInput(), new File(['image'], 'bird.png', { type: 'image/png' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel crop' }));
    expect(screen.queryByTestId('photo-cropper')).not.toBeInTheDocument();
    expect(screen.queryByText('Ready to save')).not.toBeInTheDocument();
    expect(processPhoto).not.toHaveBeenCalled();
  });

  it('accepts a dropped photo', () => {
    render(<Harness />);
    fireEvent.drop(dropzone(), {
      dataTransfer: { files: [new File(['image'], 'dropped.jpg', { type: 'image/jpeg' })] },
    });
    expect(screen.getByTestId('photo-cropper')).toBeInTheDocument();
  });

  it('accepts a pasted photo from the clipboard', () => {
    render(<Harness />);
    fireEvent.paste(dropzone(), {
      clipboardData: { files: [new File(['image'], 'pasted.png', { type: 'image/png' })] },
    });
    expect(screen.getByTestId('photo-cropper')).toBeInTheDocument();
  });

  it('changes the dropzone copy while dragging a photo over it', () => {
    render(<Harness />);
    fireEvent.dragEnter(dropzone(), { dataTransfer: { files: [] } });
    expect(screen.getAllByText('Drop photo to upload').length).toBeGreaterThan(0);
    fireEvent.dragLeave(dropzone(), { dataTransfer: { files: [] } });
    expect(screen.queryAllByText('Drop photo to upload')).toHaveLength(0);
  });

  it('asks for confirmation before removing an existing photo', () => {
    render(<Harness imageUrl="https://cdn.test/old.jpg" />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    const confirm = screen.getByRole('group', { name: 'Confirm photo removal' });
    expect(confirm).toHaveTextContent('Remove this photo?');
    fireEvent.click(within(confirm).getByRole('button', { name: 'Remove' }));
    expect(screen.getByText(/Photo will be removed when you save/i)).toBeInTheDocument();
  });

  it('shows the generic upload failure message with a retry action', () => {
    render(<Harness uploadError="Network error during photo upload." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Upload failed. Please try again.');
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
  });

  it('shows the missing storage setup message without a retry action', () => {
    render(<Harness uploadError={CHICKEN_PHOTO_SETUP_MESSAGE} />);
    expect(screen.getByRole('alert')).toHaveTextContent(CHICKEN_PHOTO_SETUP_MESSAGE);
    expect(screen.queryByRole('button', { name: /Retry/i })).not.toBeInTheDocument();
  });

  it('shows upload progress', () => {
    render(<Harness uploading imageUrl="https://cdn.test/old.jpg" />);
    expect(screen.getByRole('progressbar', { name: 'Photo upload progress' })).toHaveAttribute(
      'aria-valuenow',
      '40',
    );
    expect(screen.getByText(/Uploading photo/i)).toBeInTheDocument();
  });

  it('hides upload and remove controls without edit permission', () => {
    render(<Harness canEdit={false} imageUrl="https://cdn.test/old.jpg" />);
    expect(screen.queryByRole('button', { name: /Replace/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remove/i })).not.toBeInTheDocument();
    expect(screen.getByText(/do not have permission/i)).toBeInTheDocument();
  });
});
