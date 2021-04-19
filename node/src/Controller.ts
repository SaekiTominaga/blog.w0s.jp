import Log4js from 'log4js';

export default class Controller {
	protected readonly logger: Log4js.Logger; // Logger

	constructor() {
		/* Logger */
		this.logger = Log4js.getLogger(this.constructor.name);
	}
}
