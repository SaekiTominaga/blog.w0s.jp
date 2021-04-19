import BlogDao from '../dao/BlogDao.js';
import dayjs from 'dayjs';
import hljs from 'highlight.js';
import hljsCss from 'highlight.js/lib/languages/css.js';
import hljsJavaScript from 'highlight.js/lib/languages/javascript.js';
import hljsXml from 'highlight.js/lib/languages/xml.js';
import Log4js from 'log4js';
import md5 from 'md5';
import PaapiItemImageUrlParser from '@saekitominaga/paapi-item-image-url-parser';
import path from 'path';
import StringEscapeHtml from '@saekitominaga/string-escape-html';
import { JSDOM } from 'jsdom';

type ImageType = 'figure' | 'photo';

/**
 * 記事メッセージのパーサー
 */
export default class MessageParser {
	/* Logger */
	private readonly logger: Log4js.Logger;

	/* Dao */
	private readonly dao: BlogDao;
	/* 記事 ID */
	private readonly topicId: number;

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
	private code = '';
	/* 注釈 */
	private readonly footnotes: string[] = [];

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
	private imageFlag = false;
	private videoFlag = false;
	private codeFlag = false;
	private insFlag = false;
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
	 * @param {number} topicId - 記事 ID
	 * @param {BlogDao} dao - Dao
	 */
	constructor(topicId: number, dao: BlogDao) {
		/* Logger */
		this.logger = Log4js.getLogger(this.constructor.name);

		this.topicId = topicId;
		this.dao = dao;

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
		const { document } = new JSDOM().window;

		let parentElement = document.createElement('x-x');
		let quoteElement = document.createElement('figure');
		let tbodyElement = document.createElement('tbody');

		const mainElement = document.createElement('div');
		mainElement.className = 'p-topic-main';
		mainElement.setAttribute('itemprop', 'articleBody');

		const lines = message.split('\n');

		for (const line of lines) {
			const lineTrim = line.trim();
			if (lineTrim === '') {
				this.appendCode(document, mainElement);
				this.flagReset();
				continue;
			}

			let blockConvert = false; // 変換処理を行ったか

			const firstChara = lineTrim.substring(0, 1); // 先頭文字

			if (firstChara === '#') {
				this.appendCode(document, mainElement);

				if (lineTrim === '#') {
					this.section1Flag = false;
					this.section2Flag = false;

					const sectionBreakElement = document.createElement('hr');
					sectionBreakElement.className = 'p-topic-section-break';
					this.appendChild(mainElement, sectionBreakElement);

					this.flagReset();
					blockConvert = true;
				} else if (lineTrim === '##') {
					this.section2Flag = false;

					const sectionBreakElement = document.createElement('hr');
					sectionBreakElement.className = 'p-topic-section-break';
					this.appendChild(mainElement, sectionBreakElement);

					this.flagReset();
					blockConvert = true;
				} else if (lineTrim.startsWith('# ')) {
					/* 先頭が # な場合は見出し（h2） */
					this.section1Count++;

					const lineText = lineTrim.substring(2); // 先頭記号を削除

					this.section1Element = document.createElement('section');
					this.section1Element.className = 'p-section1';
					this.section1Element.id = `section-${this.section1Count}`;
					mainElement.appendChild(this.section1Element);

					const h2Element = document.createElement('h2');
					h2Element.className = 'p-hdg1';
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
					this.section2Element.className = 'p-section2';
					this.section2Element.id = `section-${this.section1Count}-${this.section2Count}`;
					this.appendChild(mainElement, this.section2Element);

					this.section2Flag = true;

					const h3Element = document.createElement('h3');
					h3Element.className = 'p-hdg2';
					h3Element.textContent = lineText;
					this.appendChild(mainElement, h3Element);

					this.flagReset();
					blockConvert = true;
				}
			} else if (firstChara === '-') {
				this.appendCode(document, mainElement);

				if (lineTrim.startsWith('- ')) {
					/* 先頭が - な場合は順不同リスト */
					const lineText = lineTrim.substring(2); // 先頭記号を削除

					const liElement = document.createElement('li');
					if (this.ulFlag) {
						parentElement.appendChild(liElement);
					} else {
						const ulElement = document.createElement('ul');
						ulElement.className = 'p-topic-list';
						this.appendChild(mainElement, ulElement);

						ulElement.appendChild(liElement);

						parentElement = ulElement;
					}

					this.inlineMarkup(document, liElement, lineText); // インライン要素を設定
					this.flagReset();
					this.ulFlag = true;
					blockConvert = true;
				} else if (lineTrim.startsWith('-- ')) {
					/* 先頭が -- な場合はリンクリスト */
					const lineText = lineTrim.substring(3); // 先頭記号を削除

					const liElement = document.createElement('li');
					if (this.linksFlag) {
						parentElement.appendChild(liElement);
					} else {
						const ulElement = document.createElement('ul');
						ulElement.className = 'p-topic-links';
						this.appendChild(mainElement, ulElement);

						ulElement.appendChild(liElement);

						parentElement = ulElement;
					}

					this.inlineMarkup(document, liElement, lineText); // インライン要素を設定
					this.flagReset();
					this.linksFlag = true;
					blockConvert = true;
				}
			} else if (firstChara === '1') {
				this.appendCode(document, mainElement);

				if (lineTrim.startsWith('1. ')) {
					/* 先頭が 1. な場合は順序つきリスト */
					const lineText = lineTrim.substring(3); // 先頭記号を削除

					const liElement = document.createElement('li');
					if (this.olFlag) {
						parentElement.appendChild(liElement);
					} else {
						const olElement = document.createElement('ol');
						olElement.className = 'p-topic-list-num';
						this.appendChild(mainElement, olElement);

						olElement.appendChild(liElement);

						parentElement = olElement;
					}

					this.inlineMarkup(document, liElement, lineText); // インライン要素を設定
					this.flagReset();
					this.olFlag = true;
					blockConvert = true;
				}
			} else if (firstChara === ':') {
				this.appendCode(document, mainElement);

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
							this.inlineMarkup(document, ddElement, ddText); // インライン要素を設定
						}
					} else {
						const dlElement = document.createElement('dl');
						dlElement.className = 'p-topic-list-description';
						this.appendChild(mainElement, dlElement);

						const dtElement = document.createElement('dt');
						dlElement.appendChild(dtElement);
						dtElement.textContent = dtText;

						for (const ddText of ddTextList) {
							const ddElement = document.createElement('dd');
							dlElement.appendChild(ddElement);
							this.inlineMarkup(document, ddElement, ddText); // インライン要素を設定
						}

						parentElement = dlElement;
					}

					this.flagReset();
					this.dlFlag = true;
					blockConvert = true;
				}
			} else if (firstChara === '>') {
				this.appendCode(document, mainElement);

				if (lineTrim.startsWith('> ')) {
					/* 先頭が > な場合はブロックレベルの引用 */
					const lineText = lineTrim.substring(2); // 先頭記号を削除

					const pElement = document.createElement('p');
					pElement.textContent = lineText;
					if (this.blockquoteFlag) {
						parentElement.appendChild(pElement);
					} else {
						quoteElement = document.createElement('figure');
						quoteElement.className = 'p-topic-quote';
						this.appendChild(mainElement, quoteElement);

						const blockquoteElement = document.createElement('blockquote');
						blockquoteElement.className = 'p-topic-quote__quote';
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
					omitElement.className = 'p-topic-quote__omit';
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
					quoteCaptionElement.className = 'p-topic-quote__caption';
					quoteElement.appendChild(quoteCaptionElement);

					const sourceElement = document.createElement('span');
					sourceElement.className = 'p-topic-quote__source';
					quoteCaptionElement.appendChild(sourceElement);

					if (this.blockquoteCite === '') {
						sourceElement.textContent = lineText;
					} else {
						const aElement = document.createElement('a');
						aElement.href = this.blockquoteCite;
						if (this.blockquoteLang !== '') {
							aElement.setAttribute('hreflang', this.blockquoteLang);
						}
						aElement.textContent = lineText;
						sourceElement.appendChild(aElement);

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
						sourceElement.appendChild(domainElement);
					}
				}

				this.flagReset();
				this.blockquoteCiteFlag = true;
				blockConvert = true;
			} else if (firstChara === '$') {
				this.appendCode(document, mainElement);

				if (lineTrim.startsWith('$photo: ')) {
					/* 先頭が $photo: な場合は写真の画像（.diary_article_image figure.image > img） */
					const lineText = lineTrim.substring(8); // 先頭記号を削除

					const strpos = lineText.indexOf(' ');
					if (strpos !== -1) {
						const file = lineText.substring(0, strpos);
						const caption = lineText.substring(strpos + 1);

						if (this.imageFlag) {
							this.setImage(document, parentElement, file, caption, 'photo');
						} else {
							const figureBlockElement = document.createElement('div');
							figureBlockElement.className = 'p-topic-image';

							parentElement = figureBlockElement;

							this.setImage(document, figureBlockElement, file, caption, 'photo');

							this.appendChild(mainElement, figureBlockElement);
						}

						this.flagReset();
						this.imageFlag = true;
						blockConvert = true;
					}
				} else if (lineTrim.startsWith('$image: ')) {
					/* 先頭が $image: な場合は図の画像 */
					const lineText = lineTrim.substring(8); // 先頭記号を削除

					const strpos = lineText.indexOf(' ');
					if (strpos !== -1) {
						const file = lineText.substring(0, strpos);
						const caption = lineText.substring(strpos + 1);

						if (this.imageFlag) {
							this.setImage(document, parentElement, file, caption, 'figure');
						} else {
							const figureBlockElement = document.createElement('div');
							figureBlockElement.className = 'p-topic-image';

							parentElement = figureBlockElement;

							this.setImage(document, figureBlockElement, file, caption, 'figure');

							this.appendChild(mainElement, figureBlockElement);
						}

						this.flagReset();
						this.imageFlag = true;
						blockConvert = true;
					}
				} else if (lineTrim.startsWith('$video: ')) {
					/* 先頭が $video: な場合は動画 */
					const lineText = lineTrim.substring(8); // 先頭記号を削除

					const strpos = lineText.indexOf(' ');
					if (strpos !== -1) {
						const file = lineText.substring(0, strpos);
						const caption = lineText.substring(strpos + 1);

						if (this.videoFlag) {
							this.setVideo(document, parentElement, file, caption);
						} else {
							const figureBlockElement = document.createElement('div');
							figureBlockElement.className = 'p-topic-video';

							parentElement = figureBlockElement;

							this.setVideo(document, figureBlockElement, file, caption);

							this.appendChild(mainElement, figureBlockElement);
						}

						this.flagReset();
						this.videoFlag = true;
						blockConvert = true;
					}
				} else if (lineTrim.startsWith('$youtube: ')) {
					/* 先頭が $youtube: な場合はYouTube動画 */
					const lineText = lineTrim.substring(10); // 先頭記号を削除

					const videoInfos = lineText.split(' '); // 半角空白で分割
					if (videoInfos.length >= 3) {
						const youtubeId = videoInfos[0]; // 動画ID
						const size = videoInfos[1].split('x', 2); // 幅x高さ
						const caption = videoInfos.slice(2).join(' '); // タイトル

						const videoWrapElement = document.createElement('div');
						videoWrapElement.className = 'p-topic-video';
						this.appendChild(mainElement, videoWrapElement);

						const videoAreaElement = document.createElement('figure');
						videoAreaElement.className = 'p-topic-video__video-area';
						videoWrapElement.appendChild(videoAreaElement);

						const frameAreaElement = document.createElement('div');
						frameAreaElement.className = 'p-topic-video__frame-area';
						videoAreaElement.appendChild(frameAreaElement);

						const iframeElement = document.createElement('iframe');
						iframeElement.src = `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0`; // rel=0 は関連動画を表示しない設定
						iframeElement.allow = 'encrypted-media;fullscreen;gyroscope;picture-in-picture';
						iframeElement.title = 'YouTube 動画';
						iframeElement.width = size[0];
						iframeElement.height = size[1];
						iframeElement.textContent = '';
						frameAreaElement.appendChild(iframeElement);

						const figcaptionElement = document.createElement('figcaption');
						figcaptionElement.className = 'c-embedded-caption';
						videoAreaElement.appendChild(figcaptionElement);

						const aElement = document.createElement('a');
						aElement.href = `https://www.youtube.com/watch?v=${youtubeId}`;
						aElement.textContent = caption;
						figcaptionElement.appendChild(aElement);

						const iconElement = document.createElement('img');
						iconElement.src = '/image/icon/youtube.svg';
						iconElement.alt = '(YouTube)';
						iconElement.className = 'c-link-icon';
						aElement.appendChild(iconElement);

						this.flagReset();
						blockConvert = true;
					}
				} else if (lineTrim.startsWith('$tweet: ')) {
					/* 先頭が $tweet: な場合は埋め込みツイート（.diary_article_tweets > .tweet） */
					const lineText = lineTrim.substring(8); // 先頭記号を削除

					const tweetBlockElement = document.createElement('div');
					tweetBlockElement.className = 'p-topic-tweets';

					for (const tweetId of lineText.split(' ')) {
						const tweetData = await this.dao.getTweet(tweetId);

						if (tweetData === null) {
							this.logger.error(`d_tweet テーブルに存在しないツイート ID が指定: ${tweetId}（記事ID: ${this.topicId}）`);
							continue;
						}

						const tweetWrapperElement = document.createElement('div');
						tweetWrapperElement.className = 'p-topic-tweets__tweet';
						tweetBlockElement.appendChild(tweetWrapperElement);

						const tweetElement = document.createElement('blockquote');
						tweetElement.className = 'p-topic-tweets__tweet-quote twitter-tweet';
						tweetElement.setAttribute('data-dnt', 'true');
						tweetWrapperElement.appendChild(tweetElement);

						const tweetTextElement = document.createElement('p');
						tweetTextElement.textContent = tweetData.text;
						tweetElement.appendChild(tweetTextElement);
						tweetElement.textContent = `— ${tweetData.name}(@${tweetData.screen_name})`;

						const tweetLinkElement = document.createElement('a');
						tweetLinkElement.href = `https://twitter.com/${tweetData.screen_name}/status/${tweetId}`;
						tweetLinkElement.textContent = dayjs(tweetData.created_at).format('YYYY年M月D日 HH:mm');
						tweetElement.appendChild(tweetLinkElement);

						this.tweetExist = true;
					}

					if (this.tweetExist) {
						this.appendChild(mainElement, tweetBlockElement);
					}

					this.flagReset();
					blockConvert = true;
				} else if (lineTrim.startsWith('$amazon: ')) {
					/* 先頭が $amazon: な場合はAmazonリンク */
					const lineText = lineTrim.substring(9); // 先頭記号を削除

					const amazonElement = document.createElement('aside');
					amazonElement.className = 'p-topic-amazon';
					this.appendChild(mainElement, amazonElement);

					let headingElement: HTMLHeadingElement;
					if (this.section2Flag) {
						headingElement = document.createElement('h4');
					} else if (this.section1Flag) {
						headingElement = document.createElement('h3');
					} else {
						headingElement = document.createElement('h2');
					}
					headingElement.className = 'p-topic-amazon__hdg';
					amazonElement.appendChild(headingElement);

					const headingImageElement = document.createElement('img');
					headingImageElement.src = '/image/topic/amazon_buy.png';
					headingImageElement.srcset = '/image/topic/amazon_buy@2x.png 2x';
					headingImageElement.alt = 'Amazonで買う';
					headingElement.appendChild(headingImageElement);

					const ulElement = document.createElement('ul');
					ulElement.className = 'p-topic-amazon__list';
					amazonElement.appendChild(ulElement);

					for (const asin of lineText.split(' ')) {
						const amazonData = await this.dao.getAmazon(asin);

						if (amazonData === null) {
							this.logger.error(`d_amazon テーブルに存在しない ASIN が指定: ${asin} （記事ID: ${this.topicId}）`);
							continue;
						}

						const liElement = document.createElement('li');
						ulElement.appendChild(liElement);

						const dpAreaElement = document.createElement('a');
						dpAreaElement.className = 'p-topic-amazon__dp';
						dpAreaElement.setAttribute('href', amazonData.url);
						liElement.appendChild(dpAreaElement);

						const dpImageAreaElement = document.createElement('div');
						dpImageAreaElement.className = 'p-topic-amazon__image-area';
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
						dpImageElement.className = 'p-topic-amazon__image';
						dpImageAreaElement.appendChild(dpImageElement);

						const dpTextAreaElement = document.createElement('div');
						dpTextAreaElement.className = 'p-topic-amazon__text-area';
						dpAreaElement.appendChild(dpTextAreaElement);

						const dpTitleElement = document.createElement('p');
						dpTitleElement.className = 'p-topic-amazon__title';
						dpTitleElement.textContent = amazonData.title;
						dpTextAreaElement.appendChild(dpTitleElement);

						if (amazonData.binding !== null) {
							const bindingElement = document.createElement('b');
							switch (amazonData.binding) {
								case 'Blu-ray':
									bindingElement.className = 'p-topic-amazon__binding -bd';
									break;
								case 'Kindle版':
									bindingElement.className = 'p-topic-amazon__binding -kindle';
									break;
								default:
									bindingElement.className = 'p-topic-amazon__binding';
							}
							bindingElement.textContent = amazonData.binding;
							dpTitleElement.appendChild(bindingElement);
						}

						if (amazonData.date !== null) {
							const date = amazonData.date;

							const dpTimeElement = document.createElement('p');
							dpTimeElement.className = 'p-topic-amazon__time';
							dpTimeElement.textContent = `${dayjs(date).format('YYYY年M月D日')} 発売`;
							dpTextAreaElement.appendChild(dpTimeElement);

							if (date.getTime() > new Date().getTime()) {
								const planElement = document.createElement('em');
								planElement.className = 'p-topic-amazon__time-plan';
								planElement.textContent = '予定';
								dpTimeElement.appendChild(planElement);
							}
						}
					}

					this.flagReset();
					blockConvert = true;
				}
			} else if (firstChara === '`') {
				if (lineTrim.startsWith('` ')) {
					/* 先頭が ` な場合はコード表示（.diary_article_sample code） */
					const lineText = lineTrim.substring(2); // 先頭記号を削除、改行を追加

					if (this.codeFlag) {
						this.code += `${lineText}\n`;
					} else {
						this.code = `${lineText}\n`;
					}

					this.flagReset();
					this.codeFlag = true;
					blockConvert = true;
				} else if (this.codeFlag && lineTrim === '`') {
					/* ` のみな場合は空行を挿入 */
					this.code += '\n';

					blockConvert = true;
				}
			} else if (firstChara === '*') {
				this.appendCode(document, mainElement);

				if (lineTrim.startsWith('* ')) {
					/* 先頭が * な場合は注釈（.diary_article_note） */
					const lineText = lineTrim.substring(2); // 先頭記号を削除

					const wrapElement = document.createElement('div');
					wrapElement.className = 'p-topic-note';
					this.appendChild(mainElement, wrapElement);

					const noteElement = document.createElement('p');
					noteElement.className = 'p-topic-note__note';
					wrapElement.appendChild(noteElement);

					const markElement = document.createElement('span');
					markElement.className = 'p-topic-note__mark';
					markElement.textContent = '※';
					noteElement.appendChild(markElement);

					const textElement = document.createElement('span');
					textElement.className = 'p-topic-note__text';
					noteElement.appendChild(textElement);

					this.inlineMarkup(document, textElement, lineText); // インライン要素を設定
					this.flagReset();
					blockConvert = true;
				} else if (/^\*\d{4}-[0-1]\d-[0-3]\d: /.test(lineTrim)) {
					/* 先頭が #YYYY-MM-DD な場合は追記（ins p） */
					const date = dayjs(new Date(Number(lineTrim.substring(1, 5)), Number(lineTrim.substring(6, 8)) - 1, Number(lineTrim.substring(9, 11))));
					const lineText = lineTrim.substring(13); // 先頭の「*YYYY-MM-DD: 」を削除

					const insElement = document.createElement('ins');
					insElement.className = 'p-topic-ins__ins';
					insElement.setAttribute('datetime', date.format('YYYY-MM-DD'));

					if (this.insFlag) {
						parentElement.appendChild(insElement);
					} else {
						const wrapElement = document.createElement('div');
						wrapElement.className = 'p-topic-ins';
						this.appendChild(mainElement, wrapElement);

						parentElement = wrapElement;

						wrapElement.appendChild(insElement);
					}

					const dateElement = document.createElement('span');
					dateElement.className = 'p-topic-ins__date';
					dateElement.textContent = `${date.format('YYYY年M月D日')}追記`;
					insElement.appendChild(dateElement);

					const textElement = document.createElement('span');
					textElement.className = 'p-topic-ins__text';
					insElement.appendChild(textElement);

					this.inlineMarkup(document, textElement, lineText); // インライン要素を設定

					this.flagReset();
					this.insFlag = true;
					blockConvert = true;
				}
			} else if (firstChara === '/') {
				this.appendCode(document, mainElement);

				if (lineTrim.startsWith('/ ')) {
					/* 先頭が / な場合は本文と区別するブロック（.diary_article_box） */
					const lineText = lineTrim.substring(2); // 先頭記号を削除

					const pElement = document.createElement('p');
					this.inlineMarkup(document, pElement, lineText); // インライン要素を設定

					if (this.distFlag) {
						parentElement.appendChild(pElement);
					} else {
						const distElement = document.createElement('div');
						distElement.className = 'p-topic-box';
						this.appendChild(mainElement, distElement);

						distElement.appendChild(pElement);

						parentElement = distElement;
					}

					this.flagReset();
					this.distFlag = true;
					blockConvert = true;
				}
			} else if (firstChara === '|') {
				this.appendCode(document, mainElement);

				if (lineTrim.startsWith('|$')) {
					/* 先頭が |$ な場合は表ヘッダ（thead） */
					const lineText = lineTrim.substring(2); // 先頭記号を削除

					const theadElement = document.createElement('thead');
					if (this.tableFlag) {
						parentElement.appendChild(theadElement);
					} else {
						const tableElement = document.createElement('table');
						tableElement.className = 'p-topic-table';
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
							tableElement.className = 'p-topic-table';
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

							this.inlineMarkup(document, thElement, dataTrim); // アンカーを設定
						} else {
							const dataTrim = data.trim();

							const tdElement = document.createElement('td');
							trElement.appendChild(tdElement);

							this.inlineMarkup(document, tdElement, dataTrim); // アンカーを設定
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
				this.appendCode(document, mainElement);

				const pElement = document.createElement('p');
				pElement.className = 'p-topic-text';
				this.appendChild(mainElement, pElement);

				this.inlineMarkup(document, pElement, lineTrim); // インライン要素を設定
				this.flagReset();
			}
		}

		this.appendCode(document, mainElement);

		if (this.footnotes.length > 0) {
			const footnotesElement = document.createElement('ul');
			footnotesElement.setAttribute('class', 'p-topic-footnote');
			mainElement.appendChild(footnotesElement);

			let num = 1;
			for (const footnote of this.footnotes) {
				const href = `${this.topicId}-${num}`;

				const liElement = document.createElement('li');
				footnotesElement.appendChild(liElement);

				const noElement = document.createElement('span');
				noElement.className = 'p-topic-footnote__no';
				liElement.appendChild(noElement);

				const aElement = document.createElement('a');
				aElement.href = `#nt${href}`;
				aElement.textContent = `[${num}]`;
				noElement.appendChild(aElement);

				const textElement = document.createElement('span');
				textElement.className = 'p-topic-footnote__text';
				textElement.id = `fn${href}`;
				liElement.appendChild(textElement);

				this.inlineMarkup(document, textElement, footnote, false);

				num++;
			}
		}

		return mainElement.outerHTML;
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
		this.imageFlag = false;
		this.videoFlag = false;
		this.codeFlag = false;
		this.insFlag = false;
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
	 * code を挿入する
	 *
	 * @param {object} document - Document
	 * @param {object} topicMainElement - 記事のメイン要素
	 */
	private appendCode(document: Document, topicMainElement: HTMLElement): void {
		if (this.codeFlag) {
			const code = this.code.trim();

			/* コードハイライト */
			const classPrefix = 'c-topic-code-highlight -';

			hljs.registerLanguage('xml', hljsXml);
			hljs.registerLanguage('css', hljsCss);
			hljs.registerLanguage('javascript', hljsJavaScript);

			const highlighted = hljs.highlightAuto(code);
			let highlightedValue = highlighted.value;
			const highlightedLanguage = highlighted.language;

			highlightedValue = highlightedValue.replace(new RegExp(`<span class="${classPrefix}([-_a-zA-Z0-9]+)"></span>`, 'g'), ''); // 中身が空の要素を削除

			const codeId = `code-${md5(highlightedValue)}`; // コード ID

			/* コードの挿入 */
			const codeWrapperElement = document.createElement('div');
			codeWrapperElement.setAttribute('class', 'p-topic-code');
			this.appendChild(topicMainElement, codeWrapperElement);

			const codeboxElement = document.createElement('div');
			codeboxElement.setAttribute('class', 'p-topic-code__box');
			codeWrapperElement.appendChild(codeboxElement);

			if (code.includes('\n')) {
				/* 複数行の場合はクリップボードボタンを表示する */
				const clipboardElement = document.createElement('div');
				clipboardElement.setAttribute('class', 'p-topic-code__clipboard');
				codeboxElement.appendChild(clipboardElement);

				const clipboardButtonElement = document.createElement('button');
				clipboardButtonElement.type = 'button';
				clipboardButtonElement.setAttribute('is', 'w0s-clipboard');
				clipboardButtonElement.setAttribute('data-target-for', codeId);
				clipboardButtonElement.className = 'p-topic-code__clipboard-button';
				clipboardElement.appendChild(clipboardButtonElement);

				const clipboardIconElement = document.createElement('img');
				clipboardIconElement.src = '/image/topic/copy.svg';
				clipboardIconElement.alt = 'コピー';
				clipboardButtonElement.appendChild(clipboardIconElement);
			}

			const preElement = document.createElement('pre');
			preElement.className = 'p-topic-code__code';
			codeboxElement.appendChild(preElement);

			const codeElement = document.createElement('code');
			codeElement.id = codeId;
			if (highlightedLanguage !== undefined) {
				codeElement.setAttribute('data-language', highlightedLanguage);
			}
			preElement.appendChild(codeElement);

			codeElement.insertAdjacentHTML('beforeend', highlightedValue);
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
		figureElement.className = 'p-topic-image__image-area';
		parentElement.appendChild(figureElement);

		const aElement = document.createElement('a');
		aElement.href = `https://media.w0s.jp/image/diary/${fileName}`;
		figureElement.appendChild(aElement);

		switch (path.extname(fileName)) {
			case 'svg': {
				/* SVG */
				aElement.type = 'image/svg+xml';

				const imgElement = document.createElement('img');
				imgElement.src = `https://media.w0s.jp/image/diary/${fileName}`;
				imgElement.alt = 'オリジナル画像';
				aElement.appendChild(imgElement);
				break;
			}
			default: {
				const pictureElement = document.createElement('picture');
				aElement.appendChild(pictureElement);

				const sourceElement1 = document.createElement('source');
				sourceElement1.type = 'image/avif';
				sourceElement1.srcset = `https://media.w0s.jp/thumbimage/diary/${fileName}?type=avif;w=360;mh=360;quality=60, https://media.w0s.jp/thumbimage/diary/${fileName}?type=avif;w=720;mh=720;quality=30 2x`;
				pictureElement.appendChild(sourceElement1);

				const sourceElement2 = document.createElement('source');
				sourceElement2.type = 'image/webp';
				sourceElement2.srcset = `https://media.w0s.jp/thumbimage/diary/${fileName}?type=webp;w=360;mh=360;quality=60, https://media.w0s.jp/thumbimage/diary/${fileName}?type=webp;w=720;mh=720;quality=30 2x`;
				pictureElement.appendChild(sourceElement2);

				const imgElement = document.createElement('img');
				imgElement.src = `https://media.w0s.jp/thumbimage/diary/${fileName}?type=jpeg;w=360;mh=360;quality=60`;
				imgElement.alt = 'オリジナル画像';
				pictureElement.appendChild(imgElement);
			}
		}

		const figcaptionElement = document.createElement('figcaption');
		figcaptionElement.className = 'c-embedded-caption';
		figureElement.appendChild(figcaptionElement);

		const numElement = document.createElement('span');
		numElement.className = 'c-embedded-caption__num';
		figcaptionElement.appendChild(numElement);

		const captionTitleElement = document.createElement('span');
		captionTitleElement.className = 'c-embedded-caption__title';
		captionTitleElement.textContent = caption;
		figcaptionElement.appendChild(captionTitleElement);

		switch (type) {
			case 'photo':
				numElement.textContent = `写真${this.photoNum}:`;
				this.photoNum++;
				break;
			case 'figure':
				numElement.textContent = `図${this.figureNum}:`;
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
		figureElement.className = 'p-topic-video__video-area';
		parentElement.appendChild(figureElement);

		const videoElement = document.createElement('video');
		videoElement.src = `https://media.w0s.jp/video/diary/${fileName}`;
		videoElement.controls = true;
		videoElement.textContent = '';
		figureElement.appendChild(videoElement);

		const figcaptionElement = document.createElement('figcaption');
		figcaptionElement.className = 'c-embedded-caption';
		figureElement.appendChild(figcaptionElement);

		const numElement = document.createElement('span');
		numElement.className = 'c-embedded-caption__num';
		numElement.textContent = `動画${this.videoNum}:`;
		figcaptionElement.appendChild(numElement);

		const captionTitleElement = document.createElement('span');
		captionTitleElement.className = 'c-embedded-caption__title';
		captionTitleElement.textContent = caption;
		figcaptionElement.appendChild(captionTitleElement);

		this.videoNum++;
	}

	/**
	 * インライン要素を設定
	 *
	 * @param {object} document - Document
	 * @param {object} parentElement - 親要素
	 * @param {string} str - 変換前の文字列
	 * @param {boolean} footnote - 注釈の変換を行うか
	 */
	private inlineMarkup(document: Document, parentElement: HTMLElement, str: string, footnote = true): void {
		if (str === '') {
			parentElement.textContent = '';
			return;
		}

		let htmlFragment = str;

		if (footnote) {
			htmlFragment = StringEscapeHtml.escape(htmlFragment); // 注釈がここを通るのは2回目なので処理不要
		}

		htmlFragment = htmlFragment.replace(/\*\*(.+?)\*\*/g, (_match, p1: string) => `<em class="c-topic-emphasis">${p1}</em>`);
		htmlFragment = htmlFragment.replace(/`(.+?)`/g, (_match, p1: string) => `<code class="c-topic-code">${p1}</code>`);
		htmlFragment = htmlFragment.replace(
			/{{(\d{1,5}-\d{1,7}-\d{1,7}-[\dX]|97[8-9]-\d{1,5}-\d{1,7}-\d{1,7}-\d) ([^{}]+)}}/g,
			(_match, p1: string, p2: string) => `<q class="c-topic-quote" cite="urn:ISBN:${p1}">${p2}</q>`
		);
		htmlFragment = htmlFragment.replace(
			/{{(https?:\/\/[-_.!~*'()a-zA-Z0-9;/?:@&=+$,%#]+) ([^{}]+)}}/g,
			(_match, p1: string, p2: string) => `<a href="${p1}"><q class="c-topic-quote" cite="${p1}">${p2}</q></a>`
		);
		htmlFragment = htmlFragment.replace(/{{([^{}]+)}}/g, (_match, p1: string) => `<q class="c-topic-quote">${p1}</q>`);
		htmlFragment = this.parsingInlineLink(htmlFragment);

		if (footnote) {
			htmlFragment = htmlFragment.replace(/\(\((.+?)\)\)/g, (_match, p1: string) => {
				this.footnotes.push(p1); // 注釈文

				const num = this.footnotes.length;
				const href = `${this.topicId}-${num}`;

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

			const linkUrl = regResult[1]; // リンクURL
			let linkText = afterOpeningTextDelimiterText.substring(0, afterOpeningTextDelimiterText.indexOf(`](${linkUrl}`)); // リンク文字列
			afterLinkText = regResult[2]; // リンク後の文字列

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
			const linkHtml = this.markupLink(linkText, linkUrl);

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
	 * @param {string} linkUrl - リンクURL
	 *
	 * @returns {string} 変換後の文字列
	 */
	private markupLink(linkText: string, linkUrl: string): string {
		if (/^([1-9]{1}[0-9]{0,2})$/.test(linkUrl)) {
			// TODO: 記事が1000を超えたら正規表現要修正
			return `<a href="${linkUrl}">${linkText}</a>`;
		} else if (/^#section-([1-9]{1}[-0-9]*)$/.test(linkUrl)) {
			return `<a href="${linkUrl}">${linkText}</a>`;
		} else if (/^\/[a-zA-Z0-9-_#/.]+$/.test(linkUrl)) {
			if (linkUrl.endsWith('.pdf')) {
				return `<a href="${linkUrl}" type="application/pdf">${linkText}<img src="/image/icon/pdf.png" alt="(PDF)" class="c-link-icon"></a>`;
			}

			return `<a href="${linkUrl}">${linkText}</a>`;
		} else if (/^asin:[0-9A-Z]{10}$/.test(linkUrl)) {
			return `<a href="https://www.amazon.co.jp/dp/${linkUrl.substring(
				5
			)}?tag=w0s.jp-22&amp;linkCode=ogi&amp;th=1&amp;psc=1">${linkText}<img src="/image/icon/amazon.png" alt="(Amazon)" class="c-link-icon"/></a>`;
		} else if (/^https?:\/\/[-_.!~*'()a-zA-Z0-9;/?:@&=+$,%#]+$/.test(linkUrl)) {
			if (linkText.startsWith('https://') || linkText.startsWith('http://')) {
				/* URL表記の場合はドメインを記載しない */
				return `<a href="${linkUrl}">${linkText}</a>`;
			}

			const linkHost = new URL(linkUrl).hostname;

			let aAttributeHtml = '';
			let typeIconHtml = '';
			let externalIconHtml = '';
			let domainHtml = '';

			/* PDFアイコン */
			if (linkUrl.endsWith('.pdf')) {
				aAttributeHtml = ' type="application/pdf"';
				typeIconHtml = '<img src="/image/icon/pdf.png" alt="(PDF)" class="c-link-icon"/>';
			}

			/* サイトアイコン */
			switch (linkHost) {
				case 'twitter.com':
					externalIconHtml = '<img src="/image/icon/twitter.svg" alt="(Twitter)" class="c-link-icon"/>';
					break;
				case 'ja.wikipedia.org':
					externalIconHtml = '<img src="/image/icon/wikipedia.svg" alt="(Wikipedia)" class="c-link-icon"/>';
					break;
				case 'www.youtube.com':
					externalIconHtml = '<img src="/image/icon/youtube.svg" alt="(YouTube)" class="c-link-icon"/>';
					break;
			}

			/* サイトアイコンがない場合はドメイン表記 */
			if (externalIconHtml === '') {
				domainHtml = `<b class="c-domain">(${linkHost})</b>`;
			}

			return `<a href="${linkUrl}"${aAttributeHtml}>${linkText}${typeIconHtml}${externalIconHtml}</a>${domainHtml}`;
		}

		throw new Error(`不正なリンクURL: ${linkUrl}`);
	}
}
