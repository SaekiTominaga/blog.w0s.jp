import Log4js from 'log4js';
import { env } from '@w0s/env-value-type';
import configDsg from '../config/dsg.ts';
import DSGDao from '../db/DSG.ts';
import type { DSG as ProcessDSGResult } from '../../@types/process.d.ts';

const logger = Log4js.getLogger('DSG');

/**
 * DSG キャッシュクリア
 *
 * @returns 処理結果
 */
const clear = async (): Promise<ProcessDSGResult> => {
	try {
		const dao = new DSGDao(env('SQLITE_BLOG'));

		const date = await dao.updateModified();

		logger.info(`Modified date of DB was recorded: ${date.toString()}`);

		return { success: true, message: configDsg.processMessage.success, date: date };
	} catch (e) {
		logger.error(e);

		return { success: false, message: configDsg.processMessage.failure };
	}
};

export default clear;
