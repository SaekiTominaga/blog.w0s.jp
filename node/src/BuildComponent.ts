import fs from 'node:fs';
import Log4js from 'log4js';
import { NoName as ConfigureCommon } from '../configure/type/common.js';

export default class BuildComponent {
	protected readonly logger: Log4js.Logger; // Logger

	protected readonly configCommon: ConfigureCommon; // Configure

	constructor() {
		/* Logger */
		this.logger = Log4js.getLogger(this.constructor.name);

		this.configCommon = JSON.parse(fs.readFileSync('node/configure/common.json', 'utf8'));
	}
}
