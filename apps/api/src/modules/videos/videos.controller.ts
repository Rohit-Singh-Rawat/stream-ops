import { VideosService } from "./videos.service";
import { honoFactory } from "../../shared/hono-factory";
import { customZValidator } from "../../shared/zod-validator";
import { z } from "zod";
import { logger } from "../../utils/logger";
import {
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_NOT_FOUND,
} from "../../lib/constants";

const uuidLikeSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
    message: "id must be a UUID",
  });

const idParamSchema = z.object({
  id: uuidLikeSchema,
});

const listVideosQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const SUPPORTED_VIDEO_TYPES = new Set(["video/mp4", "video/webm"]);

const createVideoSchema = z.object({
  name: z.string().min(1),
  size: z.number().min(1),
  type: z
    .string()
    .min(1)
    .refine((value) => SUPPORTED_VIDEO_TYPES.has(value.toLowerCase()), {
      message: "type must be one of: video/mp4, video/webm",
    }),
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

  public listVideosHandler = honoFactory.createHandlers(
    customZValidator("query", listVideosQuerySchema),
    async (ctx) => {
      try {
        const { limit } = ctx.req.valid("query");
        const result = await this.videosService.listVideos({ limit });
        return ctx.json(result);
      } catch (error) {
        logger.error("Failed to list videos", {
          error: error instanceof Error ? error.message : String(error),
        });
        return ctx.json(
          { error: "Failed to list videos" },
          HTTP_INTERNAL_SERVER_ERROR,
        );
      }
    },
  );

  public createVideoHandler = honoFactory.createHandlers(
    customZValidator("json", createVideoSchema),
    async (ctx) => {
      try {
        const { name, size, type } = ctx.req.valid("json");
        const result = await this.videosService.createVideo({
          name,
          size,
          type,
        });
        return ctx.json(result);
      } catch (error) {
        logger.error("Failed to create video", {
          error: error instanceof Error ? error.message : String(error),
        });
        return ctx.json(
          { error: "Failed to create video" },
          HTTP_INTERNAL_SERVER_ERROR,
        );
      }
    },
  );

  public getVideoHandler = honoFactory.createHandlers(
    customZValidator("param", idParamSchema),
    async (ctx) => {
      try {
        const { id } = ctx.req.valid("param");
        const result = await this.videosService.getVideoById(id);
        if (!result) {
          return ctx.json({ error: "Not found" }, HTTP_NOT_FOUND);
        }
        return ctx.json(result);
      } catch (error) {
        logger.error("Failed to get video", {
          error: error instanceof Error ? error.message : String(error),
        });
        return ctx.json(
          { error: "Failed to get video" },
          HTTP_INTERNAL_SERVER_ERROR,
        );
      }
    },
  );

  public presignUploadHandler = honoFactory.createHandlers(
    customZValidator("param", idParamSchema),
    async (ctx) => {
      try {
        const { id } = ctx.req.valid("param");
        const result = await this.videosService.presignUpload(id);
        if (!result) {
          return ctx.json({ error: "Not found" }, HTTP_NOT_FOUND);
        }
        return ctx.json(result);
      } catch (error) {
        logger.error("Failed to presign upload", {
          error: error instanceof Error ? error.message : String(error),
        });
        return ctx.json(
          { error: "Failed to presign upload" },
          HTTP_INTERNAL_SERVER_ERROR,
        );
      }
    },
  );

  public queueTranscodeHandler = honoFactory.createHandlers(
    customZValidator("param", idParamSchema),
    async (ctx) => {
      try {
        const { id } = ctx.req.valid("param");
        await this.videosService.queueTranscode(id);
        return ctx.json({ ok: true });
      } catch (error) {
        logger.error("Failed to queue transcode", {
          error: error instanceof Error ? error.message : String(error),
        });
        return ctx.json(
          { error: "Failed to queue transcode" },
          HTTP_INTERNAL_SERVER_ERROR,
        );
      }
    },
  );

  public completeUploadHandler = honoFactory.createHandlers(
    customZValidator("json", completeUploadSchema),
    async (ctx) => {
      try {
        const { key, uploadId } = ctx.req.valid("json");
        await this.videosService.completeUpload({ key, uploadId });
        return ctx.json({ ok: true });
      } catch (error) {
        logger.error("Failed to complete upload", {
          error: error instanceof Error ? error.message : String(error),
        });
        return ctx.json(
          { error: "Failed to complete upload" },
          HTTP_INTERNAL_SERVER_ERROR,
        );
      }
    },
  );

  public abortUploadHandler = honoFactory.createHandlers(
    customZValidator("json", abortUploadSchema),
    async (ctx) => {
      try {
        const { key, uploadId } = ctx.req.valid("json");
        await this.videosService.abortUpload({ key, uploadId });
        return ctx.json({ ok: true });
      } catch (error) {
        logger.error("Failed to abort upload", {
          error: error instanceof Error ? error.message : String(error),
        });
        return ctx.json(
          { error: "Failed to abort upload" },
          HTTP_INTERNAL_SERVER_ERROR,
        );
      }
    },
  );

  public deleteAllVideosHandler = honoFactory.createHandlers(
    async (ctx) => {
      try {
        const result = await this.videosService.deleteAllVideos();
        return ctx.json(result);
      } catch (error) {
        logger.error("Failed to delete all videos", {
          error: error instanceof Error ? error.message : String(error),
        });
        return ctx.json(
          { error: "Failed to delete all videos" },
          HTTP_INTERNAL_SERVER_ERROR,
        );
      }
    },
  );
}
