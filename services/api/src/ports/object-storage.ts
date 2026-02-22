export interface ObjectStoragePort {
  upload(
    key: string,
    data: Uint8Array | ReadableStream,
    contentType: string,
  ): Promise<{ key: string }>;
  download(key: string): Promise<{ data: ReadableStream; contentType: string }>;
  getSignedUrl(key: string, expiresInSeconds: number): Promise<string>;
  delete(key: string): Promise<void>;
}
