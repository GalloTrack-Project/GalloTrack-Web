import React, { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  );
}

function chooseFile(input: HTMLElement, file: File) {
  fireEvent.change(input, { target: { files: [file] } });
}

describe('ChickenPhotoField', () => {
  beforeEach(() => {
    processPhoto.mockReset();
    processPhoto.mockResolvedValue({
      full: new File(['full'], 'chicken-photo.webp', { type: 'image/webp' }),
      thumbnail: new File(['thumb'], 'chicken-photo-thumb.webp', { type: 'image/webp' }),
      previewUrl: '',
    });
  });

  it('rejects wrong file types', () => {
    render(<Harness />);
    chooseFile(
      screen.getByLabelText('Choose a photo for Hatch Silver'),
      new File(['hello'], 'notes.txt', { type: 'text/plain' }),
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a JPG, PNG or WebP image.');
  });

  it('rejects files over 5 MB', () => {
    render(<Harness />);
    const file = new File(['x'], 'large.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024 + 1 });
    chooseFile(screen.getByLabelText('Choose a photo for Hatch Silver'), file);
    expect(screen.getByRole('alert')).toHaveTextContent('Photo must be 5 MB or smaller.');
  });

  it.each([
    ['image/jpeg', 'bird.jpg'],
    ['image/png', 'bird.png'],
    ['image/webp', 'bird.webp'],
  ])('accepts %s and shows the crop step', (type, name) => {
    render(<Harness />);
    chooseFile(
      screen.getByLabelText('Choose a photo for Hatch Silver'),
      new File(['image'], name, { type }),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByTestId('photo-cropper')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Use photo' })).toBeInTheDocument();
  });

  it('processes the cropped photo and marks it ready for save', async () => {
    render(<Harness />);
    chooseFile(
      screen.getByLabelText('Choose a photo for Hatch Silver'),
      new File(['image'], 'bird.webp', { type: 'image/webp' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Use photo' }));
    await waitFor(() => expect(processPhoto).toHaveBeenCalled());
    expect(await screen.findByText(/New photo ready/i)).toBeInTheDocument();
  });

  it('discards a pending crop when cancelled', () => {
    render(<Harness />);
    chooseFile(
      screen.getByLabelText('Choose a photo for Hatch Silver'),
      new File(['image'], 'bird.png', { type: 'image/png' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel crop' }));
    expect(screen.queryByTestId('photo-cropper')).not.toBeInTheDocument();
    expect(screen.queryByText(/New photo ready/i)).not.toBeInTheDocument();
    expect(processPhoto).not.toHaveBeenCalled();
  });

  it('marks an existing photo for removal', () => {
    render(<Harness imageUrl="https://cdn.test/old.jpg" />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove photo for Hatch Silver' }));
    expect(screen.getByText(/Photo will be removed when you save/i)).toBeInTheDocument();
  });

  it('shows the missing storage setup message instead of failing silently', () => {
    render(<Harness uploadError={CHICKEN_PHOTO_SETUP_MESSAGE} />);
    expect(screen.getByRole('alert')).toHaveTextContent(CHICKEN_PHOTO_SETUP_MESSAGE);
  });

  it('shows upload progress', () => {
    render(<Harness uploading />);
    expect(screen.getByRole('progressbar', { name: 'Photo upload progress' })).toHaveAttribute(
      'aria-valuenow',
      '40',
    );
    expect(screen.getByText(/Uploading photo/i)).toBeInTheDocument();
  });

  it('hides upload and remove controls without edit permission', () => {
    render(<Harness canEdit={false} imageUrl="https://cdn.test/old.jpg" />);
    expect(screen.queryByRole('button', { name: /Upload photo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Replace photo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remove photo/i })).not.toBeInTheDocument();
    expect(screen.getByText(/do not have permission/i)).toBeInTheDocument();
  });
});
