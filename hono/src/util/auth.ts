import crypto from 'node:crypto';
import fs from 'node:fs';
import { basicAuth as basicAuthHono } from 'hono/basic-auth';
import type { MiddlewareHandler } from 'hono/types';

interface Auth {
	user: string;
	password: string;
	password_orig?: string;
	realm: string;
}

/**
 * 認証ファイルを読み取る
 *
 * @param authPath - 認証ファイル（JSON）のパス
 *
 * @returns 認証ファイルの内容
 */
export const getAuth = async (authPath: string): Promise<Auth> => JSON.parse((await fs.promises.readFile(authPath)).toString()) as Readonly<Auth>;

/**
 * 認証ファイルを読み取る
 *
 * @param options - オプション
 * @param options.authPath - 認証ファイル（JSON）のパス
 * @param options.unauthorizedMessage - ユーザー名が無効な場合のカスタム メッセージ
 *
 * @returns 認証ファイルの内容
 */
export const basicAuth = async (
	options: Readonly<{
		authPath: string;
		invalidUserMessage: string;
	}>,
): Promise<MiddlewareHandler> => {
	const auth = await getAuth(options.authPath);

	return basicAuthHono({
		verifyUser: (username, password) => {
			const passwordHash = crypto.hash('sha256', password);
			return username === auth.user && passwordHash === auth.password;
		},
		realm: auth.realm,
		invalidUserMessage: options.invalidUserMessage,
	});
};
