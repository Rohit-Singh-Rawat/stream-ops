import { honoFactory } from '../../shared/hono-factory';
import { VideosController } from './videos.controller';

const videosController = VideosController.getInstance();

const videosRoutes = honoFactory
	.createApp()
	.post('/upload-url', ...videosController.getUploadUrlHandler);

export default videosRoutes;
