import fs from 'node:fs';
import { env } from './env.js';

interface Auth {
	user: string;
	password: string;
	password_orig?: string;
	realm: string;
}

/**
 * 認証ファイルを読み取る
 *
 * @returns 認証ファイルの内容
 */
export const getAuth = async (): Promise<Auth> => {
	const filePath = env('AUTH_ADMIN');

	return JSON.parse((await fs.promises.readFile(filePath)).toString()) as Auth;
};
