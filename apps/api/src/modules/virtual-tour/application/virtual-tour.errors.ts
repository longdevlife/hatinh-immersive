export class VirtualTourNotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} '${id}' was not found.`);
    this.name = 'VirtualTourNotFoundError';
  }
}
