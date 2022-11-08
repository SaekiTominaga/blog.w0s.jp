import basicAuth from 'basic-auth';
// @ts-expect-error: ts(7016)
import htpasswd from 'htpasswd-js';
import { Request } from 'express';

export interface Credentials {
	username: string;
	password: string;
}

/**
 * Basic authentication
 */
export default class HttpBasicAuth {
	#credentials: Credentials | null = null;

	/**
	 * @param {Request} req - Request
	 */
	constructor(req: Request) {
		const credentials = basicAuth(req);
		if (credentials !== undefined) {
			this.#credentials = {
				username: credentials.name,
				password: credentials.pass,
			};
		}
	}

	/**
	 * Basic authentication
	 *
	 * @param {string} filePath - htpasswd file path
	 *
	 * @returns {boolean} true if the authentication passes
	 */
	async htpasswd(filePath: string): Promise<boolean> {
		const result = await htpasswd.authenticate({
			username: this.#credentials?.username,
			password: this.#credentials?.password,
			file: filePath,
		});
		return result;
	}

	/**
	 * Get credentials
	 *
	 * @returns {Credentials} Credentials
	 */
	getCredentials(): Credentials | null {
		return this.#credentials;
	}
}
