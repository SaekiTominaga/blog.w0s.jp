import * as sqlite from 'sqlite';
import BlogMessageDao from '../dao/BlogMessageDao.js';
import dayjs from 'dayjs';
import hljs from 'highlight.js/lib/core';
import hljsCss from 'highlight.js/lib/languages/css';
import hljsJavaScript from 'highlight.js/lib/languages/javascript';
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
import { NoName as Configure } from '../../configure/type/common.js';

type ImageType = 'figure' | 'photo';

/**
 * 記事メッセージのパーサー
 */
export default class MessageParser {
	/* Logger */
	private readonly logger: Log4js.Logger;

	/* Dao */
	private readonly dao: BlogMessageDao;
	/* 記事 ID */
	private readonly entryId: number = 0;

	/* ツイートが存在するか */
	private tweetExist = false;

	/* セクション要素 */
	private section1Element: HTMLElement;
	private section2Element: HTMLElement;

	/* 写真の番号 */
	private photoNum = 1;
	/* 図の番号 */
	private figureNum = 1;
	/* 動画の番号 */
	private videoNum = 1;

	/* コード文字列 */
	#code: string | undefined;
	#codeLanguage: string | undefined;
	#highLightJsLanguageRegisted: Set<string> = new Set();

	/* 注釈 */
	private readonly footnotes: string[] = [];

	/* 各種フラグ */
	private section1Flag = false;
	private section1Count = 0;
	private section2Flag = false;
	private section2Count = 0;
	private ulFlag = false;
	private linksFlag = false;
	private olFlag = false;
	private dlFlag = false;
	private blockquoteFlag = false;
	private blockquoteCiteFlag = false;
	private embeddedFlag = false;
	private codeFlag = false;
	private distFlag = false;
	private tableFlag = false;
	private tbodyFlag = false;

	/* 引用元 URI（blockquote 要素の cite 属性、引用文リンクの href 属性で使用） */
	private blockquoteCite = '';
	/* 引用元言語（blockquote 要素の lang 属性、引用文リンクの hreflang 属性で使用） */
	private blockquoteLang = '';

	/**
	 * コンストラクタ
	 *
	 * @param {Configure} config - 共通設定ファイル
	 * @param {sqlite.Database} dbh - DB 接続情報
	 * @param {number} entryId - 記事 ID
	 */
	constructor(config: Configure, dbh?: sqlite.Database, entryId?: number) {
		/* Logger */
		this.logger = Log4js.getLogger(this.constructor.name);

		/* 記事 ID */
		if (entryId !== undefined) {
			this.entryId = entryId;
		}

		/* Dao */
		this.dao = new BlogMessageDao(config, dbh);

		/* section */
		const { document } = new JSDOM().window;
		this.section1Element = document.createElement('section');
		this.section2Element = document.createElement('section');
	}

	/**
	 * HTML に変換する
	 *
	 * @param {string} message - 本文
	 *
	 * @returns {string} HTML
	 */
	async toHtml(message: string): Promise<string> {
		return (await this.convert(message)).innerHTML;
	}

	/**
	 * XML に変換する
	 *
	 * @param {string} message - 本文
	 *
	 * @returns {string} XML
	 */
	async toXml(message: string): Promise<string> {
		const xml = serialize(await this.convert(message));
		return xml.substring(42, xml.length - 6); // 外枠の <div xmlns="http://www.w3.org/1999/xhtml"></div> を削除
	}

	/**
	 * 本文文字列をパースして DOM に変換する
	 *
	 * @param {string} message - 本文
	 *
	 * @returns {Object} DOM
	 */
	private async convert(message: string): Promise<Element> {
		const { document } = new JSDOM().window;

		let parentElement = document.createElement('x-x');
		let quoteElement = document.createElement('figure');
		let tbodyElement = document.createElement('tbody');

		const mainElement = document.createElement('div');

		const lines = message.replaceAll('\r\n', '\n').split('\n');

		for (const line of lines) {
			if (this.codeFlag) {
				if (line === '```') {
					this.#appendCode(document, mainElement);
					this.codeFlag = false;
				} else {
					this.#code = this.#code === undefined ? line : `${this.#code}\n${line}`;
				}

				continue;
			}

			const lineTrim = line.trim();
			if (lineTrim === '') {
				this.flagReset();
				continue;
			}

			let blockConvert = false; // 変換処理を行ったか

			const firstChara = lineTrim.substring(0, 1); // 先頭文字

			if (firstChara === '#') {
				if (lineTrim === '#') {
					this.section1Flag = false;
					this.section2Flag = false;

					const sectionBreakElement = document.createElement('hr');
					sectionBreakElement.className = 'entry-section-break';
					this.appendChild(mainElement, sectionBreakElement);

					this.flagReset();
					blockConvert = true;
				} else if (lineTrim === '##') {
					this.section2Flag = false;

					const sectionBreakElement = document.createElement('hr');
					sectionBreakElement.className = 'entry-section-break';
					this.appendChild(mainElement, sectionBreakElement);

					this.flagReset();
					blockConvert = true;
				} else if (lineTrim.startsWith('# ')) {
					/* 先頭が # な場合は見出し（h2） */
					this.section1Count++;

					const lineText = lineTrim.substring(2); // 先頭記号を削除

					this.section1Element = document.createElement('section');
					this.section1Element.className = 'entry-section1 entry';
					this.section1Element.id = `section-${this.section1Count}`;
					mainElement.appendChild(this.section1Element);

					const h2Element = document.createElement('h2');
					h2Element.className = 'entry-hdg1';
					h2Element.textContent = lineText;
					this.section1Element.appendChild(h2Element);

					this.flagReset();
					this.section1Flag = true;
					this.section2Flag = false;
					this.section2Count = 0;
					blockConvert = true;
				} else if (lineTrim.startsWith('## ')) {
					/* 先頭が ** な場合は見出し（h3） */
					this.section2Count++;

					const lineText = lineTrim.substring(3); // 先頭記号を削除

					this.section2Flag = false;

					this.section2Element = document.createElement('section');
					this.section2Element.className = 'entry-section2 entry';
					this.section2Element.id = `section-${this.section1Count}-${this.section2Count}`;
					this.appendChild(mainElement, this.section2Element);

					this.section2Flag = true;

					const h3Element = document.createElement('h3');
					h3Element.className = 'entry-hdg2';
					h3Element.textContent = lineText;
					this.appendChild(mainElement, h3Element);

					this.flagReset();
					blockConvert = true;
				}
			} else if (firstChara === '-') {
				if (lineTrim.startsWith('- ')) {
					/* 先頭が - な場合は順不同リスト */
					const lineText = lineTrim.substring(2); // 先頭記号を削除

					const liElement = document.createElement('li');
					if (this.ulFlag) {
						parentElement.appendChild(liElement);
					} else {
						const ulElement = document.createElement('ul');
						ulElement.className = 'entry-list';
						this.appendChild(mainElement, ulElement);

						ulElement.appendChild(liElement);

						parentElement = ulElement;
					}

					this.inlineMarkup(liElement, lineText); // インライン要素を設定
					this.flagReset();
					this.ulFlag = true;
					blockConvert = true;
				} else if (lineTrim.startsWith('-- ')) {
					/* 先頭が -- な場合はリンクリスト */
					const lineText = lineTrim.substring(3); // 先頭記号を削除

					const liElement = document.createElement('li');
					liElement.className = 'c-link';
					if (this.linksFlag) {
						parentElement.appendChild(liElement);
					} else {
						const ulElement = document.createElement('ul');
						ulElement.className = 'entry-list-link';
						this.appendChild(mainElement, ulElement);

						ulElement.appendChild(liElement);

						parentElement = ulElement;
					}

					if (lineText === '') {
						liElement.textContent = '';
					} else {
						/* リンクを設定 */
						liElement.insertAdjacentHTML('beforeend', this.parsingInlineLink(StringEscapeHtml.escape(lineText)));
					}

					this.flagReset();
					this.linksFlag = true;
					blockConvert = true;
				}
			} else if (firstChara === '1') {
				if (lineTrim.startsWith('1. ')) {
					/* 先頭が 1. な場合は順序リスト */
					const lineText = lineTrim.substring(3); // 先頭記号を削除

					const liElement = document.createElement('li');
					if (this.olFlag) {
						parentElement.appendChild(liElement);
					} else {
						const olElement = document.createElement('ol');
						olElement.className = 'entry-list-order';
						this.appendChild(mainElement, olElement);

						olElement.appendChild(liElement);

						parentElement = olElement;
					}

					this.inlineMarkup(liElement, lineText); // インライン要素を設定
					this.flagReset();
					this.olFlag = true;
					blockConvert = true;
				}
			} else if (firstChara === ':') {
				const DD_SEPARATOR = ' | ';
				if (lineTrim.startsWith(': ') && lineTrim.includes(DD_SEPARATOR)) {
					/* 先頭が : かつ | が存在する場合は記述リスト */
					const strpos = lineTrim.indexOf(DD_SEPARATOR);

					const dtText = lineTrim.substring(2, strpos);
					const ddTextList = lineTrim.substring(strpos + 3).split(DD_SEPARATOR);

					if (this.dlFlag) {
						const dtElement = document.createElement('dt');
						parentElement.appendChild(dtElement);
						dtElement.textContent = dtText;

						for (const ddText of ddTextList) {
							const ddElement = document.createElement('dd');
							parentElement.appendChild(ddElement);
							this.inlineMarkup(ddElement, ddText); // インライン要素を設定
						}
					} else {
						const dlElement = document.createElement('dl');
						dlElement.className = 'entry-list-description';
						this.appendChild(mainElement, dlElement);

						const dtElement = document.createElement('dt');
						dlElement.appendChild(dtElement);
						dtElement.textContent = dtText;

						for (const ddText of ddTextList) {
							const ddElement = document.createElement('dd');
							dlElement.appendChild(ddElement);
							this.inlineMarkup(ddElement, ddText); // インライン要素を設定
						}

						parentElement = dlElement;
					}

					this.flagReset();
					this.dlFlag = true;
					blockConvert = true;
				}
			} else if (firstChara === '>') {
				if (lineTrim.startsWith('> ')) {
					/* 先頭が > な場合はブロックレベルの引用 */
					const lineText = lineTrim.substring(2); // 先頭記号を削除

					const pElement = document.createElement('p');
					pElement.textContent = lineText;
					if (this.blockquoteFlag) {
						parentElement.appendChild(pElement);
					} else {
						quoteElement = document.createElement('figure');
						quoteElement.className = 'entry-quote';
						this.appendChild(mainElement, quoteElement);

						const blockquoteElement = document.createElement('blockquote');
						blockquoteElement.className = 'entry-quote__quote';
						quoteElement.appendChild(blockquoteElement);

						blockquoteElement.appendChild(pElement);

						parentElement = blockquoteElement;
					}

					this.flagReset();
					this.blockquoteCite = '';
					this.blockquoteLang = '';
					this.blockquoteFlag = true;
					blockConvert = true;
				} else if (this.blockquoteFlag && lineTrim === '>') {
					/* > のみの場合は中略 */
					const pElement = document.createElement('p');
					parentElement.appendChild(pElement);

					const omitElement = document.createElement('em');
					omitElement.className = 'entry-quote__omit';
					omitElement.textContent = '(中略)';
					pElement.appendChild(omitElement);

					this.flagReset();
					this.blockquoteCite = '';
					this.blockquoteLang = '';
					this.blockquoteFlag = true;
					blockConvert = true;
				}
			} else if ((this.blockquoteFlag || this.blockquoteCiteFlag) && firstChara === '?') {
				/* 先頭が ? な場合は出典 */
				const lineText = lineTrim.substring(1); // 先頭記号を削除

				if (/^https?:\/\/[-_.!~*'()a-zA-Z0-9;/?:@&=+$,%#]+$/.test(lineText)) {
					/* URL */
					parentElement.setAttribute('cite', lineText);
					this.blockquoteCite = lineText;
				} else if (/^\d{1,5}-\d{1,7}-\d{1,7}-[\dX]|97[8-9]-\d{1,5}-\d{1,7}-\d{1,7}-\d$/.test(lineText)) {
					/* ISBN */
					parentElement.setAttribute('cite', `urn:ISBN:${lineText}`);
				} else if (/^[a-z]{2}$/.test(lineText)) {
					/* 言語 */
					parentElement.setAttribute('lang', lineText);
					this.blockquoteLang = lineText;
				} else {
					const quoteCaptionElement = document.createElement('figcaption');
					quoteCaptionElement.className = 'entry-quote__caption';
					quoteElement.appendChild(quoteCaptionElement);

					if (this.blockquoteCite === '') {
						quoteCaptionElement.textContent = lineText;
					} else {
						const aElement = document.createElement('a');
						aElement.href = this.blockquoteCite;
						if (this.blockquoteLang !== '') {
							aElement.setAttribute('hreflang', this.blockquoteLang);
						}
						aElement.textContent = lineText;
						quoteCaptionElement.appendChild(aElement);

						if (this.blockquoteCite.endsWith('.pdf')) {
							aElement.type = 'application/pdf';

							const iconElement = document.createElement('img');
							iconElement.src = '/image/icon/pdf.png';
							iconElement.alt = '(PDF)';
							iconElement.className = 'c-link-icon';
							aElement.appendChild(iconElement);
						}

						const domainElement = document.createElement('b');
						domainElement.className = 'c-domain';
						domainElement.textContent = `(${new URL(this.blockquoteCite).hostname})`;
						quoteCaptionElement.appendChild(domainElement);
					}
				}

				this.flagReset();
				this.blockquoteCiteFlag = true;
				blockConvert = true;
			} else if (firstChara === '$') {
				if (lineTrim.startsWith('$photo: ')) {
					/* 先頭が $photo: な場合は写真の画像 */
					const lineText = lineTrim.substring(8); // 先頭記号を削除

					const strpos = lineText.indexOf(' ');
					if (strpos !== -1) {
						const file = lineText.substring(0, strpos);
						const caption = lineText.substring(strpos + 1);

						if (this.embeddedFlag) {
							this.setImage(document, parentElement, file, caption, 'photo');
						} else {
							const gridElement = document.createElement('div');
							gridElement.className = 'entry-embedded-grid';
							this.appendChild(mainElement, gridElement);

							parentElement = gridElement;

							this.setImage(document, gridElement, file, caption, 'photo');
						}

						this.flagReset();
						this.embeddedFlag = true;
						blockConvert = true;
					}
				} else if (lineTrim.startsWith('$image: ')) {
					/* 先頭が $image: な場合は図の画像 */
					const lineText = lineTrim.substring(8); // 先頭記号を削除

					const strpos = lineText.indexOf(' ');
					if (strpos !== -1) {
						const file = lineText.substring(0, strpos);
						const caption = lineText.substring(strpos + 1);

						if (this.embeddedFlag) {
							this.setImage(document, parentElement, file, caption, 'figure');
						} else {
							const gridElement = document.createElement('div');
							gridElement.className = 'entry-embedded-grid';
							this.appendChild(mainElement, gridElement);

							parentElement = gridElement;

							this.setImage(document, gridElement, file, caption, 'figure');
						}

						this.flagReset();
						this.embeddedFlag = true;
						blockConvert = true;
					}
				} else if (lineTrim.startsWith('$video: ')) {
					/* 先頭が $video: な場合は動画 */
					const lineText = lineTrim.substring(8); // 先頭記号を削除

					const strpos = lineText.indexOf(' ');
					if (strpos !== -1) {
						const file = lineText.substring(0, strpos);
						const caption = lineText.substring(strpos + 1);

						if (this.embeddedFlag) {
							this.setVideo(document, parentElement, file, caption);
						} else {
							const gridElement = document.createElement('div');
							gridElement.className = 'entry-embedded-grid';
							this.appendChild(mainElement, gridElement);

							parentElement = gridElement;

							this.setVideo(document, gridElement, file, caption);
						}

						this.flagReset();
						this.embeddedFlag = true;
						blockConvert = true;
					}
				} else if (lineTrim.startsWith('$youtube: ')) {
					/* 先頭が $youtube: な場合は YouTube 動画 */
					const lineText = lineTrim.substring(10); // 先頭記号を削除

					const meta = lineText.match(/^(?<id>[^ ]+) (?<width>[1-9]\d{2,3})x(?<height>[1-9]\d{2,3}) (?<caption>.+)$/)?.groups;

					if (meta === undefined || meta.id === undefined || meta.width === undefined || meta.height === undefined || meta.caption === undefined) {
						this.logger.error(`YouTube 動画埋め込みの構文が不正: ${lineTrim}（記事ID: ${this.entryId}）`);
					} else {
						const id = meta.id;
						const width = Number(meta.width);
						const height = Number(meta.height);
						const caption = meta.caption;

						if (this.embeddedFlag) {
							this.setYouTube(document, parentElement, id, width, height, caption);
						} else {
							const gridElement = document.createElement('div');
							gridElement.className = 'entry-embedded-grid';
							this.appendChild(mainElement, gridElement);

							parentElement = gridElement;

							this.setYouTube(document, gridElement, id, width, height, caption);
						}
					}

					this.flagReset();
					this.embeddedFlag = true;
					blockConvert = true;
				} else if (lineTrim.startsWith('$tweet: ')) {
					/* 先頭が $tweet: な場合は埋め込みツイート */
					const lineText = lineTrim.substring(8); // 先頭記号を削除

					const gridElement = document.createElement('div');
					gridElement.className = 'entry-embedded-grid';

					for (const id of lineText.split(' ')) {
						const tweetData = await this.dao.getTweet(id);

						if (tweetData === null) {
							this.logger.error(`テーブルに存在しないツイート ID が指定: ${id}（記事ID: ${this.entryId}）`);
							continue;
						}

						const tweetWrapperElement = document.createElement('figure');
						tweetWrapperElement.className = 'entry-embedded';
						gridElement.appendChild(tweetWrapperElement);

						const tweetElement = document.createElement('blockquote');
						tweetElement.className = 'entry-embedded__tweet twitter-tweet';
						tweetElement.setAttribute('data-dnt', 'true');
						tweetWrapperElement.appendChild(tweetElement);

						const tweetTextElement = document.createElement('p');
						tweetTextElement.textContent = tweetData.text;
						tweetElement.appendChild(tweetTextElement);

						const tweetLinkElement = document.createElement('a');
						tweetLinkElement.href = `https://twitter.com/${tweetData.username}/status/${id}`;
						tweetLinkElement.textContent = `— ${tweetData.name} (@${tweetData.username}) ${dayjs(tweetData.created_at).format('YYYY年M月D日 HH:mm')}`;
						tweetElement.appendChild(tweetLinkElement);

						const figcaptionElement = document.createElement('figcaption');
						figcaptionElement.className = 'entry-embedded__caption c-embedded-caption';
						tweetWrapperElement.appendChild(figcaptionElement);

						const captionTitleElement = document.createElement('span');
						captionTitleElement.className = 'c-embedded-caption__title';
						figcaptionElement.appendChild(captionTitleElement);

						const aElement = document.createElement('a');
						aElement.href = `https://twitter.com/${tweetData.username}/status/${id}`;
						aElement.textContent = `${tweetData.name} (@${tweetData.username}) ${dayjs(tweetData.created_at).format('YYYY年M月D日 HH:mm')}`;
						captionTitleElement.appendChild(aElement);

						const iconElement = document.createElement('img');
						iconElement.src = '/image/icon/twitter.svg';
						iconElement.alt = '(Twitter)';
						iconElement.className = 'c-link-icon';
						aElement.appendChild(iconElement);

						this.tweetExist = true;
					}

					if (this.tweetExist) {
						this.appendChild(mainElement, gridElement);
					}

					this.flagReset();
					blockConvert = true;
				} else if (lineTrim.startsWith('$amazon: ')) {
					/* 先頭が $amazon: な場合はAmazonリンク */
					const lineText = lineTrim.substring(9); // 先頭記号を削除

					const amazonElement = document.createElement('aside');
					amazonElement.className = 'entry-amazon';
					this.appendChild(mainElement, amazonElement);

					let headingElement: HTMLHeadingElement;
					if (this.section2Flag) {
						headingElement = document.createElement('h4');
					} else if (this.section1Flag) {
						headingElement = document.createElement('h3');
					} else {
						headingElement = document.createElement('h2');
					}
					headingElement.className = 'entry-amazon__hdg';
					amazonElement.appendChild(headingElement);

					const headingImageElement = document.createElement('img');
					headingImageElement.src = '/image/entry/amazon_buy.png';
					headingImageElement.srcset = '/image/entry/amazon_buy@2x.png 2x';
					headingImageElement.alt = 'Amazon で買う';
					headingElement.appendChild(headingImageElement);

					const ulElement = document.createElement('ul');
					ulElement.className = 'entry-amazon__link';
					amazonElement.appendChild(ulElement);

					for (const asin of lineText.split(' ')) {
						const amazonData = await this.dao.getAmazon(asin);

						if (amazonData === null) {
							this.logger.error(`d_amazon テーブルに存在しない ASIN が指定: ${asin} （記事ID: ${this.entryId}）`);
							continue;
						}

						const liElement = document.createElement('li');
						ulElement.appendChild(liElement);

						const dpAreaElement = document.createElement('a');
						dpAreaElement.className = 'entry-amazon-link';
						dpAreaElement.setAttribute('href', amazonData.url);
						liElement.appendChild(dpAreaElement);

						const dpImageAreaElement = document.createElement('div');
						dpImageAreaElement.className = 'entry-amazon-link__thumb';
						dpAreaElement.appendChild(dpImageAreaElement);

						const dpImageElement = document.createElement('img');
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
						dpImageElement.className = 'entry-amazon-link__image';
						dpImageAreaElement.appendChild(dpImageElement);

						const dpTextAreaElement = document.createElement('div');
						dpTextAreaElement.className = 'entry-amazon-link__text';
						dpAreaElement.appendChild(dpTextAreaElement);

						const dpTitleElement = document.createElement('p');
						dpTitleElement.className = 'entry-amazon-link__title';
						dpTitleElement.textContent = amazonData.title;
						dpTextAreaElement.appendChild(dpTitleElement);

						if (amazonData.binding !== null) {
							const bindingElement = document.createElement('b');
							switch (amazonData.binding) {
								case 'Blu-ray':
									bindingElement.className = 'c-amazon-binding -bd';
									break;
								case 'Kindle版':
									bindingElement.className = 'c-amazon-binding -kindle';
									break;
								default:
									bindingElement.className = 'c-amazon-binding';
							}
							bindingElement.textContent = amazonData.binding;
							dpTitleElement.appendChild(bindingElement);
						}

						if (amazonData.date !== null) {
							const date = amazonData.date;

							const dpTimeElement = document.createElement('p');
							dpTimeElement.className = 'entry-amazon-link__date';
							dpTimeElement.textContent = `${dayjs(date).format('YYYY年M月D日')} 発売`;
							dpTextAreaElement.appendChild(dpTimeElement);

							if (date.getTime() > new Date().getTime()) {
								const planElement = document.createElement('em');
								planElement.className = 'c-amazon-date-plan';
								planElement.textContent = '予定';
								dpTimeElement.appendChild(planElement);
							}
						}
					}

					this.flagReset();
					blockConvert = true;
				}
			} else if (firstChara === '`') {
				if (lineTrim.startsWith('```')) {
					/* 先頭が ``` な場合はコードブロック（.entry-code） */
					const language = lineTrim.substring(3); // 先頭記号を削除
					this.#codeLanguage = language !== '' ? language : undefined;

					this.flagReset();
					this.codeFlag = true;
					blockConvert = true;
				}
			} else if (firstChara === '*') {
				if (lineTrim.startsWith('* ')) {
					/* 先頭が * な場合は注釈（.entry-note） */
					const lineText = lineTrim.substring(2); // 先頭記号を削除

					const wrapElement = document.createElement('p');
					wrapElement.className = 'entry-note';
					this.appendChild(mainElement, wrapElement);

					const markElement = document.createElement('span');
					markElement.className = 'entry-note__mark';
					markElement.textContent = '※';
					wrapElement.appendChild(markElement);

					const noteElement = document.createElement('span');
					noteElement.className = 'entry-note__text';
					wrapElement.appendChild(noteElement);

					this.inlineMarkup(noteElement, lineText); // インライン要素を設定
					this.flagReset();
					blockConvert = true;
				} else if (/^\*\d{4}-[0-1]\d-[0-3]\d: /.test(lineTrim)) {
					/* 先頭が #YYYY-MM-DD な場合は追記（ins p） */
					const date = dayjs(new Date(Number(lineTrim.substring(1, 5)), Number(lineTrim.substring(6, 8)) - 1, Number(lineTrim.substring(9, 11))));
					const lineText = lineTrim.substring(13); // 先頭の「*YYYY-MM-DD: 」を削除

					const wrapElement = document.createElement('p');
					wrapElement.className = 'entry-ins';
					this.appendChild(mainElement, wrapElement);

					const dateElement = document.createElement('span');
					dateElement.className = 'entry-ins__date';
					dateElement.textContent = `${date.format('YYYY年M月D日')}追記`;
					wrapElement.appendChild(dateElement);

					const insElement = document.createElement('ins');
					insElement.setAttribute('datetime', date.format('YYYY-MM-DD'));
					insElement.className = 'entry-ins__text';
					wrapElement.appendChild(insElement);

					this.inlineMarkup(insElement, lineText); // インライン要素を設定

					this.flagReset();
					blockConvert = true;
				}
			} else if (firstChara === '/') {
				if (lineTrim.startsWith('/ ')) {
					/* 先頭が / な場合は本文と区別するブロック（.entry-box） */
					const lineText = lineTrim.substring(2); // 先頭記号を削除

					const pElement = document.createElement('p');
					this.inlineMarkup(pElement, lineText); // インライン要素を設定

					if (this.distFlag) {
						parentElement.appendChild(pElement);
					} else {
						const distElement = document.createElement('div');
						distElement.className = 'entry-box';
						this.appendChild(mainElement, distElement);

						distElement.appendChild(pElement);

						parentElement = distElement;
					}

					this.flagReset();
					this.distFlag = true;
					blockConvert = true;
				}
			} else if (firstChara === '|') {
				if (lineTrim.startsWith('|$')) {
					/* 先頭が |$ な場合は表ヘッダ（thead） */
					const lineText = lineTrim.substring(2); // 先頭記号を削除

					const theadElement = document.createElement('thead');
					if (this.tableFlag) {
						parentElement.appendChild(theadElement);
					} else {
						const tableElement = document.createElement('table');
						tableElement.className = 'entry-table';
						this.appendChild(mainElement, tableElement);

						tableElement.appendChild(theadElement);

						parentElement = tableElement;
					}

					/* 行要素を設定 */
					const dates = lineText.split('|');

					const trElement = document.createElement('tr');
					theadElement.appendChild(trElement);

					for (const data of dates) {
						const dataTrim = data.trim();

						const thElement = document.createElement('th');
						thElement.setAttribute('scope', 'col');
						thElement.textContent = dataTrim;
						trElement.appendChild(thElement);
					}

					this.flagReset();
				} else {
					/* 先頭が | な場合は表本体（tbody） */
					const lineText = lineTrim.substring(1); // 先頭記号を削除

					if (!this.tbodyFlag) {
						tbodyElement = document.createElement('tbody');
						if (this.tableFlag) {
							parentElement.appendChild(tbodyElement);
						} else {
							const tableElement = document.createElement('table');
							tableElement.className = 'entry-table';
							this.appendChild(mainElement, tableElement);

							tableElement.appendChild(tbodyElement);

							parentElement = tableElement;
						}
					}

					/* tbodyの行要素を設定 */
					const dates = lineText.split('|');

					const trElement = document.createElement('tr');
					tbodyElement.appendChild(trElement);

					for (const data of dates) {
						if (data.substring(0, 1) === '~') {
							const dataTrim = data.substring(1).trim();

							const thElement = document.createElement('th');
							thElement.setAttribute('scope', 'row');
							trElement.appendChild(thElement);

							this.inlineMarkup(thElement, dataTrim); // アンカーを設定
						} else {
							const dataTrim = data.trim();

							const tdElement = document.createElement('td');
							trElement.appendChild(tdElement);

							this.inlineMarkup(tdElement, dataTrim); // アンカーを設定
						}
					}

					this.flagReset();
					this.tbodyFlag = true;
				}
				this.tableFlag = true;
				blockConvert = true;
			}

			if (!blockConvert) {
				/* その他の場合は段落（p） */
				const pElement = document.createElement('p');
				pElement.className = 'entry-text';
				this.appendChild(mainElement, pElement);

				this.inlineMarkup(pElement, lineTrim); // インライン要素を設定
				this.flagReset();
			}
		}

		if (this.#code !== undefined) {
			this.logger.warn(`コードブロックが閉じていない（記事ID: ${this.entryId}）`, this.#code);
			this.#appendCode(document, mainElement);
		}

		if (this.footnotes.length > 0) {
			const footnotesElement = document.createElement('ul');
			footnotesElement.setAttribute('class', 'entry-footnote');
			mainElement.appendChild(footnotesElement);

			let num = 1;
			for (const footnote of this.footnotes) {
				const href = `${this.entryId}-${num}`;

				const liElement = document.createElement('li');
				footnotesElement.appendChild(liElement);

				const noElement = document.createElement('span');
				noElement.className = 'entry-footnote__no';
				liElement.appendChild(noElement);

				const aElement = document.createElement('a');
				aElement.href = `#nt${href}`;
				aElement.textContent = `[${num}]`;
				noElement.appendChild(aElement);

				const textElement = document.createElement('span');
				textElement.className = 'entry-footnote__text';
				textElement.id = `fn${href}`;
				liElement.appendChild(textElement);

				this.inlineMarkup(textElement, footnote, false);

				num++;
			}
		}

		return mainElement;
	}

	/**
	 * フラグリセット
	 */
	private flagReset(): void {
		this.ulFlag = false;
		this.linksFlag = false;
		this.olFlag = false;
		this.dlFlag = false;
		this.blockquoteFlag = false;
		this.blockquoteCiteFlag = false;
		this.embeddedFlag = false;
		this.codeFlag = false;
		this.distFlag = false;
		this.tableFlag = false;
		this.tbodyFlag = false;
	}

	/**
	 * 記事に埋め込みツイートが含まれているか
	 *
	 * @returns {boolean} 1つ以上ツイートがあれば true
	 */
	public isTweetExit(): boolean {
		return this.tweetExist;
	}

	/**
	 * 既存の親要素に子要素セットする
	 *
	 * @param {object} bodyElement -
	 * @param {object} childElement - 子要素
	 */
	private appendChild(bodyElement: HTMLElement, childElement: HTMLElement): void {
		if (this.section2Flag) {
			this.section2Element.appendChild(childElement);
		} else if (this.section1Flag) {
			this.section1Element.appendChild(childElement);
		} else {
			bodyElement.appendChild(childElement);
		}
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
			default: {
				this.logger.warn(`無効な言語名が指定: \`${languageName}\` （記事ID: ${this.entryId}）`);
			}
		}

		if (registLanguageName !== undefined && registLanguage !== undefined && !this.#highLightJsLanguageRegisted.has(registLanguageName)) {
			hljs.registerLanguage(registLanguageName, registLanguage);
			this.#highLightJsLanguageRegisted.add(registLanguageName);
		}

		return registLanguageName;
	}

	/**
	 * code を挿入する
	 *
	 * @param {object} document - Document
	 * @param {object} entryMainElement - 記事のメイン要素
	 */
	#appendCode(document: Document, entryMainElement: HTMLElement): void {
		const code = this.#code;
		const language = this.#codeLanguage;
		this.#code = undefined;
		this.#codeLanguage = undefined;

		if (code === undefined) {
			return;
		}

		const codeId = `code-${md5(code)}`; // コード ID

		/* コードの挿入 */
		const codeWrapperElement = document.createElement('div');
		codeWrapperElement.setAttribute('class', 'entry-code');
		this.appendChild(entryMainElement, codeWrapperElement);

		if (code.includes('\n')) {
			/* 複数行の場合はクリップボードボタンを表示 */
			const clipboardElement = document.createElement('div');
			clipboardElement.setAttribute('class', 'entry-code__clipboard');
			codeWrapperElement.appendChild(clipboardElement);

			const clipboardButtonElement = document.createElement('button');
			clipboardButtonElement.type = 'button';
			clipboardButtonElement.setAttribute('is', 'w0s-clipboard');
			clipboardButtonElement.setAttribute('data-target-for', codeId);
			clipboardButtonElement.className = 'c-clipboard-button';
			clipboardElement.appendChild(clipboardButtonElement);

			const clipboardIconElement = document.createElement('img');
			clipboardIconElement.src = '/image/entry/copy.svg';
			clipboardIconElement.alt = 'コピー';
			clipboardButtonElement.appendChild(clipboardIconElement);
		}

		const preElement = document.createElement('pre');
		preElement.className = 'entry-code__code';
		codeWrapperElement.appendChild(preElement);

		const codeElement = document.createElement('code');
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
	 * 画像を設定
	 *
	 * @param {object} document - Document
	 * @param {object} parentElement - 親要素
	 * @param {string} fileName - ファイル名
	 * @param {string} caption - キャプション
	 * @param {string} type - 画像タイプ
	 */
	private setImage(document: Document, parentElement: HTMLElement, fileName: string, caption: string, type: ImageType): void {
		const figureElement = document.createElement('figure');
		figureElement.className = 'entry-embedded';
		parentElement.appendChild(figureElement);

		const aElement = document.createElement('a');
		aElement.href = `https://media.w0s.jp/image/blog/${fileName}`;
		figureElement.appendChild(aElement);

		switch (path.extname(fileName)) {
			case 'svg': {
				/* SVG */
				aElement.type = 'image/svg+xml';

				const imgElement = document.createElement('img');
				imgElement.src = `https://media.w0s.jp/image/blog/${fileName}`;
				imgElement.alt = 'オリジナル画像';
				aElement.appendChild(imgElement);
				break;
			}
			default: {
				const pictureElement = document.createElement('picture');
				aElement.appendChild(pictureElement);

				const sourceElementAvif = document.createElement('source');
				sourceElementAvif.type = 'image/avif';
				sourceElementAvif.srcset = `https://media.w0s.jp/thumbimage/blog/${fileName}?type=avif;w=360;h=360;quality=60, https://media.w0s.jp/thumbimage/blog/${fileName}?type=avif;w=720;h=720;quality=30 2x`;
				pictureElement.appendChild(sourceElementAvif);

				const sourceElementWebp = document.createElement('source');
				sourceElementWebp.type = 'image/webp';
				sourceElementWebp.srcset = `https://media.w0s.jp/thumbimage/blog/${fileName}?type=webp;w=360;h=360;quality=60, https://media.w0s.jp/thumbimage/blog/${fileName}?type=webp;w=720;h=720;quality=30 2x`;
				pictureElement.appendChild(sourceElementWebp);

				const imgElement = document.createElement('img');
				imgElement.src = `https://media.w0s.jp/thumbimage/blog/${fileName}?type=jpeg;w=360;h=360;quality=60`;
				imgElement.alt = 'オリジナル画像';
				imgElement.className = 'entry-embedded__image';
				pictureElement.appendChild(imgElement);
			}
		}

		const figcaptionElement = document.createElement('figcaption');
		figcaptionElement.className = 'entry-embedded__caption c-embedded-caption';
		figureElement.appendChild(figcaptionElement);

		const numElement = document.createElement('span');
		numElement.className = 'c-embedded-caption__no';
		figcaptionElement.appendChild(numElement);

		const captionTitleElement = document.createElement('span');
		captionTitleElement.className = 'c-embedded-caption__title';
		captionTitleElement.textContent = caption;
		figcaptionElement.appendChild(captionTitleElement);

		switch (type) {
			case 'photo':
				numElement.textContent = `写真${this.photoNum}`;
				this.photoNum++;
				break;
			case 'figure':
				numElement.textContent = `図${this.figureNum}`;
				this.figureNum++;
				break;
			default:
				break;
		}
	}

	/**
	 * 動画を設定
	 *
	 * @param {object} document - Document
	 * @param {object} parentElement - 親要素
	 * @param {string} fileName - ファイル名
	 * @param {string} caption - キャプション
	 */
	private setVideo(document: Document, parentElement: HTMLElement, fileName: string, caption: string): void {
		const figureElement = document.createElement('figure');
		figureElement.className = 'entry-embedded';
		parentElement.appendChild(figureElement);

		const videoElement = document.createElement('video');
		videoElement.src = `https://media.w0s.jp/video/blog/${fileName}`;
		videoElement.controls = true;
		videoElement.className = 'entry-embedded__video';
		videoElement.textContent = '';
		figureElement.appendChild(videoElement);

		const figcaptionElement = document.createElement('figcaption');
		figcaptionElement.className = 'entry-embedded__caption c-embedded-caption';
		figureElement.appendChild(figcaptionElement);

		const numElement = document.createElement('span');
		numElement.className = 'c-embedded-caption__no';
		numElement.textContent = `動画${this.videoNum}`;
		figcaptionElement.appendChild(numElement);

		const captionTitleElement = document.createElement('span');
		captionTitleElement.className = 'c-embedded-caption__title';
		captionTitleElement.textContent = caption;
		figcaptionElement.appendChild(captionTitleElement);

		this.videoNum++;
	}

	/**
	 * YouTube 動画を設定
	 *
	 * @param {object} document - Document
	 * @param {object} parentElement - 親要素
	 * @param {string} id - 動画 ID
	 * @param {number} width - 幅
	 * @param {number} height - 高さ
	 * @param {string} caption - タイトル
	 */
	private setYouTube(document: Document, parentElement: HTMLElement, id: string, width: number, height: number, caption: string): void {
		const figureElement = document.createElement('figure');
		figureElement.className = 'entry-embedded';
		this.appendChild(parentElement, figureElement);

		const iframeElement = document.createElement('iframe');
		iframeElement.src = `https://www.youtube-nocookie.com/embed/${id}?rel=0`; // rel=0 は関連動画を表示しない設定
		iframeElement.allow = 'encrypted-media;fullscreen;gyroscope;picture-in-picture';
		iframeElement.title = 'YouTube 動画';
		iframeElement.width = String(width);
		iframeElement.height = String(height);
		iframeElement.className = 'entry-embedded__frame';
		iframeElement.setAttribute('style', `--aspect-ratio:${width}/${height}`);
		iframeElement.textContent = '';
		figureElement.appendChild(iframeElement);

		const figcaptionElement = document.createElement('figcaption');
		figcaptionElement.className = 'entry-embedded__caption c-embedded-caption';
		figureElement.appendChild(figcaptionElement);

		const captionTitleElement = document.createElement('span');
		captionTitleElement.className = 'c-embedded-caption__title';
		figcaptionElement.appendChild(captionTitleElement);

		const aElement = document.createElement('a');
		aElement.href = `https://www.youtube.com/watch?v=${id}`;
		aElement.textContent = caption;
		captionTitleElement.appendChild(aElement);

		const iconElement = document.createElement('img');
		iconElement.src = '/image/icon/youtube.svg';
		iconElement.alt = '(YouTube)';
		iconElement.className = 'c-link-icon';
		aElement.appendChild(iconElement);
	}

	/**
	 * インライン要素を設定
	 *
	 * @param {object} parentElement - 親要素
	 * @param {string} str - 変換前の文字列
	 * @param {boolean} footnote - 注釈の変換を行うか
	 */
	private inlineMarkup(parentElement: HTMLElement, str: string, footnote = true): void {
		if (str === '') {
			parentElement.textContent = '';
			return;
		}

		let htmlFragment = str;

		if (footnote) {
			htmlFragment = StringEscapeHtml.escape(htmlFragment); // 注釈がここを通るのは2回目なので処理不要
		}

		htmlFragment = htmlFragment.replace(/(.?)\*\*(.+?)\*\*/g, (_match, p1: string, p2: string) => {
			if (p1 === '\\' && p2.substring(p2.length - 1) === '\\') {
				return `**${p2.substring(0, p2.length - 1)}**`;
			}
			return `${p1}<em class="c-emphasis">${p2}</em>`;
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
		htmlFragment = this.parsingInlineLink(htmlFragment);

		if (footnote) {
			htmlFragment = htmlFragment.replace(/\(\((.+?)\)\)/g, (_match, p1: string) => {
				this.footnotes.push(p1); // 注釈文

				const num = this.footnotes.length;
				const href = `${this.entryId}-${num}`;

				return `<sup class="c-annotate"><a href="#fn${href}" id="nt${href}" is="w0s-tooltip-trigger" data-tooltip-element="w0s-tooltip" data-tooltip-close-text="閉じる">[${num}]</a></sup>`;
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
	private parsingInlineLink(str: string): string {
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
			const linkHtml = this.markupLink(linkText, url);

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
	 * @param {string} url - リンク URL
	 *
	 * @returns {string} 変換後の文字列
	 */
	private markupLink(linkText: string, url: string): string {
		if (/^([1-9]{1}[0-9]{0,2})$/.test(url)) {
			// TODO: 記事数が 1000 を超えたら正規表現要修正
			return `<a href="${url}">${linkText}</a>`;
		} else if (/^#section-([1-9]{1}[-0-9]*)$/.test(url)) {
			return `<a href="${url}">${linkText}</a>`;
		} else if (/^\/[a-zA-Z0-9-_#/.]+$/.test(url)) {
			// TODO: これは将来的に廃止したい
			if (url.endsWith('.pdf')) {
				return `<a href="https://w0s.jp${url}" type="application/pdf">${linkText}<img src="/image/icon/pdf.png" alt="(PDF)" class="c-link-icon"></a>`;
			}

			return `<a href="https://w0s.jp${url}">${linkText}</a>`;
		} else if (/^asin:[0-9A-Z]{10}$/.test(url)) {
			return `<a href="https://www.amazon.co.jp/dp/${url.substring(
				5
			)}/ref=nosim?tag=w0s.jp-22">${linkText}<img src="/image/icon/amazon.png" alt="(Amazon)" class="c-link-icon"/></a>`; // https://affiliate.amazon.co.jp/help/node/entry/GP38PJ6EUR6PFBEC
		} else if (/^https?:\/\/[-_.!~*'()a-zA-Z0-9;/?:@&=+$,%#]+$/.test(url)) {
			if (linkText.startsWith('https://') || linkText.startsWith('http://')) {
				/* URL表記の場合はドメインを記載しない */
				return `<a href="${url}">${linkText}</a>`;
			}

			const host = new URL(url).hostname;

			let typeAttr = '';
			let typeIcon = '';
			let externalIcon = '';
			let domain = '';

			/* PDFアイコン */
			if (url.endsWith('.pdf')) {
				typeAttr = ' type="application/pdf"';
				typeIcon = '<img src="/image/icon/pdf.png" alt="(PDF)" class="c-link-icon"/>';
			}

			/* サイトアイコン */
			switch (host) {
				case 'twitter.com':
					externalIcon = '<img src="/image/icon/twitter.svg" alt="(Twitter)" class="c-link-icon"/>';
					break;
				case 'ja.wikipedia.org':
					externalIcon = '<img src="/image/icon/wikipedia.svg" alt="(Wikipedia)" class="c-link-icon"/>';
					break;
				case 'www.youtube.com':
					externalIcon = '<img src="/image/icon/youtube.svg" alt="(YouTube)" class="c-link-icon"/>';
					break;
			}

			/* サイトアイコンがない場合はドメイン表記 */
			if (externalIcon === '') {
				domain = `<b class="c-domain">(${host})</b>`;
			}

			return `<a href="${url}"${typeAttr}>${linkText}${typeIcon}${externalIcon}</a>${domain}`;
		}

		throw new Error(`不正なリンクURL: ${url}`);
	}
}
