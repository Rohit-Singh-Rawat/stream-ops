import { VideosService } from './videos.service';
import { honoFactory } from '../../shared/hono-factory';
import { customZValidator } from '../../shared/zod-validator';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import { HTTP_INTERNAL_SERVER_ERROR } from '../../lib/constants';

const uploadUrlRequestSchema = z.object({
	filename: z.string().min(1),
	contentType: z
		.string()
		.min(1)
		.refine((value) => value.startsWith('video/'), {
			message: 'Content type must start with "video/"',
		}),
	size: z.number().min(1),
});

export class VideosController {
	private static instance: VideosController;
	private videosService: VideosService;

	private constructor() {
		this.videosService = VideosService.getInstance();
	}

	public static getInstance(): VideosController {
		if (!VideosController.instance) {
			VideosController.instance = new VideosController();
		}
		return VideosController.instance;
	}

	public getUploadUrlHandler = honoFactory.createHandlers(
		customZValidator('json', uploadUrlRequestSchema),
		async (ctx) => {
			try {
				const { filename, contentType, size } = ctx.req.valid('json');
				const result = await this.videosService.getuploadurl({
					filename,
					contentType,
					size,
					createdAt: new Date(),
					updatedAt: new Date(),
				});

				return ctx.json(result);
			} catch (error) {
				logger.error('Failed to get upload URL', {
					error: error instanceof Error ? error.message : String(error),
				});
				return ctx.json({ error: 'Failed to generate upload URL' }, HTTP_INTERNAL_SERVER_ERROR);
			}
		}
	);
}

export const getUploadUrlHandler = VideosController.getInstance().getUploadUrlHandler;
