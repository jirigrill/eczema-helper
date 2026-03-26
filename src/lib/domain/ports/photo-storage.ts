export interface PhotoStorage {
  upload(
    encryptedBlob: ArrayBuffer,
    metadata: { childId: string; date: string; bodyArea: string }
  ): Promise<{ blobRef: string }>;

  uploadThumbnail(
    encryptedBlob: ArrayBuffer,
    blobRef: string
  ): Promise<{ thumbRef: string }>;

  download(blobRef: string): Promise<ArrayBuffer>;

  downloadThumbnail(thumbRef: string): Promise<ArrayBuffer>;

  delete(blobRef: string): Promise<void>;

  getPendingUploads(): Promise<
    { photoId: string; encryptedBlob: ArrayBuffer; encryptedThumb: ArrayBuffer; metadata: unknown }[]
  >;

  markUploaded(photoId: string): Promise<void>;
}
