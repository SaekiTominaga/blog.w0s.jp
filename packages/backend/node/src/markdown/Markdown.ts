import { mdastDefListTerm2hast, mdastDefListDescription2hast } from 'mdast-util-definition-list';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkLintBlockquoteIndentation from 'remark-lint-blockquote-indentation';
import remarkLintCodeBlockStyle from 'remark-lint-code-block-style';
import remarkLintEmphasisMarker from 'remark-lint-emphasis-marker';
import remarkLintFencedCodeFlag from 'remark-lint-fenced-code-flag';
import remarkLintFencedCodeMarker from 'remark-lint-fenced-code-marker';
import remarkLintFirstHeadingLevel from 'remark-lint-first-heading-level';
import remarkLintHeadingIncrement from 'remark-lint-heading-increment';
import remarkLintHeadingStyle from 'remark-lint-heading-style';
import remarkLintListItemBulletIndent from 'remark-lint-list-item-bullet-indent';
import remarkLintListItemContentIndent from 'remark-lint-list-item-content-indent';
import remarkLintListItemIndent from 'remark-lint-list-item-indent';
import remarkLintNoBlockquoteWithoutMarker from 'remark-lint-no-blockquote-without-marker';
import remarkLintNoConsecutiveBlankLines from 'remark-lint-no-consecutive-blank-lines';
import remarkLintNoDuplicateHeadingsInSection from 'remark-lint-no-duplicate-headings-in-section';
import remarkLintNoHeadingContentIndent from 'remark-lint-no-heading-content-indent';
import remarkLintNoInlinePadding from 'remark-lint-no-inline-padding';
import remarkLintNoMissingBlankLines from 'remark-lint-no-missing-blank-lines';
import remarkLintNoShortcutReferenceLink from 'remark-lint-no-shortcut-reference-link';
import remarkLintNoTableIndentation from 'remark-lint-no-table-indentation';
import remarkLintOrderedListMarkerStyle from 'remark-lint-ordered-list-marker-style';
import remarkLintOrderedListMarkerValue from 'remark-lint-ordered-list-marker-value';
import remarkLintStrongMarker from 'remark-lint-strong-marker';
import remarkLintTableCellPadding from 'remark-lint-table-cell-padding';
import remarkLintTablePipes from 'remark-lint-table-pipes';
import remarkLintUnorderedListMarkerStyle from 'remark-lint-unordered-list-marker-style';
import remarkRehype from 'remark-rehype';
import { type Processor, unified } from 'unified';
import type { VFile } from 'unified-lint-rule/lib/index.js';
import footnoteHast from './hast/footnote.js';
import remarkLintHeadingDepthLimit from './lint/headingDepthLimit.js';
import remarkLintNoEmptySections from './lint/noEmptySection.js';
import remarkLintNoLinkTitle from './lint/noLinkTitle.js';
import remarkLintNoLooseList from './lint/noLooseList.js';
import remarkLintNoTypes from './lint/noTypes.js';
import { xBlockquoteToHast } from './toHast/block/blockquote.js';
import { xBoxToHast } from './toHast/block/box.js';
import { codeToHast } from './toHast/block/code.js';
import { defListToHast } from './toHast/block/definitionList.js';
import { xEmbeddedMediaToHast, xEmbeddedAmazonToHast, xEmbeddedYouTubeToHast } from './toHast/block/embedded.js';
import { xEmptyToHast } from './toHast/block/empty.js';
import { headingToHast, xHeadingToHast } from './toHast/block/heading.js';
import { htmlToHast } from './toHast/block/html.js';
import { listToHast } from './toHast/block/list.js';
import { xSectionToHast } from './toHast/block/section.js';
import { tableToHast } from './toHast/block/table.js';
import { xTocToHast } from './toHast/block/toc.js';
import { footnoteReferenceToHast } from './toHast/phrasing/footnote.js';
import { linkToHast } from './toHast/phrasing/link.js';
import { xQuoteToHast } from './toHast/phrasing/quote.js';
import blockquoteToMdast from './toMdast/block/blockquote.js';
import boxToMdast from './toMdast/block/box.js';
import defListToMdast from './toMdast/block/definitionList.js';
import embeddedToMdast from './toMdast/block/embedded.js';
import emptyToMdast from './toMdast/block/empty.js';
import headingToMdast from './toMdast/block/heading.js';
import sectionToMdast from './toMdast/block/section.js';
import tableToMdast from './toMdast/block/table.js';
import tocToMdast from './toMdast/block/toc.js';
import footnoteToMdast from './toMdast/phrasing/footnote.js';
import quoteMdast from './toMdast/phrasing/quote.js';
import { config } from './config.js';

interface Options {
	lint?: boolean;
}

export default class Markdown {
	/* unified Processor */
	readonly #remark: Processor;

	/**
	 * @param {object} options - Option
	 */
	constructor(options?: Options) {
		const lint = options?.lint ?? false;

		const processor = unified();

		if (lint) {
			processor.use(remarkLintNoTypes, ['break', 'definition', 'image', 'thematicBreak']); // 使用禁止要素
			processor.use(remarkLintNoMissingBlankLines); // ブロック間の空行必須
			processor.use(remarkLintNoConsecutiveBlankLines); // [markdown-style-guide] ブロック間の空行は1行のみ
			processor.use(remarkLintNoHeadingContentIndent); // [recommended] 見出し記号と内容の間のスペースは1つのみ
			processor.use(remarkLintFirstHeadingLevel, 1); // 最初の見出しは 1
			processor.use(remarkLintHeadingIncrement); // [markdown-style-guide] 見出しの数字飛ばし
			processor.use(remarkLintHeadingDepthLimit, <Remark.HeadingDepth>config.headingDepthLimit); // 見出しレベルの最大値
			processor.use(remarkLintHeadingStyle, 'atx'); // [markdown-style-guide] 見出し構文
			processor.use(remarkLintNoDuplicateHeadingsInSection); // セクション毎の見出し文字列重複
			processor.use(remarkLintNoEmptySections); // セクション内にコンテンツが存在すること
			processor.use(remarkLintListItemBulletIndent); // [recommended] リスト項目のインデント禁止
			processor.use(remarkLintListItemContentIndent); // [markdown-style-guide] リスト項目のインデント統一
			processor.use(remarkLintListItemIndent, 'space'); // [markdown-style-guide][recommended] リスト項目のビュレットと内容の間をスペースに統一
			processor.use(remarkLintUnorderedListMarkerStyle, '-'); // [markdown-style-guide] <ol> のマーカー表記
			processor.use(remarkLintOrderedListMarkerStyle, '.'); // [markdown-style-guide][recommended] <ol> のマーカー表記
			processor.use(remarkLintOrderedListMarkerValue, 'one'); // [markdown-style-guide] <ol> のマーカー表記
			processor.use(remarkLintNoInlinePadding); // [markdown-style-guide][recommended] リンク文字列にスペースを含めることを禁止（<em> など他のフレージングコンテンツには効果なし）
			processor.use(remarkLintNoLooseList); // Loose list 禁止
			processor.use(remarkLintBlockquoteIndentation, 2); // [markdown-style-guide] <blockquote> のインデント（ > と内容の間のスペース、なお > 自体の文字数を含む）
			processor.use(remarkLintNoBlockquoteWithoutMarker); // [markdown-style-guide][recommended] <blockquote> 内において > で始まらない行を禁止
			processor.use(remarkLintCodeBlockStyle, 'fenced'); // [markdown-style-guide] <pre><code> の言語
			processor.use(remarkLintFencedCodeFlag, {
				allowEmpty: true,
				flags: config.codeLanguages,
			}); // [markdown-style-guide] <pre><code> 構文
			processor.use(remarkLintFencedCodeMarker, '`'); // [markdown-style-guide] <pre><code> 構文
			processor.use(remarkLintNoTableIndentation); // [markdown-style-guide] <table> のインデント禁止
			processor.use(remarkLintTablePipes); // [markdown-style-guide] <table> の最初と末尾の | 必須
			processor.use(remarkLintTableCellPadding, 'padded'); // [markdown-style-guide] <th>, <td> の | と内容の間のスペース
			processor.use(remarkLintNoLinkTitle); // リンクの title 禁止
			processor.use(remarkLintNoShortcutReferenceLink); // [markdown-style-guide][recommended] 参照リンクでは末尾の [] が必須
			processor.use(remarkLintEmphasisMarker, '*'); // [markdown-style-guide] <em> 構文
			processor.use(remarkLintStrongMarker, '*'); // [markdown-style-guide] <strong> 構文
		}

		processor.use(remarkParse); // Markdown → mdast

		processor.use(headingToMdast, { maxDepth: <Remark.HeadingDepth>config.headingDepthLimit }); // toc 処理より前に実行する必要がある
		processor.use(tocToMdast); // section 処理より前に実行する必要がある
		processor.use(blockquoteToMdast);
		processor.use(boxToMdast);
		processor.use(defListToMdast);
		processor.use(embeddedToMdast);
		processor.use(emptyToMdast);
		processor.use(footnoteToMdast);
		processor.use(sectionToMdast, { maxDepth: <Remark.HeadingDepth>config.headingDepthLimit });
		processor.use(tableToMdast);
		processor.use(quoteMdast);

		processor.use(remarkRehype, {
			clobberPrefix: '',
			footnoteLabel: '脚注',
			footnoteLabelProperties: {},
			footnoteLabelTagName: 'h2',
			handlers: {
				code: codeToHast,
				defList: defListToHast,
				defListDescription: mdastDefListDescription2hast,
				defListTerm: mdastDefListTerm2hast,
				footnoteReference: footnoteReferenceToHast,
				heading: headingToHast,
				html: htmlToHast,
				link: linkToHast,
				list: listToHast,
				'x-blockquote': xBlockquoteToHast,
				'x-box': xBoxToHast,
				'x-embedded-media': xEmbeddedMediaToHast,
				'x-embedded-amazon': xEmbeddedAmazonToHast,
				'x-embedded-youtube': xEmbeddedYouTubeToHast,
				'x-empty': xEmptyToHast,
				'x-heading': xHeadingToHast,
				'x-section': xSectionToHast,
				'x-table': tableToHast,
				'x-toc': xTocToHast,
				'x-quote': xQuoteToHast,
			},
		}); // mdast → hast

		processor.use(footnoteHast);
		processor.use(rehypeHighlight, {
			prefix: 'hljs-',
		});

		processor.use(rehypeStringify, {
			entities: {
				useNamedReferences: true,
			},
			closeSelfClosing: true,
			tightSelfClosing: true,
		}); // hast → HTML

		processor.freeze();

		this.#remark = processor;
	}

	/**
	 * Processes Markdown strings
	 *
	 * @param {string} markdown - Markdown strings
	 *
	 * @returns {VFile} HTML
	 */
	async toHtml(markdown: string): Promise<VFile> {
		return this.#remark.process(markdown);
	}
}
