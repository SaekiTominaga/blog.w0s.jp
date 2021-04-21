import { Request, Response } from 'express';
import HttpResponse from './util/HttpResponse.js';

export default interface ControllerInterface {
	/**
	 * Execute the process
	 *
	 * @param {Request} req - Request
	 * @param {Response|HttpResponse} response - HttpResponse
	 */
	execute(req: Request, response: Response | HttpResponse): Promise<void>;
}
