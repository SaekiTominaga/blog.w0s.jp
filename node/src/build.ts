import fs from 'node:fs';
import Log4js from 'log4js';
import Component from './BuildComponentInterface.js';
import { NoName as Configure } from '../configure/type/common.js';

/* コンポーネント */
const COMPONENT_DIR = './build'; // 格納ディレクトリ
const COMPONENT_EXTENSION = '.js'; // 拡張子

/* 設定ファイル読み込み */
const config = <Configure>JSON.parse(await fs.promises.readFile('node/configure/common.json', 'utf8'));

/* Logger 設定 */
Log4js.configure(config.logger.path);
const logger = Log4js.getLogger();

const args = process.argv.slice(2);

const componentName = args.at(0); // 機能名
if (componentName === undefined) {
	logger.fatal('Component not specified');
}

/* コンポーネントの読み込みと実行 */
try {
	const component = new (await import(`${COMPONENT_DIR}/${componentName}${COMPONENT_EXTENSION}`)).default() as Component;
	await component.execute(args.slice(1));
} catch (e) {
	logger.fatal(e);
}
