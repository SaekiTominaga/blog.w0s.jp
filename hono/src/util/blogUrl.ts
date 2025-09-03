import { env } from './env.ts';

/**
 * 記事 URL を取得する
 *
 * @param id - 記事 ID
 *
 * @returns 記事 URL
 */
export const getEntryUrl = (id: number): string => `${env('ORIGIN')}/entry/${String(id)}`;
