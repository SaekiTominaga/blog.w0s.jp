import { Request, Response } from 'express';

export default interface ControllerInterface {
	/**
	 * Execute the process
	 *
	 * @param {Request} req - Request
	 * @param {Response} response - HttpResponse
	 */
	execute(req: Request, response: Response): Promise<void>;
}
