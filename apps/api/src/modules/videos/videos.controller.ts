import { VideosService } from './videos.service';
import { honoFactory } from '../../shared/hono-factory';
import { customZValidator } from '../../shared/zod-validator';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import { HTTP_INTERNAL_SERVER_ERROR } from '../../lib/constants';

const uploadUrlRequestSchema = z.object({
	name: z.string().min(1),
	mimeType: z
		.string()
		.min(1)
		.refine((value) => value.startsWith('video/'), {
			message: 'Content type must start with "video/"',
		}),
	size: z.number().min(1),
	folderId: z.string().min(1).nullable().optional(),
});

const completeUploadSchema = z.object({
	key: z.string().min(1),
	uploadId: z.string().min(1),
});

const abortUploadSchema = z.object({
	key: z.string().min(1),
	uploadId: z.string().min(1),
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
				const { name, mimeType, size } = ctx.req.valid('json');
				const result = await this.videosService.initiateUpload({
					name,
					mimeType,
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

	public completeUploadHandler = honoFactory.createHandlers(
		customZValidator('json', completeUploadSchema),
		async (ctx) => {
			try {
				const { key, uploadId } = ctx.req.valid('json');
				await this.videosService.completeUpload({ key, uploadId });
				return ctx.json({ ok: true });
			} catch (error) {
				logger.error('Failed to complete upload', {
					error: error instanceof Error ? error.message : String(error),
				});
				return ctx.json({ error: 'Failed to complete upload' }, HTTP_INTERNAL_SERVER_ERROR);
			}
		}
	);

	public abortUploadHandler = honoFactory.createHandlers(
		customZValidator('json', abortUploadSchema),
		async (ctx) => {
			try {
				const { key, uploadId } = ctx.req.valid('json');
				await this.videosService.abortUpload({ key, uploadId });
				return ctx.json({ ok: true });
			} catch (error) {
				logger.error('Failed to abort upload', {
					error: error instanceof Error ? error.message : String(error),
				});
				return ctx.json({ error: 'Failed to abort upload' }, HTTP_INTERNAL_SERVER_ERROR);
			}
		}
	);
}

export const getUploadUrlHandler = VideosController.getInstance().getUploadUrlHandler;
