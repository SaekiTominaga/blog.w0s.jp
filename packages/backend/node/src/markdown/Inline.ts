import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { type Processor, unified } from 'unified';
import StringEscapeHtml from '@saekitominaga/string-escape-html';
import Footnote from './lib/Footnote.js';
import Code from './inline/Code.js';
import Link from './inline/Link.js';
import Quote from './inline/Quote.js';
import { regexp } from './config.js';

interface MarkOption {
	footnote?: boolean; // 脚注
}

/**
 * 記事メッセージのインライン処理
 */
export default class MarkdownInline {
	/* unified Processor */
	readonly #processor: Processor;

	/* 注釈 */
	readonly #footnotes = new Map<string, string>();

	/**
	 * コンストラクタ
	 */
	constructor() {
		const processor = unified();
		processor.use(remarkParse); // Markdown → mdast
		processor.use(Quote.toMdast);
		processor.use(remarkRehype, {
			handlers: {
				inlineCode: Code.toHast,
				link: Link.toHast,
				quote: Quote.toHast,
			},
		}); // mdast → hast
		processor.use(rehypeStringify, {
			entities: {
				useNamedReferences: true,
			},
			closeSelfClosing: true,
			tightSelfClosing: true,
		}); // hast → HTML
		processor.freeze();

		this.#processor = processor;
	}

	/**
	 * 脚注データを取得する
	 *
	 * @returns {Map<string, string>} - 脚注データ
	 */
	get footnotes(): Map<string, string> {
		return this.#footnotes;
	}

	/**
	 * 脚注データをセットする
	 *
	 * @param {string} id - 脚注の ID
	 * @param {string} value - 脚注の内容
	 */
	setFootnote(id: string, value = ''): void {
		this.#footnotes.set(id, value);
	}

	/**
	 * インライン要素を変換
	 *
	 * @param {string} input - 処理対象のテキスト
	 * @param {object} options - 変換を行う対象
	 *
	 * @returns {string} - 変換後の HTML 文字列
	 */
	mark(input: string, options: MarkOption = { footnote: true }): string {
		if (input === '') {
			return '';
		}

		const inputEscaped = StringEscapeHtml.escape(input);

		const htmlBlock = this.#processor.processSync(inputEscaped).value.toString();

		let html = htmlBlock.replace(/^<[a-z][a-z0-9-]*>/, '').replace(/<\/[a-z][a-z0-9-]*>$/, ''); // 外枠のタグを削除

		if (options.footnote) {
			html = this.#footnoteReference(html);
		}

		return html;
	}

	/**
	 * 脚注
	 *
	 * @param {string} input - 処理対象の HTML 文字列
	 *
	 * @returns {string} 変換後の HTML 文字列
	 */
	#footnoteReference(input: string): string {
		const FOOTNOTE_OPEN = '[^';
		const FOOTNOTE_CLOSE = ']';

		/**
		 * 変換実行
		 *
		 * @param {string} value - 変換対象の文字列
		 * @param {number} fromIndex - 検索を始める位置
		 *
		 * @returns {number} 未処理文字列の開始位置（これ以上処理が不要なときは undefined）
		 */
		const convert = (value: string, fromIndex = 0): { value: string; unconvertedIndex: number | undefined } => {
			const footnoteOpenIndex = value.indexOf(FOOTNOTE_OPEN, fromIndex);
			if (footnoteOpenIndex === -1) {
				return { value: value, unconvertedIndex: undefined };
			}
			const footnoteCloseIndex = value.indexOf(FOOTNOTE_CLOSE, footnoteOpenIndex + FOOTNOTE_OPEN.length);
			if (footnoteCloseIndex === -1) {
				return { value: value, unconvertedIndex: undefined };
			}

			const beforeFootenoteValue = value.substring(0, footnoteOpenIndex);
			const footnoteValue = value.substring(footnoteOpenIndex + FOOTNOTE_OPEN.length, footnoteCloseIndex);
			const afterFootenoteValue = value.substring(footnoteCloseIndex + FOOTNOTE_CLOSE.length);

			if (!footnoteValue.match(new RegExp(`^${regexp.footnoteId}$`))) {
				return { value: value, unconvertedIndex: undefined };
			}

			this.setFootnote(footnoteValue);
			const no = this.#footnotes.size;

			const converted = `${beforeFootenoteValue}<span class="c-annotate"><a href="#${StringEscapeHtml.escape(
				Footnote.getId(footnoteValue)
			)}" id="${StringEscapeHtml.escape(
				Footnote.getReferenceId(footnoteValue)
			)}" is="w0s-tooltip-trigger" data-tooltip-label="脚注" data-tooltip-class="p-tooltip" data-tooltip-close-text="閉じる" data-tooltip-close-image-src="/image/tooltip-close.svg">[${no}]</a></span>`;
			const unconvertedIndex = converted.length;

			return { value: `${converted}${afterFootenoteValue}`, unconvertedIndex: unconvertedIndex };
		};

		let { value, unconvertedIndex } = convert(input);
		while (unconvertedIndex !== undefined) {
			const converted = convert(value, unconvertedIndex);

			value = converted.value;
			unconvertedIndex = converted.unconvertedIndex;
		}

		return value;
	}
}
