import { handleImagesWorkerRequest } from './images-worker';
import { handleFramesRequest} from './frames';

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);

    if (url.pathname === "/images") {
      return handleImagesWorkerRequest(req);
    }

    return handleFramesRequest(req, env, ctx);
  },
} satisfies ExportedHandler;
