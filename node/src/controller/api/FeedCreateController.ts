import auth from 'basic-auth';
import BlogFeedDao from '../../dao/BlogFeedDao.js';
import Controller from '../../Controller.js';
import ControllerInterface from '../../ControllerInterface.js';
import dayjs from 'dayjs';
import ejs from 'ejs';
import fs from 'fs';
// @ts-expect-error: ts(7016)
import htpasswd from 'htpasswd-js';
import MessageParser from '../../util/MessageParser.js';
import zlib from 'zlib';
import { BlogView } from '../../../@types/view.js';
import { NoName as ConfigureCommon } from '../../../configure/type/common';
import { NoName as Configure } from '../../../configure/type/feed-create.js';
import { Request, Response } from 'express';

/**
 * フィード生成
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
		/* Basic 認証 */
		const credentials = auth(req);
		if (
			credentials === undefined ||
			!(await htpasswd.authenticate({
				username: credentials.name,
				password: credentials.pass,
				file: this.#config.auth.htpasswd_file,
			}))
		) {
			res
				.status(401)
				.set('WWW-Authenticate', `Basic realm="${this.#config.auth.realm}"`)
				.json(this.#config.auth.json_401);
			return;
		}

		const dao = new BlogFeedDao(this.#configCommon);

		const entriesDto = await dao.getEntries(this.#config.maximum_number);

		const entries: BlogView.FeedEntry[] = [];
		for (const entryDto of entriesDto) {
			const id = entryDto.id;

			entries.push({
				id: id,
				title: entryDto.title,
				message: await new MessageParser(this.#configCommon, await dao.getDbh(), id).toXml(entryDto.message),
				last_modified: dayjs(entryDto.last_modified),
				update: entryDto.update,
			});
		}

		if (entries[0] === undefined) {
			this.logger.info('Feed file was not created because there were zero data.');

			res.status(204).end();
			return;
		}

		const feedXml = await ejs.renderFile(`${this.#configCommon.views}/${this.#config.view_path}`, {
			last_modified: entries[0].last_modified,
			entries: entries,
		});

		const feedXmlBrotli = zlib.brotliCompressSync(feedXml, {
			params: {
				[zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
				[zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
				[zlib.constants.BROTLI_PARAM_SIZE_HINT]: feedXml.length,
			},
		});

		/* ファイル出力 */
		const feedFilePath = `${this.#configCommon.static.root}${req.url}`;
		const feedBrotliFilePath = `${feedFilePath}.br`;

		await Promise.all([fs.promises.writeFile(feedFilePath, feedXml), fs.promises.writeFile(feedBrotliFilePath, feedXmlBrotli)]);
		this.logger.info(`Feed file created: ${feedFilePath}`);
		this.logger.info(`Feed Brotli file created: ${feedBrotliFilePath}`);

		res.status(204).end();
	}
}
