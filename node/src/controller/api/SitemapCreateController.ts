import auth from 'basic-auth';
import BlogSitemapDao from '../../dao/BlogSitemapDao.js';
import Controller from '../../Controller.js';
import ControllerInterface from '../../ControllerInterface.js';
import dayjs from 'dayjs';
import ejs from 'ejs';
import fs from 'fs';
// @ts-expect-error: ts(7016)
import htpasswd from 'htpasswd-js';
import xmlFormatter from 'xml-formatter';
import zlib from 'zlib';
import { BlogView } from '../../../@types/view.js';
import { NoName as ConfigureCommon } from '../../../configure/type/common.js';
import { NoName as Configure } from '../../../configure/type/sitemap-create.js';
import { Request, Response } from 'express';

/**
 * サイトマップ生成
 */
export default class SitemapCreateController extends Controller implements ControllerInterface {
	#configCommon: ConfigureCommon;
	#config: Configure;

	/**
	 * @param {ConfigureCommon} configCommon - 共通設定
	 */
	constructor(configCommon: ConfigureCommon) {
		super();

		this.#configCommon = configCommon;
		this.#config = <Configure>JSON.parse(fs.readFileSync('node/configure/sitemap-create.json', 'utf8'));
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

		const dao = new BlogSitemapDao(this.#configCommon);

		const [lastModifiedDto, entriesDto] = await Promise.all([
			dao.getLastModified(),
			dao.getEntries(
				this.#config.url_limit /* TODO: 厳密にはこの上限数から個別記事以外の URL 数を差し引いた数にする必要があるが、超充分に猶予があるのでとりあえずこれで */
			),
		]);

		const lastModified = dayjs(lastModifiedDto);
		const entries: BlogView.SitemapEntry[] = [];
		for (const entryDto of entriesDto) {
			entries.push({
				id: entryDto.id,
				last_modified: dayjs(entryDto.last_modified),
			});
		}

		const sitemapXml = await ejs.renderFile(`${this.#configCommon.views}/${this.#config.view_path}`, {
			last_modified: lastModified,
			entries: entries,
		});

		const sitemapXmlFormated = xmlFormatter(sitemapXml, {
			/* https://github.com/chrisbottin/xml-formatter#options */
			indentation: '\t',
			collapseContent: true,
			lineSeparator: '\n',
		});

		const sitemapXmlBrotli = zlib.brotliCompressSync(sitemapXmlFormated, {
			params: {
				[zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
				[zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
				[zlib.constants.BROTLI_PARAM_SIZE_HINT]: sitemapXmlFormated.length,
			},
		});

		/* ファイル出力 */
		const sitemapFilePath = `${this.#configCommon.static.root}${req.url}`;
		const sitemapBrotliFilePath = `${sitemapFilePath}.br`;

		await Promise.all([fs.promises.writeFile(sitemapFilePath, sitemapXmlFormated), fs.promises.writeFile(sitemapBrotliFilePath, sitemapXmlBrotli)]);
		this.logger.info(`Sitemap file created: ${sitemapFilePath}`);
		this.logger.info(`Sitemap Brotli file created: ${sitemapBrotliFilePath}`);

		res.status(204).end();
	}
}
