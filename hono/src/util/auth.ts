import crypto from 'node:crypto';
import { promisify } from 'node:util';
import fs from 'node:fs';
import { basicAuth as basicAuthHono } from 'hono/basic-auth';
import type { MiddlewareHandler } from 'hono/types';

interface Auth {
	username: string;
	password: {
		salt: string;
		hash: string;
		orig?: string;
	};
}

const scrypt = promisify(crypto.scrypt);

const verifyPassword = async (
	password: string,
	stored: {
		saltBase64: string;
		hashBase64: string;
	},
): Promise<boolean> => {
	const salt = Buffer.from(stored.saltBase64, 'base64');
	const storedHash = Buffer.from(stored.hashBase64, 'base64');

	const hash = (await scrypt(password, salt, storedHash.length)) as Buffer;

	return crypto.timingSafeEqual(hash, storedHash);
};

/**
 * 認証ファイルを読み取る
 *
 * @param authFilePath - 認証ファイル（JSON）のパス
 *
 * @returns 認証データ
 */
export const getAuthFile = async (authFilePath: string): Promise<Auth[]> => JSON.parse((await fs.promises.readFile(authFilePath)).toString()) as Auth[];

/**
 * 認証
 *
 * @param options - オプション
 * @param options.authFilePath - 認証ファイル（JSON）のパス
 * @param options.realm - realm 値
 *
 * @returns 認証ファイルの内容
 */
export const basicAuth = async (
	options: Readonly<{
		authFilePath: string;
		realm: string;
	}>,
): Promise<MiddlewareHandler> => {
	const credentials = await getAuthFile(options.authFilePath);

	return basicAuthHono({
		verifyUser: (username, password) => {
			const matchCredential = credentials.find((credential) => username === credential.username);

			if (matchCredential === undefined) {
				return false;
			}

			return verifyPassword(password, {
				saltBase64: matchCredential.password.salt,
				hashBase64: matchCredential.password.hash,
			});
		},
		realm: options.realm,
	});
};
