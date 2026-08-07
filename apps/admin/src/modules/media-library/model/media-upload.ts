import type {
  CompleteMediaUpload200,
  PresignMediaUploadBody,
  completeMediaUploadResponse,
  presignMediaUploadResponse,
} from '@hatinh/api-client';

export type MediaUploadClient = {
  complete: (id: string) => Promise<completeMediaUploadResponse>;
  presign: (body: PresignMediaUploadBody) => Promise<presignMediaUploadResponse>;
  put: (url: string, init: RequestInit) => Promise<Response>;
};

function assertStatus(actual: number, expected: number, operation: string): void {
  if (actual !== expected) {
    throw new Error(`${operation.toUpperCase()}_FAILED_${actual}`);
  }
}

export async function uploadMediaFile(
  file: File,
  client: MediaUploadClient,
  mediaKind: PresignMediaUploadBody['mediaKind'] = 'panorama',
): Promise<CompleteMediaUpload200> {
  const presigned = await client.presign({
    contentType: file.type || 'application/octet-stream',
    mediaKind,
    originalFilename: file.name,
    sizeBytes: file.size,
  });
  assertStatus(presigned.status, 201, 'presign');

  const uploadResponse = await client.put(presigned.data.uploadUrl, {
    body: file,
    headers: {
      ...presigned.data.requiredHeaders,
      ...(file.type ? { 'Content-Type': file.type } : {}),
    },
    method: 'PUT',
  });
  if (!uploadResponse.ok) {
    throw new Error(`DIRECT_UPLOAD_FAILED_${uploadResponse.status}`);
  }

  const completed = await client.complete(presigned.data.asset.id);
  assertStatus(completed.status, 200, 'complete');
  return completed.data;
}
