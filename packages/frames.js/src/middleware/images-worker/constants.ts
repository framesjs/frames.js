export const IMAGE_WORKER_DEFAULT_DYNAMIC_IMAGE_CACHE_CONTROL_HEADER =
  "public, immutable, no-transform, max-age=60";
/**
 * Header used to identify dynamic images, if the header is present the middleware will handle
 */
export const IMAGE_WORKER_DYNAMIC_IMAGE_FETCH_HEADER = "x-frames-dynamic-image";
