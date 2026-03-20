import type { Context } from 'hono';
import config from '../config/hono.ts';

/**
 * API 機能へのリクエストかどうか
 *
 * @param context - Context
 *
 * @returns API 機能へのリクエストなら true
 */
export const isApi = (context: Context): boolean => {
	const { req } = context;

	return req.path.startsWith(`/${config.api.dir}/`) && config.api.allowMethods.includes(req.method);
};
