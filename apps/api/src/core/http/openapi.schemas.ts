const dateTimeSchema = { type: 'string', format: 'date-time' };
const uuidSchema = { type: 'string', format: 'uuid' };

const mediaAssetProperties = {
  id: uuidSchema,
  mediaKind: { type: 'string', enum: ['panorama', 'image', 'audio', 'model3d'] },
  originalFilename: { type: 'string' },
  contentType: { type: 'string' },
  sizeBytes: { type: 'integer' },
  storageKey: { type: 'string' },
  status: { type: 'string', enum: ['pending', 'uploaded', 'processing', 'ready', 'failed'] },
  etag: { type: 'string', nullable: true },
  failureCode: { type: 'string', nullable: true },
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
  uploadedAt: { ...dateTimeSchema, nullable: true },
  readyAt: { ...dateTimeSchema, nullable: true },
};

export const mediaAssetAdminResponseSchema = {
  type: 'object',
  required: [
    'id',
    'mediaKind',
    'originalFilename',
    'contentType',
    'sizeBytes',
    'storageKey',
    'status',
    'etag',
    'failureCode',
    'createdAt',
    'updatedAt',
    'uploadedAt',
    'readyAt',
  ],
  properties: mediaAssetProperties,
};

export const mediaPresignResponseSchema = {
  type: 'object',
  required: ['asset', 'uploadUrl', 'expiresInSeconds', 'requiredHeaders'],
  properties: {
    asset: mediaAssetAdminResponseSchema,
    uploadUrl: { type: 'string', format: 'uri' },
    expiresInSeconds: { type: 'integer' },
    requiredHeaders: { type: 'object', additionalProperties: { type: 'string' } },
  },
};

const translationSchema = {
  type: 'object',
  required: ['locale', 'name', 'summary', 'description'],
  properties: {
    locale: { type: 'string', example: 'vi' },
    name: { type: 'string', example: 'Sơn Trang Cổ Đạm' },
    summary: { type: 'string' },
    description: { type: 'string' },
  },
};

const geoPointSchema = {
  type: 'object',
  required: ['latitude', 'longitude'],
  properties: {
    latitude: { type: 'number', example: 18.3421 },
    longitude: { type: 'number', example: 105.9032 },
  },
};

export const destinationPreviewResponseSchema = {
  type: 'object',
  required: ['id', 'slug', 'name', 'summary', 'coverImageUrl', 'categoryLabel'],
  properties: {
    id: uuidSchema,
    slug: { type: 'string' },
    name: { type: 'string' },
    summary: { type: 'string' },
    coverImageUrl: { type: 'string', nullable: true },
    categoryLabel: { type: 'string', nullable: true },
  },
};

export const destinationDetailResponseSchema = {
  type: 'object',
  required: [
    'id',
    'slug',
    'name',
    'summary',
    'coverImageUrl',
    'categoryLabel',
    'status',
    'description',
    'categoryId',
    'defaultSceneId',
    'geoPoint',
    'coverMediaId',
  ],
  properties: {
    ...destinationPreviewResponseSchema.properties,
    status: { type: 'string', enum: ['draft', 'published', 'archived'] },
    description: { type: 'string' },
    categoryId: { ...uuidSchema, nullable: true },
    defaultSceneId: { ...uuidSchema, nullable: true },
    geoPoint: { ...geoPointSchema, nullable: true },
    coverMediaId: { ...uuidSchema, nullable: true },
  },
};

export const destinationAdminResponseSchema = {
  type: 'object',
  required: [
    'id',
    'slug',
    'status',
    'categoryId',
    'geoPoint',
    'defaultSceneId',
    'coverMediaId',
    'translations',
    'createdAt',
    'updatedAt',
  ],
  properties: {
    id: uuidSchema,
    slug: { type: 'string' },
    status: { type: 'string', enum: ['draft', 'published', 'archived'] },
    categoryId: { ...uuidSchema, nullable: true },
    geoPoint: { ...geoPointSchema, nullable: true },
    defaultSceneId: { ...uuidSchema, nullable: true },
    coverMediaId: { ...uuidSchema, nullable: true },
    translations: { type: 'array', items: translationSchema },
    createdAt: dateTimeSchema,
    updatedAt: dateTimeSchema,
  },
};

export const sceneNodeResponseSchema = {
  type: 'object',
  required: [
    'id',
    'destinationId',
    'name',
    'lat',
    'lng',
    'altitude',
    'panoramaAssetId',
    'panoramaAssetStatus',
    'panoramaManifestUrl',
    'panoramaPreviewUrl',
    'initialHeading',
    'initialPitch',
    'initialFov',
    'status',
    'sortOrder',
  ],
  properties: {
    id: uuidSchema,
    destinationId: uuidSchema,
    name: { type: 'string' },
    lat: { type: 'number' },
    lng: { type: 'number' },
    altitude: { type: 'number', nullable: true },
    panoramaAssetId: { ...uuidSchema, nullable: true },
    panoramaAssetStatus: {
      type: 'string',
      enum: ['pending', 'uploaded', 'processing', 'ready', 'failed'],
      nullable: true,
    },
    panoramaManifestUrl: { type: 'string', format: 'uri', nullable: true },
    panoramaPreviewUrl: { type: 'string', format: 'uri', nullable: true },
    initialHeading: { type: 'number' },
    initialPitch: { type: 'number' },
    initialFov: { type: 'number' },
    status: { type: 'string', enum: ['draft', 'published', 'archived'] },
    sortOrder: { type: 'integer' },
  },
};

export const sceneNodeAdminResponseSchema = {
  type: 'object',
  required: [
    'id',
    'destinationId',
    'name',
    'geoPoint',
    'altitude',
    'panoramaAssetId',
    'panoramaAssetStatus',
    'initialHeading',
    'initialPitch',
    'initialFov',
    'status',
    'sortOrder',
    'createdAt',
    'updatedAt',
  ],
  properties: {
    id: uuidSchema,
    destinationId: uuidSchema,
    name: { type: 'string' },
    geoPoint: geoPointSchema,
    altitude: { type: 'number', nullable: true },
    panoramaAssetId: { ...uuidSchema, nullable: true },
    panoramaAssetStatus: {
      type: 'string',
      enum: ['pending', 'uploaded', 'processing', 'ready', 'failed'],
      nullable: true,
    },
    initialHeading: { type: 'number' },
    initialPitch: { type: 'number' },
    initialFov: { type: 'number' },
    status: { type: 'string', enum: ['draft', 'published', 'archived'] },
    sortOrder: { type: 'integer' },
    createdAt: dateTimeSchema,
    updatedAt: dateTimeSchema,
  },
};

export const sceneLinkResponseSchema = {
  type: 'object',
  required: ['id', 'fromSceneId', 'toSceneId', 'yaw', 'pitch', 'bidirectional', 'sortOrder'],
  properties: {
    id: uuidSchema,
    fromSceneId: uuidSchema,
    toSceneId: uuidSchema,
    yaw: { type: 'number', minimum: 0, maximum: 360, exclusiveMaximum: true },
    pitch: { type: 'number', minimum: -90, maximum: 90 },
    bidirectional: { type: 'boolean' },
    sortOrder: { type: 'integer' },
  },
};

export const sceneLinkAdminResponseSchema = {
  type: 'object',
  required: [
    'id',
    'fromSceneId',
    'toSceneId',
    'fromDestinationId',
    'toDestinationId',
    'yaw',
    'pitch',
    'bidirectional',
    'sortOrder',
    'createdAt',
    'updatedAt',
  ],
  properties: {
    ...sceneLinkResponseSchema.properties,
    fromDestinationId: uuidSchema,
    toDestinationId: uuidSchema,
    createdAt: dateTimeSchema,
    updatedAt: dateTimeSchema,
  },
};

export const hotspotResponseSchema = {
  type: 'object',
  required: ['id', 'sceneId', 'type', 'yaw', 'pitch', 'payload', 'status'],
  properties: {
    id: uuidSchema,
    sceneId: uuidSchema,
    type: { type: 'string', enum: ['information', 'media', 'audio', 'external'] },
    yaw: { type: 'number', minimum: 0, maximum: 360, exclusiveMaximum: true },
    pitch: { type: 'number', minimum: -90, maximum: 90 },
    payload: { type: 'object', additionalProperties: true },
    status: { type: 'string', enum: ['draft', 'published', 'archived'] },
  },
};

export const hotspotAdminResponseSchema = {
  type: 'object',
  required: [
    'id',
    'sceneId',
    'type',
    'yaw',
    'pitch',
    'payload',
    'status',
    'createdAt',
    'updatedAt',
  ],
  properties: {
    ...hotspotResponseSchema.properties,
    createdAt: dateTimeSchema,
    updatedAt: dateTimeSchema,
  },
};

export const immersiveManifestResponseSchema = {
  type: 'object',
  required: ['destination', 'defaultSceneId', 'nodes', 'links', 'hotspots'],
  properties: {
    destination: destinationDetailResponseSchema,
    defaultSceneId: { ...uuidSchema, nullable: true },
    nodes: { type: 'array', items: sceneNodeResponseSchema },
    links: { type: 'array', items: sceneLinkResponseSchema },
    hotspots: { type: 'array', items: hotspotResponseSchema },
  },
};

export const sceneNeighborResponseSchema = {
  type: 'object',
  required: ['link', 'scene'],
  properties: {
    link: sceneLinkResponseSchema,
    scene: sceneNodeResponseSchema,
  },
};
