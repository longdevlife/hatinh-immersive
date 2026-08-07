export class MediaUploadRuleError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'MediaUploadRuleError';
  }
}

export class MediaAssetNotFoundError extends Error {
  constructor(id: string) {
    super(`Media asset ${id} was not found.`);
    this.name = 'MediaAssetNotFoundError';
  }
}

export class MediaObjectMissingError extends Error {
  constructor() {
    super('The presigned upload object does not exist in storage.');
    this.name = 'MediaObjectMissingError';
  }
}
