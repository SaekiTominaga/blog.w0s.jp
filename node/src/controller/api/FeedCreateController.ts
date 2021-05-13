import BlogFeedDao from '../../dao/BlogFeedDao.js';
import Controller from '../../Controller.js';
import ControllerInterface from '../../ControllerInterface.js';
import dayjs from 'dayjs';
import ejs from 'ejs';
import fs from 'fs';
import MessageParser from '../../util/MessageParser.js';
import zlib from 'zlib';
import { BlogView } from '../../../@types/view.js';
import { NoName as ConfigureCommon } from '../../../configure/type/common.js';
import { NoName as Configure } from '../../../configure/type/feed-create.js';
import { Request, Response } from 'express';

/**
 * フィード作成
 */
export default class FeedCreateController extends Controller implements ControllerInterface {
	#configCommon: ConfigureCommon;
	#config: Configure;

	/**
	 * @param {ConfigureCommon} configCommon - 共通設定
	 */
	constructor(configCommon: ConfigureCommon) {
		super();

		this.#configCommon = configCommon;
		this.#config = <Configure>JSON.parse(fs.readFileSync('node/configure/feed-create.json', 'utf8'));
	}

	/**
	 * @param {Request} req - Request
	 * @param {Response} res - Response
	 */
	async execute(req: Request, res: Response): Promise<void> {
		const feedFilePath = `${this.#configCommon.static.root}${req.url}`;
		const brotliFilePath = `${feedFilePath}.br`;

		const dao = new BlogFeedDao(this.#configCommon);

		const dbLastModified = await dao.getLastModified();
		const feedFileLastModified = fs.statSync(feedFilePath).mtime;

		if (dbLastModified <= feedFileLastModified) {
			this.logger.warn(`DB mtime: ${dbLastModified} <= File mtime: ${feedFileLastModified}`);
		}

		const entries: BlogView.FeedEntry[] = [];
		for (const topicData of await dao.getTopics(this.#config.maximum_number)) {
			const id = topicData.id;

			entries.push({
				id: id,
				title: topicData.title,
				message: await new MessageParser(this.#configCommon, await dao.getDbh(), id).toXml(topicData.message),
				last_updated: dayjs(topicData.date),
				update: Boolean(topicData.last_update),
			});
		}

		const feedXml = await ejs.renderFile(this.#config.view_path, {
			entries: entries,
		});

		zlib.brotliCompress(
			feedXml,
			{
				params: {
					[zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
					[zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
					[zlib.constants.BROTLI_PARAM_SIZE_HINT]: feedXml.length,
				},
			},
			(error, binary) => {
				if (error !== null) {
					throw error;
				}

				fs.writeFileSync(feedFilePath, feedXml);
				this.logger.info(`Feed file created: ${feedFilePath}`);

				fs.writeFileSync(brotliFilePath, binary);
				this.logger.info(`Feed Brotli file created: ${brotliFilePath}`);
			}
		);

		res.status(204).end();
	}
}
