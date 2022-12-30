import * as sqlite from 'sqlite';
import dayjs from 'dayjs';
import GithubSlugger from 'github-slugger';
import hljs from 'highlight.js/lib/core';
import hljsCss from 'highlight.js/lib/languages/css';
import hljsJavaScript from 'highlight.js/lib/languages/javascript';
import hljsJson from 'highlight.js/lib/languages/json';
import hljsTypeScript from 'highlight.js/lib/languages/typescript';
import hljsXml from 'highlight.js/lib/languages/xml';
import IsbnVerify from '@saekitominaga/isbn-verify';
import Log4js from 'log4js';
import md5 from 'md5';
import PaapiItemImageUrlParser from '@saekitominaga/paapi-item-image-url-parser';
import path from 'path';
import serialize from 'w3c-xmlserializer';
import { JSDOM } from 'jsdom';
import { LanguageFn } from 'highlight.js';
import BlogMessageDao from '../dao/BlogMessageDao.js';
import Inline from './@message/Inline.js';
import Util from './@message/Util.js';
import { NoName as Configure } from '../../configure/type/common.js';

interface Option {
	entry_id: number; // 記事 ID
	dbh: sqlite.Database; // DB 接続情報
	anchorHostIcons: {
		host: string;
		name: string;
		src: string;
	}[]; // リンクのサイトアイコン
	amazon_tracking_id: string; // Amazon トラッキング ID
}

/**
 * 記事メッセージのパーサー
 */
export default class MessageParser {
	/* Logger */
	readonly #logger: Log4js.Logger;

	/* 設定ファイル */
	readonly #config: Configure;

	/* 記事 ID */
	readonly #entryId: number = 0;

	/* Slugger */
	readonly #slugger: GithubSlugger;

	/* jsdom */
	readonly #document: Document;

	/* Dao */
	readonly #dao: BlogMessageDao;

	/* 記事内に埋め込みツイートが存在するか */
	#tweetExist = false;

	/* （記事メッセージ内の）ルート要素 */
	readonly #rootElement: HTMLElement;
	readonly #ROOT_ELEMENT_NAME = 'x-x'; // ルート要素名（仮で設定するものなのでなんでも良い）

	/* インライン */
	readonly #inline: Inline;

	/* section */
	readonly #SECTION_ID_PREFIX = 'section-';
	#section1 = false;
	readonly #section1Elements: HTMLElement[] = [];
	readonly #section1Headings: Map<string, string> = new Map();
	#section2 = false;
	readonly #section2Elements: HTMLElement[] = [];

	/* リスト */
	#ul = false;
	#ulElement: HTMLUListElement | undefined;
	#links = false;
	#linksElement: HTMLUListElement | undefined;
	#ol = false;
	#olElement: HTMLOListElement | undefined;
	#dl = false;
	#dlElement: HTMLDListElement | undefined;
	#notes = false;
	#notesElement: HTMLUListElement | undefined;

	/* 引用 */
	#quote = false;
	#quoteFigureElement: HTMLElement | undefined;
	#quoteElement: HTMLQuoteElement | undefined;
	#quoteCite = false;
	#quoteTitle: string | undefined; // 引用元タイトル
	#quoteUrl: URL | undefined; // 引用元 URL
	#quoteLanguage: string | undefined; // 引用文の言語

	/* コード */
	#code = false;
	#codeBody: string | undefined; // コード文字列
	#codeLanguage: string | undefined; // 言語
	readonly #highLightJsLanguageRegisted: Set<string> = new Set();

	/* 表 */
	#tableElement: HTMLTableElement | undefined;
	#thead = false;
	#theadData: string[][] = [];
	#tbody = false;
	#tbodyData: string[][] = [];

	/* 汎用ボックス */
	#box = false;
	#boxElement: HTMLElement | undefined;

	/* メディア */
	#media = false;
	#mediaWrapElement: HTMLElement | undefined;
	#imageNum = 1; /* 画像の番号 */
	#videoNum = 1; /* 動画の番号 */

	/**
	 * コンストラクタ
	 *
	 * @param {Configure} config - 共通設定ファイル
	 * @param {object} options - パースで必要な様々な情報
	 */
	constructor(config: Configure, options?: Partial<Option>) {
		/* Logger */
		this.#logger = Log4js.getLogger(options?.entry_id !== undefined ? `${this.constructor.name} (ID: ${options.entry_id})` : this.constructor.name);

		/* 設定ファイル */
		this.#config = config;

		/* 記事 ID */
		if (options?.entry_id !== undefined) {
			this.#entryId = options.entry_id;
		}

		/* Slugger */
		this.#slugger = new GithubSlugger();

		/* jsdom */
		this.#document = new JSDOM().window.document;

		/* Dao */
		this.#dao = new BlogMessageDao(config, options?.dbh);

		/* ルート要素 */
		this.#rootElement = this.#document.createElement(this.#ROOT_ELEMENT_NAME);

		/* インライン */
		const inlineOptions: Map<string, unknown> = new Map();
		inlineOptions.set('entry_id', this.#entryId);
		if (options?.anchorHostIcons !== undefined) {
			inlineOptions.set('anchor_host_icons', options.anchorHostIcons);
		}
		if (options?.amazon_tracking_id !== undefined) {
			inlineOptions.set('amazon_tracking_id', options.amazon_tracking_id);
		}
		inlineOptions.set('section_id_prefix', this.#SECTION_ID_PREFIX);
		this.#inline = new Inline(this.#config, Object.fromEntries(inlineOptions));
	}

	/**
	 * HTML に変換する
	 *
	 * @param {string} message - 本文
	 *
	 * @returns {string} HTML
	 */
	async toHtml(message: string): Promise<string> {
		await this.#mark(message);

		return this.#rootElement.innerHTML;
	}

	/**
	 * XML に変換する
	 *
	 * @param {string} message - 本文
	 *
	 * @returns {string} XML
	 */
	async toXml(message: string): Promise<string> {
		await this.#mark(message);

		const xml = serialize(this.#rootElement);
		return xml.substring(39 + this.#ROOT_ELEMENT_NAME.length, xml.length - 3 - this.#ROOT_ELEMENT_NAME.length); // 外枠の <x xmlns="http://www.w3.org/1999/xhtml"></x> を削除
	}

	/**
	 * 記事に埋め込みツイートが含まれているか
	 *
	 * @returns {boolean} 1つ以上ツイートがあれば true
	 */
	isTweetExit(): boolean {
		return this.#tweetExist;
	}

	/**
	 * 本文文字列をパースして DOM に変換する
	 *
	 * @param {string} message - 本文
	 */
	async #mark(message: string): Promise<void> {
		const CRLF = '\r\n';
		const LF = '\n';

		for (const line of message.replaceAll(CRLF, LF).split(LF)) {
			const firstCharactor = line.substring(0, 1); // 先頭文字

			if (this.#code) {
				if (line === '```') {
					/* コードの終端になったらそれまでの蓄積分を append する */
					this.#appendCode();

					this.#code = false;
					this.#codeBody = undefined;
					this.#codeLanguage = undefined;
				} else {
					/* 終端になるまでコード文字列を蓄積する */
					this.#codeBody = this.#codeBody === undefined ? line : `${this.#codeBody}${LF}${line}`;
				}

				continue;
			}

			if (this.#quoteCite && firstCharactor !== '?') {
				this.#appendQuoteCite();

				this.#quoteTitle = undefined;
				this.#quoteUrl = undefined;
				this.#quoteLanguage = undefined;
			}

			if (!this.#thead && !this.#tbody) {
				this.#appendTableSection();
			}

			if (line === '') {
				/* コード内以外の空行ではフラグのリセットのみを行う */
				this.#resetStackFlag();

				continue;
			}

			switch (firstCharactor) {
				case '#': {
					if (line === '#') {
						this.#section1 = false;
						this.#section2 = false;

						this.#appendSectionBreak();

						this.#resetStackFlag();

						continue;
					} else if (line === '##') {
						this.#section2 = false;

						this.#appendSectionBreak();

						this.#resetStackFlag();

						continue;
					} else if (line.startsWith('# ')) {
						/* 先頭が # な場合は見出し（h2） */
						const headingText = line.substring(2); // 先頭記号を削除

						this.#appendSection1(headingText);

						this.#resetStackFlag();
						this.#section1 = true;
						this.#section2 = false;

						continue;
					} else if (line.startsWith('## ')) {
						/* 先頭が ** な場合は見出し（h3） */
						const headingText = line.substring(3); // 先頭記号を削除

						this.#appendSection2(headingText);

						this.#resetStackFlag();
						this.#section2 = true;

						continue;
					}
					break;
				}
				case '-': {
					if (line.startsWith('- ')) {
						/* 先頭が - な場合は順不同リスト */
						const listText = line.substring(2); // 先頭記号を削除

						this.#appendUl(listText);

						this.#resetStackFlag();
						this.#ul = true;

						continue;
					} else if (line.startsWith('-- ')) {
						/* 先頭が -- な場合はリンクリスト */
						const listText = line.substring(3); // 先頭記号を削除

						this.#appendLinks(listText);

						this.#resetStackFlag();
						this.#links = true;

						continue;
					}
					break;
				}
				case '1': {
					if (line.startsWith('1. ')) {
						/* 先頭が 1. な場合は順序リスト */
						const listText = line.substring(3); // 先頭記号を削除

						this.#appendOl(listText);

						this.#resetStackFlag();
						this.#ol = true;

						continue;
					}
					break;
				}
				case ':': {
					const DD_SEPARATOR = ' | ';
					if (line.startsWith(': ') && line.includes(DD_SEPARATOR)) {
						/* 先頭が : かつ | が存在する場合は記述リスト */
						const strpos = line.indexOf(DD_SEPARATOR);

						const dtText = line.substring(2, strpos);
						const ddTextList = line.substring(strpos + DD_SEPARATOR.length).split(DD_SEPARATOR);

						this.#appendDl(dtText, ddTextList);

						this.#resetStackFlag();
						this.#dl = true;

						continue;
					}
					break;
				}
				case '*': {
					if (line.startsWith('* ')) {
						/* 先頭が * な場合は注釈 */
						const noteText = line.substring(2); // 先頭記号を削除

						this.#appendNote(noteText);

						this.#resetStackFlag();
						this.#notes = true;

						continue;
					} else if (/^\*\d{4}-[0-1]\d-[0-3]\d: /.test(line)) {
						/* 先頭が *YYYY-MM-DD: な場合は追記 */
						const insertDate = dayjs(new Date(Number(line.substring(1, 5)), Number(line.substring(6, 8)) - 1, Number(line.substring(9, 11))));
						const insertText = line.substring(13); // 先頭の「*YYYY-MM-DD: 」を削除

						this.#appendInsert(insertDate, insertText);

						this.#resetStackFlag();

						continue;
					}
					break;
				}
				case '>': {
					if (line.startsWith('> ')) {
						/* 先頭が > な場合はブロックレベル引用 */
						const quoteText = line.substring(2); // 先頭記号を削除

						this.#appendQuote(quoteText);

						this.#resetStackFlag();
						this.#quote = true;

						continue;
					} else if (this.#quote && line === '>') {
						/* > のみの場合は中略 */
						this.#appendQuoteOmit();

						this.#resetStackFlag();
						this.#quote = true;

						continue;
					}
					break;
				}
				case '?': {
					if ((this.#quote || this.#quoteCite) && this.#quoteElement !== undefined) {
						/* ブロックレベル引用の直後行かつ先頭が ? な場合は引用の出典 */
						const metaText = line.substring(1); // 先頭記号を削除

						if (new RegExp(`^${this.#config.regexp['absolute_url']}$`).test(metaText)) {
							/* URL */
							this.#quoteElement.setAttribute('cite', metaText);
							this.#quoteUrl = new URL(metaText);
						} else if (new RegExp(`^${this.#config.regexp['isbn']}$`).test(metaText)) {
							/* ISBN */
							if (new IsbnVerify(metaText, { strict: true }).isValid()) {
								this.#quoteElement.setAttribute('cite', `urn:ISBN:${metaText}`);
							} else {
								this.#logger.warn(`ISBN のチェックデジット不正: ${metaText}`);
							}
						} else if (new RegExp(`^${this.#config.regexp['lang']}$`).test(metaText)) {
							/* 言語 */
							this.#quoteElement.setAttribute('lang', metaText);
							this.#quoteLanguage = metaText;
						} else {
							this.#quoteTitle = metaText;
						}

						this.#resetStackFlag();
						this.#quoteCite = true;

						continue;
					}
					break;
				}
				case '`': {
					if (line.startsWith('```')) {
						/* 先頭が ``` な場合はコードブロック */
						const languageText = line.substring(3); // 先頭記号を削除

						if (languageText !== '') {
							this.#codeLanguage = languageText;
						}

						this.#resetStackFlag();
						this.#code = true;

						continue;
					}
					break;
				}
				case '|': {
					if (line.endsWith('|')) {
						const tableRowText = line.substring(1, line.length - 1); // 両端記号を削除

						const tableRowDatas = tableRowText.split('|').map((data) => data.trim());

						this.#appendTable();

						const alignRow = tableRowDatas.every((data) => /^-+$/.test(data));
						if (!alignRow) {
							if (!this.#thead) {
								this.#tbodyData.push(tableRowDatas);
							} else {
								this.#theadData = this.#tbodyData;
								this.#tbodyData = [tableRowDatas];
							}
						}

						this.#resetStackFlag();
						this.#thead = alignRow;
						this.#tbody = !alignRow;

						continue;
					}
					break;
				}
				case '/': {
					if (line.startsWith('/ ')) {
						/* 先頭が / な場合は汎用ボックス */
						const boxText = line.substring(2); // 先頭記号を削除

						this.#appendBox(boxText);

						this.#resetStackFlag();
						this.#box = true;

						continue;
					}
					break;
				}
				case '!': {
					if (line.startsWith('!youtube:')) {
						/* 先頭が !youtube: な場合は YouTube 動画 */
						const mediaMeta = line.substring(9); // 先頭記号を削除

						const metaMatchGroups = mediaMeta.match(/^(?<id>[^ ]+) (?<width>[1-9]\d{2,3})x(?<height>[1-9]\d{2,3}) (?<caption>.+)$/)?.groups;
						if (
							metaMatchGroups !== undefined &&
							metaMatchGroups['id'] !== undefined &&
							metaMatchGroups['width'] !== undefined &&
							metaMatchGroups['height'] !== undefined &&
							metaMatchGroups['caption'] !== undefined
						) {
							const { id } = metaMatchGroups;
							const width = Number(metaMatchGroups['width']);
							const height = Number(metaMatchGroups['height']);
							const { caption } = metaMatchGroups;

							this.#appendYouTube(id, width, height, caption);

							this.#resetStackFlag();
							this.#media = true;

							continue;
						}
					} else {
						/* 先頭が ! な場合は画像ないし動画 */
						const mediaMeta = line.substring(1); // 先頭記号を削除

						const strpos = mediaMeta.indexOf(' ');
						if (strpos !== -1) {
							const fileName = mediaMeta.substring(0, strpos);
							const caption = mediaMeta.substring(strpos + 1);

							this.#appendMedia(fileName, caption);

							this.#resetStackFlag();
							this.#media = true;

							continue;
						}
					}
					break;
				}
				case '$': {
					if (line.startsWith('$tweet: ')) {
						/* 先頭が $tweet: な場合は埋め込みツイート */
						const tweetMeta = line.substring(8); // 先頭記号を削除

						const ids = tweetMeta.split(' ');

						await this.#appendTweet(ids);

						this.#resetStackFlag();

						continue;
					} else if (line.startsWith('$amazon: ')) {
						/* 先頭が $amazon: な場合は Amazon リンク */
						const asinMeta = line.substring(9); // 先頭記号を削除

						const asins = asinMeta.split(' ');

						await this.#appendAmazon(asins);

						this.#resetStackFlag();

						continue;
					}
					break;
				}
				default:
			}

			/* その他の場合は段落（p） */
			this.#appendParagraph(line);

			this.#resetStackFlag();
		}

		/* 蓄積分の解消 */
		this.#appendQuoteCite();
		if (this.#codeBody !== undefined) {
			/* コードブロックが閉じていない場合は強制的に閉じる */
			this.#logger.warn('コードブロックが閉じていない', this.#codeBody);
			this.#appendCode();
		}
		this.#appendTableSection();

		/* 目次 */
		this.#appendToc();

		/* 脚注 */
		this.#appendFootnote();
	}

	/**
	 * Stack 要素のフラグをリセットする
	 */
	#resetStackFlag(): void {
		this.#ul = false;
		this.#links = false;
		this.#ol = false;
		this.#dl = false;
		this.#notes = false;

		this.#quote = false;
		this.#quoteCite = false;

		this.#code = false;

		this.#thead = false;
		this.#tbody = false;

		this.#box = false;

		this.#media = false;
	}

	/**
	 * 既存の親要素に子要素セットする
	 *
	 * @param {object} childElement - 子要素
	 */
	#appendChild(childElement: HTMLElement): void {
		if (this.#section2) {
			this.#section2Elements.slice(-1)[0]?.appendChild(childElement);
		} else if (this.#section1) {
			this.#section1Elements.slice(-1)[0]?.appendChild(childElement);
		} else {
			this.#rootElement.appendChild(childElement);
		}
	}

	/**
	 * <section> 1 を挿入する
	 *
	 * @param {string} headingText - 見出しテキスト
	 */
	#appendSection1(headingText: string): void {
		const id = this.#generateSectionId(headingText);

		const sectionElement = this.#document.createElement('section');
		sectionElement.className = 'p-entry-section -hdg1';
		sectionElement.id = id;
		this.#rootElement.appendChild(sectionElement);

		const headingWrapElement = this.#document.createElement('div');
		headingWrapElement.className = 'p-entry-section__hdg';
		sectionElement.appendChild(headingWrapElement);

		const headingElement = this.#document.createElement('h2');
		headingElement.insertAdjacentHTML('beforeend', this.#inline.mark(headingText, { code: true }));
		headingWrapElement.appendChild(headingElement);

		const selfLinkWrapElement = this.#document.createElement('p');
		selfLinkWrapElement.className = 'p-entry-section__self-link';
		headingWrapElement.appendChild(selfLinkWrapElement);

		const selfLinkElement = this.#document.createElement('a');
		selfLinkElement.href = `#${id}`;
		selfLinkElement.className = 'c-self-link';
		selfLinkElement.textContent = '§';
		selfLinkWrapElement.appendChild(selfLinkElement);

		this.#section1Elements.push(sectionElement);
		this.#section1Headings.set(id, headingText);
	}

	/**
	 * <section> 2 を挿入する
	 *
	 * @param {string} headingText - 見出しテキスト
	 */
	#appendSection2(headingText: string): void {
		const id = this.#generateSectionId(headingText);

		const sectionElement = this.#document.createElement('section');
		sectionElement.className = 'p-entry-section -hdg2';
		sectionElement.id = id;
		this.#section1Elements.slice(-1)[0]?.appendChild(sectionElement);

		const headingWrapElement = this.#document.createElement('div');
		headingWrapElement.className = 'p-entry-section__hdg';
		sectionElement.appendChild(headingWrapElement);

		const headingElement = this.#document.createElement('h3');
		headingElement.insertAdjacentHTML('beforeend', this.#inline.mark(headingText, { code: true }));
		headingWrapElement.appendChild(headingElement);

		const selfLinkWrapElement = this.#document.createElement('p');
		selfLinkWrapElement.className = 'p-entry-section__self-link';
		headingWrapElement.appendChild(selfLinkWrapElement);

		const selfLinkElement = this.#document.createElement('a');
		selfLinkElement.href = `#${id}`;
		selfLinkElement.className = 'c-self-link';
		selfLinkElement.textContent = '§';
		selfLinkWrapElement.appendChild(selfLinkElement);

		this.#section2Elements.push(sectionElement);
	}

	/**
	 * <section> の終了要素を挿入する
	 */
	#appendSectionBreak(): void {
		const sectionBreakElement = this.#document.createElement('hr');
		sectionBreakElement.className = 'p-section-break';
		this.#appendChild(sectionBreakElement);
	}

	/**
	 * 目次を挿入する
	 */
	#appendToc(): void {
		if (this.#section1Elements.length >= 2) {
			const tocElement = this.#document.createElement('ol');
			tocElement.setAttribute('aria-label', '目次');
			tocElement.className = 'p-toc';
			this.#section1Elements[0]?.before(tocElement);

			for (const [id, headingText] of this.#section1Headings) {
				const liElement = this.#document.createElement('li');
				tocElement.appendChild(liElement);

				const aElement = this.#document.createElement('a');
				aElement.href = `#${encodeURIComponent(id)}`;
				aElement.insertAdjacentHTML('beforeend', this.#inline.mark(headingText, { code: true }));
				liElement.appendChild(aElement);
			}
		}
	}

	/**
	 * <p> を挿入する
	 *
	 * @param {string} paragraphText - 段落テキスト
	 */
	#appendParagraph(paragraphText: string): void {
		const pElement = this.#document.createElement('p');
		pElement.insertAdjacentHTML('beforeend', this.#inline.mark(paragraphText)); // インライン要素を設定
		this.#appendChild(pElement);
	}

	/**
	 * <ul> を挿入する
	 *
	 * @param {string} listText - リストテキスト
	 */
	#appendUl(listText: string): void {
		if (!this.#ul || this.#ulElement === undefined) {
			const ulElement = this.#document.createElement('ul');
			ulElement.className = 'p-list';
			this.#appendChild(ulElement);

			this.#ulElement = ulElement;
		}

		const liElement = this.#document.createElement('li');
		liElement.insertAdjacentHTML('beforeend', this.#inline.mark(listText)); // インライン要素を設定
		this.#ulElement.appendChild(liElement);
	}

	/**
	 * リンクリストを挿入する
	 *
	 * @param {string} listText - リストテキスト
	 */
	#appendLinks(listText: string): void {
		if (!this.#links || this.#linksElement === undefined) {
			const linksElement = this.#document.createElement('ul');
			linksElement.className = 'p-links';
			this.#appendChild(linksElement);

			this.#linksElement = linksElement;
		}

		const liElement = this.#document.createElement('li');
		liElement.insertAdjacentHTML('beforeend', this.#inline.mark(listText, { anchor: true })); // リンクを設定
		this.#linksElement.appendChild(liElement);
	}

	/**
	 * <ol> を挿入する
	 *
	 * @param {string} listText - リストテキスト
	 */
	#appendOl(listText: string): void {
		if (!this.#ol || this.#olElement === undefined) {
			const olElement = this.#document.createElement('ol');
			olElement.className = 'p-list-num';
			this.#appendChild(olElement);

			this.#olElement = olElement;
		}

		const liElement = this.#document.createElement('li');
		liElement.insertAdjacentHTML('beforeend', this.#inline.mark(listText)); // インライン要素を設定
		this.#olElement.appendChild(liElement);
	}

	/**
	 * <dl> を挿入する
	 *
	 * @param {string} dtText - dt テキスト
	 * @param {string[]} ddTextList - dd テキスト
	 */
	#appendDl(dtText: string, ddTextList: string[]): void {
		if (!this.#dl || this.#dlElement === undefined) {
			const dlElement = this.#document.createElement('dl');
			dlElement.className = 'p-list-description';
			this.#appendChild(dlElement);

			this.#dlElement = dlElement;
		}

		const dtElement = this.#document.createElement('dt');
		dtElement.textContent = dtText;
		this.#dlElement.appendChild(dtElement);

		for (const ddText of ddTextList) {
			const ddElement = this.#document.createElement('dd');
			ddElement.insertAdjacentHTML('beforeend', this.#inline.mark(ddText)); // インライン要素を設定
			this.#dlElement.appendChild(ddElement);
		}
	}

	/**
	 * 注釈を挿入する
	 *
	 * @param {string} noteText - 注釈テキスト
	 */
	#appendNote(noteText: string): void {
		if (!this.#notes || this.#notesElement === undefined) {
			const notesElement = this.#document.createElement('ul');
			notesElement.className = 'p-notes';
			this.#appendChild(notesElement);

			this.#notesElement = notesElement;
		}

		const liElement = this.#document.createElement('li');
		liElement.insertAdjacentHTML('beforeend', this.#inline.mark(noteText)); // インライン要素を設定
		this.#notesElement.appendChild(liElement);
	}

	/**
	 * 追記を挿入する
	 *
	 * @param {dayjs.Dayjs} insertDate - 追記日時
	 * @param {string} insertText - 追記テキスト
	 */
	#appendInsert(insertDate: dayjs.Dayjs, insertText: string): void {
		const wrapElement = this.#document.createElement('p');
		wrapElement.className = 'p-insert';
		this.#appendChild(wrapElement);

		const dateElement = this.#document.createElement('span');
		dateElement.className = 'p-insert__date';
		dateElement.textContent = `${insertDate.format('YYYY年M月D日')}追記`;
		wrapElement.appendChild(dateElement);

		const insElement = this.#document.createElement('ins');
		insElement.setAttribute('datetime', insertDate.format('YYYY-MM-DD'));
		insElement.className = 'p-insert__text';
		insElement.insertAdjacentHTML('beforeend', this.#inline.mark(insertText)); // インライン要素を設定
		wrapElement.appendChild(insElement);
	}

	/**
	 * <blockquote> を挿入する
	 *
	 * @param {string} quoteText - 引用テキスト
	 */
	#appendQuote(quoteText: string): void {
		if (!this.#quote || this.#quoteElement === undefined) {
			const figureElement = this.#document.createElement('figure');
			this.#appendChild(figureElement);

			const quoteElement = this.#document.createElement('blockquote');
			quoteElement.className = 'p-quote';
			figureElement.appendChild(quoteElement);

			this.#quoteFigureElement = figureElement;
			this.#quoteElement = quoteElement;
		}

		const pElement = this.#document.createElement('p');
		pElement.textContent = quoteText;
		this.#quoteElement.appendChild(pElement);
	}

	/**
	 * <blockquote> 内の中略を挿入する
	 */
	#appendQuoteOmit(): void {
		if (this.#quoteElement === undefined) {
			return;
		}

		const pElement = this.#document.createElement('p');
		this.#quoteElement.appendChild(pElement);

		const omitElement = this.#document.createElement('b');
		omitElement.className = 'p-quote__omit';
		omitElement.textContent = '(中略)';
		pElement.appendChild(omitElement);
	}

	/**
	 * <blockquote> の出典を挿入する
	 */
	#appendQuoteCite(): void {
		if (this.#quoteTitle === undefined || this.#quoteFigureElement === undefined) {
			return;
		}

		const captionElement = this.#document.createElement('figcaption');
		captionElement.className = 'c-caption -meta';
		this.#quoteFigureElement.appendChild(captionElement);

		const captionTitleElement = this.#document.createElement('span');
		captionTitleElement.className = 'c-caption__title';
		captionElement.appendChild(captionTitleElement);

		if (this.#quoteUrl === undefined) {
			captionTitleElement.textContent = this.#quoteTitle;
		} else {
			captionTitleElement.insertAdjacentHTML('beforeend', this.#inline.anchor(this.#quoteTitle, this.#quoteUrl.toString(), { hreflang: this.#quoteLanguage }));
		}
	}

	/**
	 * code を挿入する
	 */
	#appendCode(): void {
		const code = this.#codeBody;
		if (code === undefined) {
			return;
		}

		const language = this.#codeLanguage;
		const codeId = `code-${md5(code)}`; // コード ID

		/* コードの挿入 */
		const codeWrapperElement = this.#document.createElement('div');
		codeWrapperElement.setAttribute('class', 'p-code');
		this.#appendChild(codeWrapperElement);

		if (code.includes('\n')) {
			/* 複数行の場合はクリップボードボタンを表示 */
			const clipboardElement = this.#document.createElement('div');
			clipboardElement.setAttribute('class', 'p-code__clipboard');
			codeWrapperElement.appendChild(clipboardElement);

			const clipboardButtonElement = this.#document.createElement('button');
			clipboardButtonElement.type = 'button';
			clipboardButtonElement.setAttribute('is', 'w0s-clipboard');
			clipboardButtonElement.setAttribute('data-target-for', codeId);
			clipboardButtonElement.className = 'p-code__clipboard-button';
			clipboardElement.appendChild(clipboardButtonElement);

			const clipboardIconElement = this.#document.createElement('img');
			clipboardIconElement.src = '/image/entry/copy.svg';
			clipboardIconElement.alt = 'コピー';
			clipboardButtonElement.appendChild(clipboardIconElement);
		}

		const preElement = this.#document.createElement('pre');
		preElement.className = 'p-code__code';
		codeWrapperElement.appendChild(preElement);

		const codeElement = this.#document.createElement('code');
		codeElement.id = codeId;
		if (language !== undefined) {
			codeElement.setAttribute('data-language', language);
		}
		preElement.appendChild(codeElement);

		let registedLanguage: string | undefined;
		if (language !== undefined) {
			registedLanguage = this.#registHighlightJsLanguage(language);
		}

		if (registedLanguage === undefined) {
			codeElement.textContent = code;
		} else {
			/* 有効な言語が指定された場合は hightlight する */
			codeElement.insertAdjacentHTML('beforeend', hljs.highlight(code, { language: registedLanguage }).value);
		}
	}

	/**
	 * <table> を挿入する
	 */
	#appendTable(): void {
		if (this.#tableElement === undefined) {
			const tableElement = this.#document.createElement('table');
			tableElement.className = 'p-table';
			this.#appendChild(tableElement);

			this.#tableElement = tableElement;
		}
	}

	/**
	 * <thead>, <tbody> を挿入する
	 */
	#appendTableSection(): void {
		if (this.#tableElement === undefined) {
			return;
		}

		if (this.#theadData.length >= 1) {
			const sectionElement = this.#document.createElement('thead');
			this.#tableElement.appendChild(sectionElement);

			for (const dataCols of this.#theadData) {
				const rowElement = this.#document.createElement('tr');
				sectionElement.appendChild(rowElement);

				dataCols.forEach((data) => {
					const cellElement = this.#document.createElement('th');
					cellElement.setAttribute('scope', 'col');
					cellElement.textContent = data.trim();
					rowElement.appendChild(cellElement);
				});
			}

			this.#theadData = [];
		}

		if (this.#tbodyData.length >= 1) {
			const sectionElement = this.#document.createElement('tbody');
			this.#tableElement.appendChild(sectionElement);

			for (const dataCols of this.#tbodyData) {
				const rowElement = this.#document.createElement('tr');
				sectionElement.appendChild(rowElement);

				dataCols.forEach((data, index) => {
					if (index === 0 && data.substring(0, 1) === '~') {
						const cellElement = this.#document.createElement('th');
						cellElement.setAttribute('scope', 'row');
						cellElement.insertAdjacentHTML('beforeend', this.#inline.mark(data.substring(1).trim())); // インライン要素を設定
						rowElement.appendChild(cellElement);
					} else {
						const cellElement = this.#document.createElement('td');
						cellElement.insertAdjacentHTML('beforeend', this.#inline.mark(data.trim())); // インライン要素を設定
						rowElement.appendChild(cellElement);
					}
				});
			}

			this.#tbodyData = [];
		}

		this.#tableElement = undefined;
	}

	/**
	 * 汎用ボックスを挿入する
	 *
	 * @param {string} boxText - ボックステキスト
	 */
	#appendBox(boxText: string): void {
		if (!this.#box || this.#boxElement === undefined) {
			const boxElement = this.#document.createElement('div');
			boxElement.className = 'p-box';
			this.#appendChild(boxElement);

			this.#boxElement = boxElement;
		}

		const pElement = this.#document.createElement('p');
		pElement.insertAdjacentHTML('beforeend', this.#inline.mark(boxText)); // インライン要素を設定
		this.#boxElement.appendChild(pElement);
	}

	/**
	 * メディアを挿入する
	 *
	 * @param {string} fileName - ファイル名
	 * @param {string} caption - キャプション
	 */
	#appendMedia(fileName: string, caption: string): void {
		const fileExtension = path.extname(fileName);

		if (!this.#media || this.#mediaWrapElement === undefined) {
			const gridElement = this.#document.createElement('div');
			gridElement.className = 'c-flex';
			this.#appendChild(gridElement);

			this.#mediaWrapElement = gridElement;
		}

		const figureElement = this.#document.createElement('figure');
		figureElement.className = 'c-flex__item';
		this.#mediaWrapElement.appendChild(figureElement);

		const embeddElement = this.#document.createElement('div');
		embeddElement.className = 'p-embed';
		figureElement.appendChild(embeddElement);

		switch (fileExtension) {
			case '.jpg':
			case '.jpeg':
			case '.png':
			case '.svg': {
				const mimeType = Object.entries(this.#config.static.headers.mime.extension).find(([, extensions]) =>
					extensions.includes(fileExtension.substring(1))
				)?.[0];

				const aElement = this.#document.createElement('a');
				aElement.href = `https://media.w0s.jp/image/blog/${fileName}`;
				if (mimeType !== undefined) {
					aElement.type = mimeType;
				}
				embeddElement.appendChild(aElement);

				const imgElement = this.#document.createElement('img');
				imgElement.alt = 'オリジナル画像';
				imgElement.className = 'p-embed__image';

				switch (fileExtension) {
					case '.svg': {
						imgElement.src = `https://media.w0s.jp/image/blog/${fileName}`;
						aElement.appendChild(imgElement);
						break;
					}
					default: {
						const pictureElement = this.#document.createElement('picture');
						aElement.appendChild(pictureElement);

						const sourceElementAvif = this.#document.createElement('source');
						sourceElementAvif.type = 'image/avif';
						sourceElementAvif.srcset = `https://media.w0s.jp/thumbimage/blog/${fileName}?type=avif;w=360;h=360;quality=60, https://media.w0s.jp/thumbimage/blog/${fileName}?type=avif;w=720;h=720;quality=30 2x`;
						pictureElement.appendChild(sourceElementAvif);

						const sourceElementWebp = this.#document.createElement('source');
						sourceElementWebp.type = 'image/webp';
						sourceElementWebp.srcset = `https://media.w0s.jp/thumbimage/blog/${fileName}?type=webp;w=360;h=360;quality=60, https://media.w0s.jp/thumbimage/blog/${fileName}?type=webp;w=720;h=720;quality=30 2x`;
						pictureElement.appendChild(sourceElementWebp);

						imgElement.src = `https://media.w0s.jp/thumbimage/blog/${fileName}?type=jpeg;w=360;h=360;quality=60`;
						pictureElement.appendChild(imgElement);
					}
				}

				const figcaptionElement = this.#document.createElement('figcaption');
				figcaptionElement.className = 'c-caption';
				figureElement.appendChild(figcaptionElement);

				const numElement = this.#document.createElement('span');
				numElement.className = 'c-caption__no';
				numElement.textContent = `画像${this.#imageNum}`;
				figcaptionElement.appendChild(numElement);

				const captionTitleElement = this.#document.createElement('span');
				captionTitleElement.className = 'c-caption__title';
				captionTitleElement.insertAdjacentHTML('beforeend', this.#inline.mark(caption, { code: true })); // インライン要素を設定
				figcaptionElement.appendChild(captionTitleElement);

				this.#imageNum += 1;
				break;
			}
			case '.mp4': {
				const videoElement = this.#document.createElement('video');
				videoElement.src = `https://media.w0s.jp/video/blog/${fileName}`;
				videoElement.controls = true;
				videoElement.className = 'p-embed__video';
				videoElement.textContent = '';
				embeddElement.appendChild(videoElement);

				const figcaptionElement = this.#document.createElement('figcaption');
				figcaptionElement.className = 'c-caption';
				figureElement.appendChild(figcaptionElement);

				const numElement = this.#document.createElement('span');
				numElement.className = 'c-caption__no';
				numElement.textContent = `動画${this.#videoNum}`;
				figcaptionElement.appendChild(numElement);

				const captionTitleElement = this.#document.createElement('span');
				captionTitleElement.className = 'c-caption__title';
				captionTitleElement.insertAdjacentHTML('beforeend', this.#inline.mark(caption, { code: true })); // インライン要素を設定
				figcaptionElement.appendChild(captionTitleElement);

				this.#videoNum += 1;
				break;
			}
			default:
		}
	}

	/**
	 * YouTube 動画を設定
	 *
	 * @param {string} id - 動画 ID
	 * @param {number} width - 幅
	 * @param {number} height - 高さ
	 * @param {string} caption - タイトル
	 */
	#appendYouTube(id: string, width: number, height: number, caption: string): void {
		const figureElement = this.#document.createElement('figure');
		this.#appendChild(figureElement);

		const embeddElement = this.#document.createElement('div');
		embeddElement.className = 'p-embed';
		figureElement.appendChild(embeddElement);

		const iframeElement = this.#document.createElement('iframe');
		iframeElement.src = `https://www.youtube-nocookie.com/embed/${id}?cc_load_policy=1`; // https://support.google.com/youtube/answer/171780
		iframeElement.setAttribute('allow', 'encrypted-media;fullscreen;gyroscope;picture-in-picture'); // `allow` プロパティへの代入は HTML に反映されない
		iframeElement.title = 'YouTube 動画';
		iframeElement.width = String(width);
		iframeElement.height = String(height);
		iframeElement.className = 'p-embed__frame';
		iframeElement.setAttribute('style', `--aspect-ratio:${width}/${height}`);
		iframeElement.textContent = '';
		embeddElement.appendChild(iframeElement);

		const figcaptionElement = this.#document.createElement('figcaption');
		figcaptionElement.className = 'c-caption';
		figureElement.appendChild(figcaptionElement);

		const numElement = this.#document.createElement('span');
		numElement.className = 'c-caption__no';
		numElement.textContent = `動画${this.#videoNum}`;
		figcaptionElement.appendChild(numElement);

		const captionTitleElement = this.#document.createElement('span');
		captionTitleElement.className = 'c-caption__title';
		figcaptionElement.appendChild(captionTitleElement);

		const aElement = this.#document.createElement('a');
		aElement.href = `https://www.youtube.com/watch?v=${id}`;
		aElement.textContent = caption;
		captionTitleElement.appendChild(aElement);

		const iconElement = this.#document.createElement('img');
		iconElement.src = '/image/icon/youtube.svg';
		iconElement.alt = '(YouTube)';
		iconElement.width = 16;
		iconElement.height = 16;
		iconElement.className = 'c-link-icon';
		captionTitleElement.appendChild(iconElement);

		this.#videoNum += 1;
	}

	/**
	 * ツイートを設定
	 *
	 * @param {string[]} ids - ツイート ID
	 */
	async #appendTweet(ids: string[]): Promise<void> {
		if (ids.length === 0) {
			return;
		}

		const gridElement = this.#document.createElement('div');
		gridElement.className = 'c-flex';

		for (const id of ids) {
			const tweetData = await this.#dao.getTweet(id);

			if (tweetData === null) {
				this.#logger.error(`d_tweet テーブルに存在しないツイート ID が指定: ${id}`);
				continue;
			}

			const figureElement = this.#document.createElement('figure');
			figureElement.className = 'c-flex__item';
			gridElement.appendChild(figureElement);

			const embeddElement = this.#document.createElement('div');
			embeddElement.className = 'p-embed';
			figureElement.appendChild(embeddElement);

			const tweetElement = this.#document.createElement('blockquote');
			tweetElement.className = 'p-embed__tweet twitter-tweet';
			tweetElement.dataset['dnt'] = 'true';
			embeddElement.appendChild(tweetElement);

			const tweetTextElement = this.#document.createElement('p');
			tweetTextElement.textContent = tweetData.text;
			tweetElement.appendChild(tweetTextElement);

			const tweetLinkElement = this.#document.createElement('a');
			tweetLinkElement.href = `https://twitter.com/${tweetData.username}/status/${id}`;
			tweetLinkElement.textContent = `— ${tweetData.name} (@${tweetData.username}) ${dayjs(tweetData.created_at).format('YYYY年M月D日 HH:mm')}`;
			tweetElement.appendChild(tweetLinkElement);

			const figcaptionElement = this.#document.createElement('figcaption');
			figcaptionElement.className = 'c-caption';
			figureElement.appendChild(figcaptionElement);

			const captionTitleElement = this.#document.createElement('span');
			captionTitleElement.className = 'c-caption__title';
			figcaptionElement.appendChild(captionTitleElement);

			const aElement = this.#document.createElement('a');
			aElement.href = `https://twitter.com/${tweetData.username}/status/${id}`;
			aElement.textContent = `${tweetData.name} (@${tweetData.username}) ${dayjs(tweetData.created_at).format('YYYY年M月D日 HH:mm')}`;
			captionTitleElement.appendChild(aElement);

			const iconElement = this.#document.createElement('img');
			iconElement.src = '/image/icon/twitter.svg';
			iconElement.alt = '(Twitter)';
			iconElement.width = 16;
			iconElement.height = 16;
			iconElement.className = 'c-link-icon';
			captionTitleElement.appendChild(iconElement);

			this.#tweetExist = true;
		}

		if (this.#tweetExist) {
			this.#appendChild(gridElement);
		}
	}

	/**
	 * Amazon 商品を設定
	 *
	 * @param {string[]} asins - ASIN
	 */
	async #appendAmazon(asins: string[]): Promise<void> {
		if (asins.length === 0) {
			return;
		}

		const amazonElement = this.#document.createElement('aside');
		amazonElement.className = 'p-amazon';
		this.#appendChild(amazonElement);

		let headingElementName: string;
		if (this.#section2) {
			headingElementName = 'h4';
		} else if (this.#section1) {
			headingElementName = 'h3';
		} else {
			headingElementName = 'h2';
		}
		const headingElement = this.#document.createElement(headingElementName);
		headingElement.className = 'p-amazon__hdg';
		amazonElement.appendChild(headingElement);

		const headingImageElement = this.#document.createElement('img');
		headingImageElement.src = '/image/entry/amazon-buy.png';
		headingImageElement.srcset = '/image/entry/amazon-buy@2x.png 2x';
		headingImageElement.alt = 'Amazon で買う';
		headingImageElement.width = 127;
		headingImageElement.height = 26;
		headingElement.appendChild(headingImageElement);

		const ulElement = this.#document.createElement('ul');
		ulElement.className = 'p-amazon__list';
		amazonElement.appendChild(ulElement);

		for (const asin of asins) {
			const amazonData = await this.#dao.getAmazon(asin);

			if (amazonData === null) {
				this.#logger.error(`d_amazon テーブルに存在しない ASIN が指定: ${asin}`);
				continue;
			}

			const liElement = this.#document.createElement('li');
			ulElement.appendChild(liElement);

			const dpAreaElement = this.#document.createElement('a');
			dpAreaElement.className = 'p-amazon__link';
			dpAreaElement.setAttribute('href', amazonData.url);
			liElement.appendChild(dpAreaElement);

			const dpImageAreaElement = this.#document.createElement('div');
			dpImageAreaElement.className = 'p-amazon__thumb';
			dpAreaElement.appendChild(dpImageAreaElement);

			const dpImageElement = this.#document.createElement('img');
			if (amazonData.image_url !== null) {
				const paapi5ItemImageUrlParser = new PaapiItemImageUrlParser(new URL(amazonData.image_url));
				paapi5ItemImageUrlParser.setSize(160);

				dpImageElement.setAttribute('src', paapi5ItemImageUrlParser.toString());
				paapi5ItemImageUrlParser.setSizeMultiply(2);
				dpImageElement.setAttribute('srcset', `${paapi5ItemImageUrlParser.toString()} 2x`);
			} else {
				dpImageElement.setAttribute('src', '/image/amazon_noimage.svg');
				dpImageElement.setAttribute('width', '113');
				dpImageElement.setAttribute('height', '160');
			}
			dpImageElement.setAttribute('alt', '');
			dpImageElement.className = 'p-amazon__image';
			dpImageAreaElement.appendChild(dpImageElement);

			const dpTextAreaElement = this.#document.createElement('div');
			dpTextAreaElement.className = 'p-amazon__text';
			dpAreaElement.appendChild(dpTextAreaElement);

			const dpTitleElement = this.#document.createElement('p');
			dpTitleElement.className = 'p-amazon__title';
			dpTitleElement.textContent = amazonData.title;
			dpTextAreaElement.appendChild(dpTitleElement);

			if (amazonData.binding !== null) {
				const bindingElement = this.#document.createElement('b');
				bindingElement.className = 'c-amazon-binding';
				bindingElement.textContent = amazonData.binding;
				dpTitleElement.appendChild(bindingElement);
			}

			if (amazonData.date !== null) {
				const { date } = amazonData;

				const dpTimeElement = this.#document.createElement('p');
				dpTimeElement.className = 'p-amazon__date';
				dpTimeElement.textContent = `${dayjs(date).format('YYYY年M月D日')} 発売`;
				dpTextAreaElement.appendChild(dpTimeElement);
			}
		}
	}

	/**
	 * 脚注を挿入する
	 */
	#appendFootnote(): void {
		const { footnotes } = this.#inline;
		if (footnotes.length === 0) {
			return;
		}

		const footnoteElement = this.#document.createElement('ul');
		footnoteElement.setAttribute('class', 'p-footnotes');
		this.#rootElement.appendChild(footnoteElement);

		footnotes.forEach((footnote, index) => {
			const no = index + 1;

			const href = Util.getFootnoteId(this.#entryId, no);

			const liElement = this.#document.createElement('li');
			footnoteElement.appendChild(liElement);

			const noElement = this.#document.createElement('span');
			noElement.className = 'p-footnotes__no';
			liElement.appendChild(noElement);

			const aElement = this.#document.createElement('a');
			aElement.href = `#nt${href}`;
			aElement.textContent = `[${no}]`;
			noElement.appendChild(aElement);

			const textElement = this.#document.createElement('span');
			textElement.className = 'p-footnotes__text';
			textElement.id = `fn${href}`;
			textElement.insertAdjacentHTML('beforeend', footnote);
			liElement.appendChild(textElement);
		});
	}

	/**
	 * セクションの ID を生成する
	 *
	 * @param {string} headingText - セクションの見出しテキスト
	 *
	 * @returns {string} セクションの ID 文字列
	 */
	#generateSectionId(headingText: string): string {
		return `${this.#SECTION_ID_PREFIX}${this.#slugger.slug(headingText)}`;
	}

	/**
	 * highlight.js に言語を登録する
	 *
	 * @param {string} languageName - 言語名
	 *
	 * @returns {string | undefined} 登録された言語名
	 */
	#registHighlightJsLanguage(languageName: string): string | undefined {
		let registLanguageName: string | undefined;
		let registLanguage: LanguageFn | undefined;

		/* https://github.com/highlightjs/highlight.js/blob/main/SUPPORTED_LANGUAGES.md */
		switch (languageName) {
			case 'xml':
			case 'html':
			case 'svg': {
				registLanguageName = 'xml';
				registLanguage = hljsXml;
				break;
			}
			case 'css': {
				registLanguageName = 'css';
				registLanguage = hljsCss;
				break;
			}
			case 'javascript':
			case 'jsx': {
				registLanguageName = 'javascript';
				registLanguage = hljsJavaScript;
				break;
			}
			case 'typescript': {
				registLanguageName = 'typescript';
				registLanguage = hljsTypeScript;
				break;
			}
			case 'json': {
				registLanguageName = 'json';
				registLanguage = hljsJson;
				break;
			}
			default: {
				this.#logger.warn(`無効な言語名が指定: \`${languageName}\``);
			}
		}

		if (registLanguageName !== undefined && registLanguage !== undefined && !this.#highLightJsLanguageRegisted.has(registLanguageName)) {
			hljs.registerLanguage(registLanguageName, registLanguage);
			this.#highLightJsLanguageRegisted.add(registLanguageName);
		}

		return registLanguageName;
	}
}
