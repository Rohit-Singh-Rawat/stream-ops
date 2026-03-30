import { honoFactory } from "../../shared/hono-factory";
import { VideosController } from "./videos.controller";

const videosController = VideosController.getInstance();

const videosRoutes = honoFactory
  .createApp()
  .get("/", ...videosController.listVideosHandler)
  .post("/", ...videosController.createVideoHandler)
  .get("/:id", ...videosController.getVideoHandler)
  .post("/:id/presign-upload", ...videosController.presignUploadHandler)
  .post("/:id/queue", ...videosController.queueTranscodeHandler)
  .post("/complete", ...videosController.completeUploadHandler)
  .post("/abort", ...videosController.abortUploadHandler);

export default videosRoutes;
