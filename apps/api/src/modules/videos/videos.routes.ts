import { honoFactory } from '../../shared/hono-factory';
import { VideosController } from './videos.controller';

const videosController = VideosController.getInstance();

const videosRoutes = honoFactory
	.createApp()
	.post('/upload-url', ...videosController.getUploadUrlHandler)
	.post('/complete', ...videosController.completeUploadHandler)
	.post('/abort', ...videosController.abortUploadHandler);

export default videosRoutes;
