import fs from 'fs';
import prettier from 'prettier';

/**
 * Prettier Utility
 */
export default class PrettierUtil {
	/**
	 * 構成ファイルの内容を取得する
	 *
	 * @param {string} configPath - Pritter 構成ファイルのパス
	 * @param {string} parser - parser オプション値
	 * @param {string} overrideFilePattern - `overrides` の `files` に指定されたパターン
	 *
	 * @returns {object} 構成内容
	 */
	static async getOptions(configPath: string, parser: prettier.BuiltInParserName, overrideFilePattern?: string): Promise<prettier.Options> {
		const config: prettier.Config = JSON.parse((await fs.promises.readFile(configPath)).toString());

		/* overrides */
		if (overrideFilePattern !== undefined) {
			const overrideOptions = config.overrides?.find((override) => {
				const files = typeof override.files === 'string' ? [override.files] : override.files;
				return files.includes(overrideFilePattern);
			})?.options;

			Object.assign(config, overrideOptions);
		}
		delete config.overrides;

		return Object.assign(config, { parser: parser });
	}
}
