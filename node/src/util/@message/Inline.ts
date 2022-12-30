import IsbnVerify from '@saekitominaga/isbn-verify';
import Log4js from 'log4js';
import StringEscapeHtml from '@saekitominaga/string-escape-html';
import InlineText, { TextData } from './InlineText.js';
import Util from './Util.js';
import { NoName as Configure } from '../../../configure/type/common.js';

interface AnchorHostIcon {
	host: string;
	name: string;
	src: string;
}

interface Option {
	entry_id: number; // 記事 ID
	anchor_host_icons: AnchorHostIcon[]; // リンクのサイトアイコン
	amazon_tracking_id: string; // Amazon トラッキング ID
	section_id_prefix: string; // セクション ID の接頭辞
}

interface MarkOption {
	anchor?: boolean; // <a>
	emphasis?: boolean; // <em>
	code?: boolean; // <code>
	quote?: boolean; // <q>
	footnote?: boolean; // 注釈
}

/**
 * 記事メッセージのインライン処理
 */
export default class Inline {
	/* Logger */
	readonly #logger: Log4js.Logger;

	/* 設定ファイル */
	readonly #config: Configure;

	/* パースで必要な様々な情報 */
	readonly #options: Option;

	/* 注釈 */
	readonly #footnotes: string[] = [];

	/**
	 * コンストラクタ
	 *
	 * @param {Configure} config - 共通設定ファイル
	 * @param {object} options - パースで必要な様々な情報
	 */
	constructor(config: Configure, options?: Partial<Option>) {
		/* Logger */
		this.#logger = Log4js.getLogger(this.constructor.name);

		/* 設定ファイル */
		this.#config = config;

		/* パースで必要な様々な情報 */
		this.#options = {
			entry_id: options?.entry_id ?? 0,
			anchor_host_icons: options?.anchor_host_icons ?? [],
			amazon_tracking_id: options?.amazon_tracking_id ?? '',
			section_id_prefix: options?.section_id_prefix ?? '',
		};
	}

	/**
	 * 脚注データを取得する
	 *
	 * @returns {string[]} - 脚注データ
	 */
	get footnotes(): string[] {
		return this.#footnotes;
	}

	/**
	 * インライン要素を変換
	 *
	 * @param {string} input - 処理対象のテキスト
	 * @param {object} options - 変換を行う対象
	 *
	 * @returns {string} - データを HTML エスケープした文字列
	 */
	mark(input: string, options: MarkOption = { anchor: true, emphasis: true, code: true, quote: true, footnote: true }): string {
		if (input === '') {
			return input;
		}

		const inlineText = new InlineText(StringEscapeHtml.escape(input));

		if (options.code) {
			this.#markCode(inlineText);
		}
		if (options.anchor) {
			this.#markAnchor(inlineText);
		}
		if (options.emphasis) {
			this.#markEmphasis(inlineText);
		}
		if (options.quote) {
			this.#markQuote(inlineText);
		}
		if (options.footnote) {
			this.#markFootnote(inlineText);
		}

		return inlineText.complete();
	}

	/**
	 * <a> 要素によるリンク HTML を組み立てる
	 *
	 * @param {string} anchorText - リンク文字列
	 * @param {string} urlText - リンク URL
	 * @param {object} attributes - href 属性以外に設定する属性情報
	 *
	 * @returns {string} <a> 要素の HTML 文字列
	 */
	anchor(anchorText: string, urlText: string, attributes?: { [k: string]: string | undefined }): string {
		const attributeMap = new Map<string, string>([['href', urlText]]);
		if (attributes !== undefined) {
			for (const [name, value] of Object.entries(attributes)) {
				if (name !== 'href' && value !== undefined) {
					attributeMap.set(name, value);
				}
			}
		}

		const url = new URL(urlText);

		let attrs_htmlescaped = '';
		let typeIcon_htmlescaped = '';
		let hostIcon_htmlescaped = '';

		/* PDFアイコン */
		if (url.pathname.endsWith('.pdf')) {
			attributeMap.set('type', 'application/pdf');
			typeIcon_htmlescaped = '<img src="/image/icon/pdf.png" alt="(PDF)" width="16" height="16" class="c-link-icon"/>';
		}

		/* URL 表記でない場合はドメイン情報を記載 */
		if (!anchorText.startsWith('https://') && !anchorText.startsWith('http://')) {
			const host = url.hostname;

			/* サイトアイコン */
			const hostIcon = this.#options.anchor_host_icons.find((icon) => icon.host === host);
			if (hostIcon !== undefined) {
				hostIcon_htmlescaped = StringEscapeHtml.template`<img src="${hostIcon.src}" alt="(${hostIcon.name})" width="16" height="16" class="c-link-icon"/>`;
			}

			/* サイトアイコンがない場合はホスト名をテキストで表記 */
			if (hostIcon_htmlescaped === '') {
				hostIcon_htmlescaped = StringEscapeHtml.template`<b class="c-domain">(${host})</b>`;
			}
		}

		for (const [name, value] of attributeMap) {
			attrs_htmlescaped += StringEscapeHtml.template` ${name}="${value}"`;
		}

		return `<a${attrs_htmlescaped}>${StringEscapeHtml.escape(anchorText)}</a>${typeIcon_htmlescaped}${hostIcon_htmlescaped}`;
	}

	/**
	 * <code>
	 *
	 * @param {InlineText} inlineText - 処理対象のテキストデータ
	 */
	#markCode(inlineText: InlineText): void {
		let nonfixData = inlineText.getNonfixCodeData();
		while (nonfixData !== undefined) {
			const { text, index } = nonfixData;

			const matched = text.match(/(?<beforeChar>.?)`(?<code>.+?)`/);
			const matchedWhole = matched?.at(0); // マッチした文字列全体
			const matchedIndex = matched?.index;
			const matchedInput = matched?.input;
			const matchedGroups = matched?.groups;
			if (matched === null || matchedWhole === undefined || matchedIndex === undefined || matchedInput === undefined || matchedGroups === undefined) {
				inlineText.replace(index, [{ text: text, code: false }]);
				nonfixData = inlineText.getNonfixCodeData();
				continue;
			}

			const { beforeChar, code } = matchedGroups;
			if (beforeChar === undefined || code === undefined) {
				inlineText.replace(index, [{ text: text, code: false }]);
				nonfixData = inlineText.getNonfixCodeData();
				continue;
			}

			const newData: TextData[] = [];

			if (beforeChar === '\\' && code.substring(code.length - 1) === '\\') {
				const beforeCode = matchedInput.substring(0, matchedIndex);

				newData.push({ text: beforeCode, code: false });
				newData.push({ text: `\`${code.substring(0, code.length - 1)}\``, code: false });
			} else {
				const beforeCode = `${matchedInput.substring(0, matchedIndex)}${beforeChar}`;

				newData.push({ text: beforeCode, code: false });
				newData.push({ text: `<code>${code}</code>`, code: true });
			}

			const afterCode = matchedInput.substring(matchedIndex + matchedWhole.length);
			if (afterCode !== '') {
				newData.push({ text: afterCode });
			}

			inlineText.replace(index, newData);
			nonfixData = inlineText.getNonfixCodeData();
		}
	}

	/**
	 * <a href>
	 *
	 * @param {InlineText} inlineText - 処理対象のテキストデータ
	 */
	#markAnchor(inlineText: InlineText): void {
		inlineText.getNocodeDatas().forEach((data): void => {
			const { text, index } = data;

			const replaced = text.replace(/\[(?<anchor>.+?)\]\((?<meta>[^(].*?)\)/g, (match, anchor_htmlescaped: string, meta_htmlescaped: string) => {
				const anchor = StringEscapeHtml.unescape(anchor_htmlescaped);
				const meta = StringEscapeHtml.unescape(meta_htmlescaped);

				/* 絶対 URL */
				const absoluteUrlMatchGroups = meta.match(new RegExp(`^(?<absoluteUrl>${this.#config.regexp['absolute_url']})$`))?.groups;
				if (absoluteUrlMatchGroups !== undefined) {
					const { absoluteUrl } = absoluteUrlMatchGroups;

					if (absoluteUrl !== undefined) {
						return this.anchor(anchor, absoluteUrl);
					}
				}

				/* 別記事へのリンク */
				const entryMatchGroups = meta.match(/^(?<id>[1-9][0-9]*)$/)?.groups;
				if (entryMatchGroups !== undefined) {
					const { id } = entryMatchGroups;

					if (id !== undefined) {
						return StringEscapeHtml.template`<a href="/${id}">${anchor}</a>`;
					}
				}

				/* Amazon 商品ページへのリンク */
				const amazonMatchGroups = meta.match(/^amazon:(?<asin>[0-9A-Z]{10})$/)?.groups;
				if (amazonMatchGroups !== undefined) {
					const { asin } = amazonMatchGroups;

					if (asin !== undefined) {
						const href =
							this.#options.amazon_tracking_id === ''
								? `https://www.amazon.co.jp/dp/${asin}/`
								: `https://www.amazon.co.jp/dp/${asin}/ref=nosim?tag=${this.#options.amazon_tracking_id}`; // https://affiliate.amazon.co.jp/help/node/topic/GP38PJ6EUR6PFBEC

						return StringEscapeHtml.template`<a href="${href}">${anchor}</a><img src="/image/icon/amazon.png" alt="(Amazon)" width="16" height="16" class="c-link-icon"/>`;
					}
				}

				/* ページ内リンク */
				const pageLinkMatchGroups = meta.match(new RegExp(`^#(?<id>${this.#options.section_id_prefix}.+)`))?.groups;
				if (pageLinkMatchGroups !== undefined) {
					const { id } = pageLinkMatchGroups;

					if (id !== undefined) {
						return StringEscapeHtml.template`<a href="#${id}">${anchor}</a>`;
					}
				}

				this.#logger.warn(`不正なリンク情報: ${meta}`);
				return match;
			});

			inlineText.replace(index, [{ text: replaced, code: false }]);
		});
	}

	/**
	 * <em>
	 *
	 * @param {InlineText} inlineText - 処理対象のテキストデータ
	 */
	#markEmphasis(inlineText: InlineText): void {
		inlineText.getNocodeDatas().forEach((data): void => {
			const { text, index } = data;

			const replaced = text.replace(/(.?)\*\*(.+?)\*\*/g, (_match, beforeEmphasis_htmlescaped: string, emphasis_htmlescaped: string) => {
				const beforeEmphasis = StringEscapeHtml.unescape(beforeEmphasis_htmlescaped);
				const emphasis = StringEscapeHtml.unescape(emphasis_htmlescaped);

				if (beforeEmphasis === '\\' && emphasis.substring(emphasis.length - 1) === '\\') {
					return `**${emphasis_htmlescaped.substring(0, emphasis_htmlescaped.length - 1)}**`;
				}
				return `${beforeEmphasis_htmlescaped}<em>${emphasis_htmlescaped}</em>`;
			});

			inlineText.replace(index, [{ text: replaced, code: false }]);
		});
	}

	/**
	 * <q>
	 *
	 * @param {InlineText} inlineText - 処理対象のテキストデータ
	 */
	#markQuote(inlineText: InlineText): void {
		inlineText.getNocodeDatas().forEach((data): void => {
			const { text, index } = data;

			const replaced = text.replace(
				/{{(?<quoteWithMetas>.+?)}}\((?<metas>[^(].*?)\)|{{(?<quoteOnly>.+?)}}/g,
				(match, quoteWithMeta_htmlescaped?: string, metas_htmlescaped?: string, quoteOnly_htmlescaped?: string) => {
					const quote_htmlescaped = quoteWithMeta_htmlescaped ?? quoteOnly_htmlescaped;
					if (quote_htmlescaped === undefined) {
						return match;
					}

					const quote = StringEscapeHtml.unescape(quote_htmlescaped);

					const qAttributeMap = new Map<string, string>();

					if (metas_htmlescaped !== undefined) {
						const metas = StringEscapeHtml.unescape(metas_htmlescaped);

						let url: string | undefined;
						let isbn: string | undefined;

						for (const metaWord of metas.split(' ')) {
							if (new RegExp(`^${this.#config.regexp['absolute_url']}$`).test(metaWord)) {
								url = metaWord;
							} else if (new RegExp(`^${this.#config.regexp['isbn']}$`).test(metaWord)) {
								isbn = metaWord;
							} else if (new RegExp(`^${this.#config.regexp['lang']}$`).test(metaWord)) {
								qAttributeMap.set('lang', metaWord);
							}
						}

						if (url !== undefined) {
							if (isbn !== undefined) {
								this.#logger.warn(`インライン引用に URL<${url}> と ISBN<${isbn}> が両方指定`);
							}

							qAttributeMap.set('cite', url);

							let qAttr_htmlescaped = '';
							for (const [name, value] of qAttributeMap) {
								qAttr_htmlescaped += StringEscapeHtml.template` ${name}="${value}"`;
							}

							return this.anchor(quote, url)
								.replace(/^<a (?<attr>.+?)>/, `<a $<attr>><q${qAttr_htmlescaped}>`)
								.replace('</a>', '</q></a>');
						} else if (isbn !== undefined) {
							if (new IsbnVerify(isbn, { strict: true }).isValid()) {
								qAttributeMap.set('cite', `urn:ISBN:${isbn}`);
							} else {
								this.#logger.warn(`ISBN<${isbn}> のチェックデジット不正`);
							}
						}
					}

					let qAttr_htmlescaped = '';
					for (const [name, value] of qAttributeMap) {
						qAttr_htmlescaped += StringEscapeHtml.template` ${name}="${value}"`;
					}

					return `<q${qAttr_htmlescaped}>${StringEscapeHtml.escape(quote)}</q>`;
				}
			);

			inlineText.replace(index, [{ text: replaced, code: false }]);
		});
	}

	/**
	 * 注釈
	 *
	 * @param {InlineText} inlineText - 処理対象のテキストデータ
	 */
	#markFootnote(inlineText: InlineText): void {
		inlineText.getNocodeDatas().forEach((data): void => {
			const { text, index } = data;

			const replaced = text.replace(/\(\((?<footnote>.+?)\)\)/g, (_match, footnote_htmlescaped: string) => {
				this.#footnotes.push(footnote_htmlescaped); // 注釈文

				const no = this.#footnotes.length;
				const href = Util.getFootnoteId(this.#options.entry_id, no);

				return StringEscapeHtml.template`<span class="c-annotate"><a href="#fn${href}" id="nt${href}" is="w0s-tooltip-trigger" data-tooltip-label="脚注" data-tooltip-class="p-tooltip" data-tooltip-close-text="閉じる" data-tooltip-close-image-src="/image/tooltip-close.svg">[${no}]</a></span>`;
			});

			inlineText.replace(index, [{ text: replaced, code: false }]);
		});
	}
}
