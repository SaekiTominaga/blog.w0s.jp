import * as sqlite from 'sqlite';
import BlogMessageDao from '../dao/BlogMessageDao.js';
import dayjs from 'dayjs';
import GithubSlugger from 'github-slugger';
import hljs from 'highlight.js/lib/core';
import hljsCss from 'highlight.js/lib/languages/css';
import hljsJavaScript from 'highlight.js/lib/languages/javascript';
import hljsJson from 'highlight.js/lib/languages/json';
import hljsTypeScript from 'highlight.js/lib/languages/typescript';
import hljsXml from 'highlight.js/lib/languages/xml';
import Log4js from 'log4js';
import md5 from 'md5';
import PaapiItemImageUrlParser from '@saekitominaga/paapi-item-image-url-parser';
import path from 'path';
import serialize from 'w3c-xmlserializer';
import StringEscapeHtml from '@saekitominaga/string-escape-html';
import { JSDOM } from 'jsdom';
import { LanguageFn } from 'highlight.js';
import { NoName as Configure } from '../../configure/type/common';

/**
 * 記事メッセージのパーサー
 */
export default class MessageParser {
	/* Logger */
	readonly #logger: Log4js.Logger;

	/* 設定ファイル */
	readonly #config: Configure;

	/* Slugger */
	readonly #slugger: GithubSlugger;

	/* jsdom */
	readonly #document: Document;

	/* Dao */
	readonly #dao: BlogMessageDao;

	/* 記事 ID */
	readonly #entryId: number = 0;

	/* 記事内に埋め込みツイートが存在するか */
	#tweetExist = false;

	/* （記事メッセージ内の）ルート要素 */
	readonly #rootElement: HTMLElement;
	readonly #ROOT_ELEMENT_NAME = 'x-x'; // ルート要素名（仮で設定するものなのでなんでも良い）

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

	/* 注釈 */
	readonly #footnotes: string[] = [];

	/**
	 * コンストラクタ
	 *
	 * @param {Configure} config - 共通設定ファイル
	 * @param {sqlite.Database} dbh - DB 接続情報
	 * @param {number} entryId - 記事 ID
	 */
	constructor(config: Configure, dbh?: sqlite.Database, entryId?: number) {
		/* Logger */
		this.#logger = Log4js.getLogger(entryId !== undefined ? `${this.constructor.name} (ID: ${entryId})` : this.constructor.name);

		/* 設定ファイル */
		this.#config = config;

		/* 記事 ID */
		if (entryId !== undefined) {
			this.#entryId = entryId;
		}

		/* Slugger */
		this.#slugger = new GithubSlugger();

		/* jsdom */
		this.#document = new JSDOM().window.document;

		/* Dao */
		this.#dao = new BlogMessageDao(config, dbh);

		/* ルート要素 */
		this.#rootElement = this.#document.createElement(this.#ROOT_ELEMENT_NAME);
	}

	/**
	 * HTML に変換する
	 *
	 * @param {string} message - 本文
	 *
	 * @returns {string} HTML
	 */
	async toHtml(message: string): Promise<string> {
		await this.#convert(message);

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
		await this.#convert(message);

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
	async #convert(message: string): Promise<void> {
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

						if (/^https?:\/\/[-_.!~*'()a-zA-Z0-9;/?:@&=+$,%#]+$/.test(metaText)) {
							/* URL */
							this.#quoteElement.setAttribute('cite', metaText);
							this.#quoteUrl = new URL(metaText);
						} else if (/^\d{1,5}-\d{1,7}-\d{1,7}-[\dX]|97[8-9]-\d{1,5}-\d{1,7}-\d{1,7}-\d$/.test(metaText)) {
							/* ISBN */
							this.#quoteElement.setAttribute('cite', `urn:ISBN:${metaText}`);
						} else if (/^[a-z]{2}$/.test(metaText)) {
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

						const alignRow = tableRowDatas.every((data) => /-+/.test(data));
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
							metaMatchGroups.id !== undefined &&
							metaMatchGroups.width !== undefined &&
							metaMatchGroups.height !== undefined &&
							metaMatchGroups.caption !== undefined
						) {
							const id = metaMatchGroups.id;
							const width = Number(metaMatchGroups.width);
							const height = Number(metaMatchGroups.height);
							const caption = metaMatchGroups.caption;

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
		sectionElement.className = 'p-entry-section1';
		sectionElement.id = id;
		this.#rootElement.appendChild(sectionElement);

		const headingWrapElement = this.#document.createElement('div');
		headingWrapElement.className = 'p-entry-section1__hdg';
		sectionElement.appendChild(headingWrapElement);

		const headingElement = this.#document.createElement('h2');
		headingElement.textContent = headingText;
		headingWrapElement.appendChild(headingElement);

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
		sectionElement.className = 'p-entry-section2';
		sectionElement.id = id;
		this.#section1Elements.slice(-1)[0]?.appendChild(sectionElement);

		const headingWrapElement = this.#document.createElement('div');
		headingWrapElement.className = 'p-entry-section2__hdg';
		sectionElement.appendChild(headingWrapElement);

		const headingElement = this.#document.createElement('h3');
		headingElement.textContent = headingText;
		headingWrapElement.appendChild(headingElement);

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
				aElement.textContent = headingText;
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
		this.#inlineMarkup(pElement, paragraphText); // インライン要素を設定
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
		this.#inlineMarkup(liElement, listText); // インライン要素を設定
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
		liElement.insertAdjacentHTML('beforeend', this.#parsingInlineLink(StringEscapeHtml.escape(listText))); // リンクを設定
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
		this.#inlineMarkup(liElement, listText); // インライン要素を設定
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
			this.#inlineMarkup(ddElement, ddText); // インライン要素を設定
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
		this.#inlineMarkup(liElement, noteText); // インライン要素を設定
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
		this.#inlineMarkup(insElement, insertText); // インライン要素を設定
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
			const aElement = this.#document.createElement('a');
			aElement.href = this.#quoteUrl.toString();
			if (this.#quoteLanguage !== undefined) {
				aElement.setAttribute('hreflang', this.#quoteLanguage);
			}
			aElement.textContent = this.#quoteTitle;
			captionTitleElement.appendChild(aElement);

			if (this.#quoteUrl.pathname.endsWith('.pdf')) {
				aElement.type = 'application/pdf';

				const iconElement = this.#document.createElement('img');
				iconElement.src = '/image/icon/pdf.png';
				iconElement.alt = '(PDF)';
				iconElement.width = 16;
				iconElement.height = 16;
				iconElement.className = 'c-link-icon';
				captionTitleElement.appendChild(iconElement);
			}

			const domainElement = this.#document.createElement('b');
			domainElement.className = 'c-domain';
			domainElement.textContent = `(${this.#quoteUrl.hostname})`;
			captionTitleElement.appendChild(domainElement);
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
						this.#inlineMarkup(cellElement, data.substring(1).trim()); // インライン要素を設定
						rowElement.appendChild(cellElement);
					} else {
						const cellElement = this.#document.createElement('td');
						this.#inlineMarkup(cellElement, data.trim()); // インライン要素を設定
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
		this.#inlineMarkup(pElement, boxText); // インライン要素を設定
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
				const mime = Object.entries(this.#config.static.headers.mime.extension).find(([, extensions]) => extensions.includes(fileExtension.substring(1)))?.[0];

				const aElement = this.#document.createElement('a');
				aElement.href = `https://media.w0s.jp/image/blog/${fileName}`;
				if (mime !== undefined) {
					aElement.type = mime;
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
				captionTitleElement.textContent = caption;
				figcaptionElement.appendChild(captionTitleElement);

				this.#imageNum++;
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
				captionTitleElement.textContent = caption;
				figcaptionElement.appendChild(captionTitleElement);

				this.#videoNum++;
				break;
			}
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

		const iframeElement = this.#document.createElement('iframe');
		iframeElement.src = `https://www.youtube-nocookie.com/embed/${id}?rel=0`; // rel=0 は関連動画を表示しない設定
		iframeElement.allow = 'encrypted-media;fullscreen;gyroscope;picture-in-picture';
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

		this.#videoNum++;
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
			tweetElement.dataset.dnt = 'true';
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
		headingImageElement.src = '/image/entry/amazon_buy.png';
		headingImageElement.srcset = '/image/entry/amazon_buy@2x.png 2x';
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
				const date = amazonData.date;

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
		const footnotes = this.#footnotes;
		if (footnotes.length === 0) {
			return;
		}

		const footnoteElement = this.#document.createElement('ul');
		footnoteElement.setAttribute('class', 'p-footnotes');
		this.#rootElement.appendChild(footnoteElement);

		footnotes.forEach((footnote, index) => {
			const no = index + 1;

			const href = `${this.#entryId}-${no}`;

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
			this.#inlineMarkup(textElement, footnote, false);
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

	/**
	 * インライン要素を設定
	 *
	 * @param {object} parentElement - 親要素
	 * @param {string} str - 変換前の文字列
	 * @param {boolean} footnoteConvert - 注釈の変換を行うか
	 */
	#inlineMarkup(parentElement: HTMLElement, str: string, footnoteConvert = true): void {
		if (str === '') {
			parentElement.textContent = '';
			return;
		}

		let htmlFragment = str;

		if (footnoteConvert) {
			htmlFragment = StringEscapeHtml.escape(htmlFragment); // 注釈がここを通るのは2回目なので処理不要
		}

		htmlFragment = htmlFragment.replace(/(.?)\*\*(.+?)\*\*/g, (_match, p1: string, p2: string) => {
			if (p1 === '\\' && p2.substring(p2.length - 1) === '\\') {
				return `**${p2.substring(0, p2.length - 1)}**`;
			}
			return `${p1}<em>${p2}</em>`;
		});
		htmlFragment = htmlFragment.replace(/(.?)`(.+?)`/g, (_match, p1: string, p2: string) => {
			if (p1 === '\\' && p2.substring(p2.length - 1) === '\\') {
				return `\`${p2.substring(0, p2.length - 1)}\``;
			}
			return `${p1}<code class="c-code">${p2}</code>`;
		});
		htmlFragment = htmlFragment.replace(
			/{{(\d{1,5}-\d{1,7}-\d{1,7}-[\dX]|97[8-9]-\d{1,5}-\d{1,7}-\d{1,7}-\d) ([^{}]+)}}/g,
			(_match, p1: string, p2: string) => `<q class="c-quote" cite="urn:ISBN:${p1}">${p2}</q>`
		);
		htmlFragment = htmlFragment.replace(
			/{{(https?:\/\/[-_.!~*'()a-zA-Z0-9;/?:@&=+$,%#]+) ([^{}]+)}}/g,
			(_match, p1: string, p2: string) => `<a href="${p1}"><q class="c-quote" cite="${p1}">${p2}</q></a>`
		);
		htmlFragment = htmlFragment.replace(/{{([^{}]+)}}/g, (_match, p1: string) => `<q class="c-quote">${p1}</q>`);
		htmlFragment = this.#parsingInlineLink(htmlFragment);

		if (footnoteConvert) {
			htmlFragment = htmlFragment.replace(/\(\((.+?)\)\)/g, (_match, p1: string) => {
				this.#footnotes.push(p1); // 注釈文

				const num = this.#footnotes.length;
				const href = `${this.#entryId}-${num}`;

				return `<span class="c-annotate"><a href="#fn${href}" id="nt${href}" is="w0s-tooltip-trigger" data-tooltip-element="w0s-tooltip" data-tooltip-close-text="閉じる">[${num}]</a></span>`;
			});
		}

		parentElement.insertAdjacentHTML('beforeend', htmlFragment);
	}

	/**
	 * Markdown 形式でリンク文字列をパースする
	 *
	 * [リンク名](URL) → <a href="URL">リンク名</a>
	 *
	 * @param {string} str - 変換前の文字列
	 *
	 * @returns {string} 変換後の文字列
	 */
	#parsingInlineLink(str: string): string {
		let openingTextDelimiterIndex = str.indexOf('[');
		if (openingTextDelimiterIndex === -1) {
			/* 文中にリンク構文が存在しない場合は何もしない */
			return str;
		}

		let parseTargetText = str; // パース対象の文字列
		const parsedTextList: string[] = []; // パース後の文字列を格納する配列
		let afterLinkText = '';

		while (openingTextDelimiterIndex !== -1) {
			let beforeOpeningTextDelimiterText = parseTargetText.substring(0, openingTextDelimiterIndex);
			const afterOpeningTextDelimiterText = parseTargetText.substring(openingTextDelimiterIndex + 1);

			const regResult = /\]\((.+?)\)(.*)/.exec(afterOpeningTextDelimiterText);

			/* [ が出現したが、 [TEXT](URL) の構文になっていない場合 */
			if (regResult === null) {
				if (parsedTextList.length === 0) {
					return str;
				} else {
					break;
				}
			}

			const url = <string>regResult[1]; // リンクURL
			let linkText = afterOpeningTextDelimiterText.substring(0, afterOpeningTextDelimiterText.indexOf(`](${url}`)); // リンク文字列
			afterLinkText = <string>regResult[2]; // リンク後の文字列

			/* リンク文字列の中に [ や ] 記号が含まれていたときの処理 */
			let scanText = linkText;
			let tempLinkText = '';
			let linkTextOpeningTextDelimiterIndex = scanText.indexOf('[');
			while (linkTextOpeningTextDelimiterIndex !== -1) {
				const linkTextClosingTextDelimiterIndex = scanText.indexOf(']', linkTextOpeningTextDelimiterIndex);
				if (linkTextClosingTextDelimiterIndex !== -1) {
					tempLinkText = scanText.substring(linkTextOpeningTextDelimiterIndex) + tempLinkText;
					scanText = scanText.substring(0, linkTextOpeningTextDelimiterIndex);
				} else {
					beforeOpeningTextDelimiterText += `[${scanText.substring(0, linkTextOpeningTextDelimiterIndex)}`;
					scanText = scanText.substring(linkTextOpeningTextDelimiterIndex + 1);
				}

				linkTextOpeningTextDelimiterIndex = scanText.indexOf('[');
			}

			linkText = scanText + tempLinkText;

			/* HTML文字列に変換 */
			const linkHtml = this.#markupLink(linkText, url);

			/* 後処理 */
			parsedTextList.push(`${beforeOpeningTextDelimiterText}${linkHtml}`);
			parseTargetText = afterLinkText;

			openingTextDelimiterIndex = parseTargetText.indexOf('[');
		}

		return `${parsedTextList.join('')}${afterLinkText}`;
	}

	/**
	 * リンクのHTML文字列を設定する
	 *
	 * [リンク名](記事ID) → <a href="記事ID">リンク名</a>
	 * [リンク名](#section-セクションID) → <a href="#section-セクションID">リンク名</a>
	 * [リンク名](/相対URL) → <a href="/相対URL">リンク名</a>
	 * [リンク名](asin:ASIN) → <a href="アマゾンURL">リンク名</a><img src="アイコン"/>
	 * [リンク名](絶対URL) → <a href="URL">リンク名</a><b class="c-domain">ドメイン名</b>
	 *
	 * @param {string} linkText - リンク文字列
	 * @param {string} urlText - リンク URL
	 *
	 * @returns {string} 変換後の文字列
	 */
	#markupLink(linkText: string, urlText: string): string {
		if (/^([1-9]{1}[0-9]{0,2})$/.test(urlText)) {
			// TODO: 記事数が 1000 を超えたら正規表現要修正
			return `<a href="/${urlText}">${linkText}</a>`;
		} else if (new RegExp(`^#${this.#SECTION_ID_PREFIX}`).test(urlText)) {
			return `<a href="${urlText}">${linkText}</a>`;
		} else if (/^\/[a-zA-Z0-9-_#/.]+$/.test(urlText)) {
			// TODO: これは将来的に廃止したい
			if (urlText.endsWith('.pdf')) {
				return `<a href="https://w0s.jp${urlText}" type="application/pdf">${linkText}</a><img src="/image/icon/pdf.png" alt="(PDF)" width="16" height="16" class="c-link-icon"/>`;
			}

			return `<a href="https://w0s.jp${urlText}">${linkText}</a>`;
		} else if (/^asin:[0-9A-Z]{10}$/.test(urlText)) {
			return `<a href="https://www.amazon.co.jp/dp/${urlText.substring(
				5
			)}/ref=nosim?tag=w0s.jp-22">${linkText}</a><img src="/image/icon/amazon.png" alt="(Amazon)" width="16" height="16" class="c-link-icon"/>`; // https://affiliate.amazon.co.jp/help/node/entry/GP38PJ6EUR6PFBEC
		} else if (/^https?:\/\/[-_.!~*'()a-zA-Z0-9;/?:@&=+$,%#]+$/.test(urlText)) {
			if (linkText.startsWith('https://') || linkText.startsWith('http://')) {
				/* URL表記の場合はドメインを記載しない */
				return `<a href="${urlText}">${linkText}</a>`;
			}

			const url = new URL(urlText);
			const host = url.hostname;

			let typeAttr = '';
			let typeIcon = '';
			let hostIcon = '';

			/* PDFアイコン */
			if (url.pathname.endsWith('.pdf')) {
				typeAttr = ' type="application/pdf"';
				typeIcon = '<img src="/image/icon/pdf.png" alt="(PDF)" width="16" height="16" class="c-link-icon"/>';
			}

			/* サイトアイコン */
			switch (host) {
				case 'twitter.com': {
					hostIcon = '<img src="/image/icon/twitter.svg" alt="(Twitter)" width="16" height="16" class="c-link-icon"/>';
					break;
				}
				case 'ja.wikipedia.org': {
					hostIcon = '<img src="/image/icon/wikipedia.svg" alt="(Wikipedia)" width="16" height="16" class="c-link-icon"/>';
					break;
				}
				case 'www.youtube.com': {
					hostIcon = '<img src="/image/icon/youtube.svg" alt="(YouTube)" width="16" height="16" class="c-link-icon"/>';
					break;
				}
			}

			/* サイトアイコンがない場合はホスト名をテキストで表記 */
			if (hostIcon === '') {
				hostIcon = `<b class="c-domain">(${host})</b>`;
			}

			return `<a href="${urlText}"${typeAttr}>${linkText}</a>${typeIcon}${hostIcon}`;
		}

		throw new Error(`不正なリンクURL: ${urlText}`);
	}
}
