import type Component from './BuildComponentInterface.js';

/* コンポーネント */
const COMPONENT_DIR = './build'; // 格納ディレクトリ
const COMPONENT_EXTENSION = '.js'; // 拡張子

const args = process.argv.slice(2);

const componentName = args.at(0); // 機能名
if (componentName === undefined) {
	console.error('Component not specified');
} else {
	/* コンポーネントの読み込みと実行 */
	try {
		const component = new (await import(`${COMPONENT_DIR}/${componentName}${COMPONENT_EXTENSION}`)).default() as Component;
		await component.execute(args.slice(1));
	} catch (e) {
		console.error(e);
	}
}
