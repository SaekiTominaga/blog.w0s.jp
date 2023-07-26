import basicAuth from 'basic-auth';
// @ts-expect-error: ts(7016)
import htpasswd from 'htpasswd-js';
import type { Request } from 'express';

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
	 * @param req - Request
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
	 * @param filePath - htpasswd file path
	 *
	 * @returns true if the authentication passes
	 */
	async htpasswd(filePath: string): Promise<boolean> {
		const result = await (htpasswd.authenticate({
			username: this.#credentials?.username,
			password: this.#credentials?.password,
			file: filePath,
		}) as Promise<boolean>);
		return result;
	}

	/**
	 * Get credentials
	 *
	 * @returns Credentials
	 */
	getCredentials(): Credentials | null {
		return this.#credentials;
	}
}
