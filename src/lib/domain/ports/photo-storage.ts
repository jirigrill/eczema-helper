/**
 * Metadata associated with a photo upload.
 */
export type PhotoUploadMetadata = {
  childId: string;
  date: string;
  bodyArea?: string;
  photoType: 'skin' | 'stool';
};

/**
 * Pending upload entry for offline sync.
 */
export type PendingUpload = {
  photoId: string;
  encryptedBlob: ArrayBuffer;
  encryptedThumb: ArrayBuffer;
  metadata: PhotoUploadMetadata;
};

export interface PhotoStorage {
  upload(
    encryptedBlob: ArrayBuffer,
    metadata: PhotoUploadMetadata
  ): Promise<{ blobRef: string }>;

  uploadThumbnail(
    encryptedBlob: ArrayBuffer,
    blobRef: string
  ): Promise<{ thumbRef: string }>;

  download(blobRef: string): Promise<ArrayBuffer>;

  downloadThumbnail(thumbRef: string): Promise<ArrayBuffer>;

  delete(blobRef: string): Promise<void>;

  getPendingUploads(): Promise<PendingUpload[]>;

  markUploaded(photoId: string): Promise<void>;
}
