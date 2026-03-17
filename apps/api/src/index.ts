import { Hono } from 'hono';

import { cors } from 'hono/cors';
import { bodyLimit } from 'hono/body-limit';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import videosRoutes from './modules/videos/videos.routes';
type CorsConfig = Parameters<typeof cors>[0];
export const corsConfig: CorsConfig = {
	origin: (origin) => {
		if (!origin) {
			return process.env.NODE_ENV === 'development' ? '*' : null;
		}

		return origin;
	},
	allowHeaders: ['Content-Type', 'Authorization'],
	allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
	exposeHeaders: ['Content-Length'],
	maxAge: 600,
	credentials: true,
};

const app = new Hono()
	.use('*', logger())
	.use('*', secureHeaders())
	.use('*', bodyLimit({ maxSize: 1024 * 1024 }))
	.use('*', cors(corsConfig));

app.get('/', (c) => {
	return c.text('Hello Hono!');
});

app.route('/videos', videosRoutes);
export default app;
