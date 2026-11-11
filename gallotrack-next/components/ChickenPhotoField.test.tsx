import React, { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ChickenPhotoField from '@/components/ChickenPhotoField';
import { CHICKEN_PHOTO_SETUP_MESSAGE } from '@/lib/chicken-photo';

const processPhoto = vi.hoisted(() => vi.fn());

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
  onProcessingChange,
}: {
  canEdit?: boolean;
  imageUrl?: string | null;
  uploadError?: string | null;
  uploading?: boolean;
  onProcessingChange?: (processing: boolean) => void;
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
        onProcessingChange={onProcessingChange}
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
  ])('previews %s immediately and processes it without a crop step', async (type, name) => {
    render(<Harness />);
    chooseFile(fileInput(), new File(['image'], name, { type }));

    expect(screen.queryByTestId('photo-cropper')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Use photo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel crop' })).not.toBeInTheDocument();
    expect(await screen.findByRole('img', { name: 'Hatch Silver (1A1)' })).toHaveClass(
      'object-contain',
    );

    await waitFor(() => expect(processPhoto).toHaveBeenCalledTimes(1));
    expect(processPhoto).toHaveBeenCalledWith(expect.any(File));
    expect(await screen.findByText('Ready to save')).toBeInTheDocument();
  });

  it('shows the selected file name and size', async () => {
    render(<Harness />);
    chooseFile(fileInput(), new File(['image'], 'bird.webp', { type: 'image/webp' }));
    await waitFor(() => expect(processPhoto).toHaveBeenCalled());
    expect(await screen.findByText('bird.webp')).toBeInTheDocument();
    expect(screen.getByText('5 B')).toBeInTheDocument();
  });

  it('reports client-side processing so the form can block save', async () => {
    let resolveProcess!: (value: {
      full: File;
      thumbnail: File;
    }) => void;
    processPhoto.mockReturnValue(
      new Promise((resolve) => {
        resolveProcess = resolve;
      }),
    );
    const onProcessingChange = vi.fn();

    render(<Harness onProcessingChange={onProcessingChange} />);
    chooseFile(fileInput(), new File(['image'], 'bird.png', { type: 'image/png' }));

    expect(onProcessingChange).toHaveBeenCalledWith(true);

    await act(async () => {
      resolveProcess({
        full: new File(['full'], 'chicken-photo.webp', { type: 'image/webp' }),
        thumbnail: new File(['thumb'], 'chicken-photo-thumb.webp', { type: 'image/webp' }),
      });
    });

    await waitFor(() => expect(onProcessingChange).toHaveBeenCalledWith(false));
    expect(await screen.findByText('Ready to save')).toBeInTheDocument();
  });

  it('cancels processing and discards the selection', async () => {
    let resolveProcess!: (value: {
      full: File;
      thumbnail: File;
    }) => void;
    processPhoto.mockReturnValue(
      new Promise((resolve) => {
        resolveProcess = resolve;
      }),
    );

    render(<Harness />);
    chooseFile(fileInput(), new File(['image'], 'bird.png', { type: 'image/png' }));

    expect(
      screen.getByRole('progressbar', { name: 'Photo processing progress' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(
      screen.queryByRole('progressbar', { name: 'Photo processing progress' }),
    ).not.toBeInTheDocument();

    await act(async () => {
      resolveProcess({
        full: new File(['full'], 'chicken-photo.webp', { type: 'image/webp' }),
        thumbnail: new File(['thumb'], 'chicken-photo-thumb.webp', { type: 'image/webp' }),
      });
    });
    expect(screen.queryByText('Ready to save')).not.toBeInTheDocument();
  });

  it('accepts a dropped photo and processes it automatically', async () => {
    render(<Harness />);
    fireEvent.drop(dropzone(), {
      dataTransfer: { files: [new File(['image'], 'dropped.jpg', { type: 'image/jpeg' })] },
    });
    await waitFor(() => expect(processPhoto).toHaveBeenCalled());
    expect(await screen.findByText('dropped.jpg')).toBeInTheDocument();
  });

  it('accepts a pasted photo and processes it automatically', async () => {
    render(<Harness />);
    fireEvent.paste(dropzone(), {
      clipboardData: { files: [new File(['image'], 'pasted.png', { type: 'image/png' })] },
    });
    await waitFor(() => expect(processPhoto).toHaveBeenCalled());
    expect(await screen.findByText('pasted.png')).toBeInTheDocument();
  });

  it('changes the dropzone copy while dragging a photo over it', () => {
    render(<Harness />);
    fireEvent.dragEnter(dropzone(), { dataTransfer: { files: [] } });
    expect(screen.getAllByText('Drop photo to upload').length).toBeGreaterThan(0);
    fireEvent.dragLeave(dropzone(), { dataTransfer: { files: [] } });
    expect(screen.queryAllByText('Drop photo to upload')).toHaveLength(0);
  });

  it('renders an existing photo whole and opens the lightbox', async () => {
    render(<Harness imageUrl="https://cdn.test/old.jpg" />);
    const img = await screen.findByRole('img', { name: 'Hatch Silver (1A1)' });
    expect(img).toHaveClass('object-contain');

    fireEvent.click(screen.getByRole('button', { name: 'View larger photo of Hatch Silver (1A1)' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('asks for confirmation before removing an existing photo', async () => {
    render(<Harness imageUrl="https://cdn.test/old.jpg" />);
    await screen.findByRole('img', { name: 'Hatch Silver (1A1)' });
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

  it('hides upload and remove controls without edit permission', async () => {
    render(<Harness canEdit={false} imageUrl="https://cdn.test/old.jpg" />);
    await screen.findByRole('img', { name: 'Hatch Silver (1A1)' });
    expect(screen.queryByRole('button', { name: /Replace/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remove/i })).not.toBeInTheDocument();
    expect(screen.getByText(/do not have permission/i)).toBeInTheDocument();
  });
});
