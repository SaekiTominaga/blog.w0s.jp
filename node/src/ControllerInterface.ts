/* eslint-disable semi */
import { Request, Response } from 'express';

export default interface ControllerInterface {
	/**
	 * Execute the process
	 *
	 * @param {Request} req - Request
	 * @param {Response} res - Response
	 */
	execute(req: Request, res: Response): Promise<void>;
}
