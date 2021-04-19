import { Request } from 'express';
import HttpResponse from './util/HttpResponse.js';

export default interface ControllerInterface {
	/**
	 * Execute the process
	 *
	 * @param {Request} req - Request
	 * @param {HttpResponse} response - HttpResponse
	 */
	execute(req: Request, response: HttpResponse): Promise<void>;
}
