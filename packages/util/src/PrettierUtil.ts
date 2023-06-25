import fs from 'node:fs';
import prettier from 'prettier';

/**
 * Prettier Utility
 */
export default class PrettierUtil {
	/**
	 * 構成ファイルの内容を取得する
	 *
	 * @param configPath - 構成ファイルのパス
	 *
	 * @returns 構成内容
	 */
	static async loadConfig(configPath: string): Promise<prettier.Config> {
		return JSON.parse((await fs.promises.readFile(configPath)).toString());
	}

	/**
	 * 構成ファイルの `overrides` に指定された内容を上書きする
	 *
	 * {
	 *   "printWidth": 100,
	 *   "overrides": [
	 *     {
	 *       "files": "*.foo",
	 *       "options": {
	 *         "printWidth": 200,
	 *       }
	 *     }
	 *   ]
	 * }
	 *
	 * ↓
	 *
	 * {
	 *   "printWidth": 200
	 * }
	 *
	 * @param config - 構成内容
	 * @param overrideFilesPattern - `overrides` の `files` に指定されたパターン
	 *
	 * @returns 構成内容
	 */
	static configOverrideAssign(config: prettier.Config, overrideFilesPattern: string): prettier.Options {
		if (config.overrides === undefined) {
			return config;
		}

		const overrideOptions = config.overrides.find((override) => {
			const files = typeof override.files === 'string' ? [override.files] : override.files;
			return files.includes(overrideFilesPattern);
		})?.options;

		if (overrideOptions !== undefined) {
			Object.assign(config, overrideOptions);
		}
		delete config.overrides;

		return config;
	}
}
