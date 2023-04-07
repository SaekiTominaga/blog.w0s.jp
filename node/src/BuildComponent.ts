import fs from 'fs';
import Log4js from 'log4js';
import { NoName as ConfigureCommon } from '../configure/type/common.js';
import { NoName as ConfigureBuild } from '../configure/type/build.js';

export default class BuildComponent {
	protected readonly logger: Log4js.Logger; // Logger

	protected readonly configCommon: ConfigureCommon; // Configure

	protected readonly configBuild: ConfigureBuild; // Configure

	constructor() {
		/* Logger */
		this.logger = Log4js.getLogger(this.constructor.name);

		this.configCommon = JSON.parse(fs.readFileSync('node/configure/common.json', 'utf8'));
		this.configBuild = JSON.parse(fs.readFileSync('node/configure/build.json', 'utf8'));
	}
}
