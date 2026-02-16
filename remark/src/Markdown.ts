import highlightCss from 'highlight.js/lib/languages/css';
import highlightDiff from 'highlight.js/lib/languages/diff';
import highlightHttp from 'highlight.js/lib/languages/http';
import highlightJavascript from 'highlight.js/lib/languages/javascript';
import highlightJson from 'highlight.js/lib/languages/json';
import highlightMarkdown from 'highlight.js/lib/languages/markdown';
import highlightTypescript from 'highlight.js/lib/languages/typescript';
import highlightXml from 'highlight.js/lib/languages/xml';
import { mdastDefListTerm2hast, mdastDefListDescription2hast } from 'mdast-util-definition-list';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';
import remarkParse from 'remark-parse';
import remarkLintBlockquoteIndentation from 'remark-lint-blockquote-indentation';
import remarkLintCodeBlockStyle from 'remark-lint-code-block-style';
import remarkLintDefinitionCase from 'remark-lint-definition-case';
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
import remarkLintNoDuplicateDefinitions from 'remark-lint-no-duplicate-definitions';
import remarkLintNoHeadingContentIndent from 'remark-lint-no-heading-content-indent';
import remarkLintNoMissingBlankLines from 'remark-lint-no-missing-blank-lines';
import remarkLintNoShortcutReferenceLink from 'remark-lint-no-shortcut-reference-link';
import remarkLintNoTableIndentation from 'remark-lint-no-table-indentation';
import remarkLintNoUndefinedReferences from 'remark-lint-no-undefined-references';
import remarkLintNoUnusedDefinitions from 'remark-lint-no-unused-definitions';
import remarkLintOrderedListMarkerStyle from 'remark-lint-ordered-list-marker-style';
import remarkLintOrderedListMarkerValue from 'remark-lint-ordered-list-marker-value';
import remarkLintStrongMarker from 'remark-lint-strong-marker';
import remarkLintTableCellPadding from 'remark-lint-table-cell-padding';
import remarkLintTablePipes from 'remark-lint-table-pipes';
import remarkLintUnorderedListMarkerStyle from 'remark-lint-unordered-list-marker-style';
import remarkRehype from 'remark-rehype';
import { type Processor, unified } from 'unified';
import type { VFile } from 'vfile';
import config from './config.ts';
import footnoteHast from './hast/footnote.ts';
import remarkLintHeadingDepthLimit from './lint/headingDepthLimit.ts';
import remarkLintNoEmptySections from './lint/noEmptySection.ts';
import remarkLintNoLinkTitle from './lint/noLinkTitle.ts';
import remarkLintNoLooseList from './lint/noLooseList.ts';
import remarkLintNoTypes from './lint/noTypes.ts';
import { xBlankToHast } from './toHast/block/blank.ts';
import { xBlockquoteToHast } from './toHast/block/blockquote.ts';
import { xBoxToHast } from './toHast/block/box.ts';
import { codeToHast } from './toHast/block/code.ts';
import { defListToHast } from './toHast/block/definitionList.ts';
import { xEmbeddedMediaToHast, xEmbeddedAmazonToHast, xEmbeddedYouTubeToHast } from './toHast/block/embedded.ts';
import { headingToHast, xHeadingToHast } from './toHast/block/heading.ts';
import { listToHast } from './toHast/block/list.ts';
import { xSectionToHast } from './toHast/block/section.ts';
import { tableToHast } from './toHast/block/table.ts';
import { xTocToHast } from './toHast/block/toc.ts';
import { footnoteReferenceToHast } from './toHast/phrasing/footnote.ts';
import { linkToHast } from './toHast/phrasing/link.ts';
import blankToMdast from './toMdast/block/blank.ts';
import blockquoteToMdast from './toMdast/block/blockquote.ts';
import boxToMdast from './toMdast/block/box.ts';
import defListToMdast from './toMdast/block/definitionList.ts';
import embeddedToMdast from './toMdast/block/embedded.ts';
import headingToMdast from './toMdast/block/heading.ts';
import sectionToMdast from './toMdast/block/section.ts';
import tableToMdast from './toMdast/block/table.ts';
import tocToMdast from './toMdast/block/toc.ts';
import footnoteToMdast from './toMdast/phrasing/footnote.ts';

interface Options {
	lint?: boolean;
}

export default class Markdown {
	/* unified Processor */
	readonly #remark: Processor;

	/**
	 * @param options - Option
	 */
	constructor(options?: Readonly<Options>) {
		const lint = options?.lint ?? false;

		const processor = unified();

		if (lint) {
			/* remark-lint: [style-guide][recommended] 設定コメントは使用しないので不要 */
			processor.use(remarkLintBlockquoteIndentation, 2); // [style-guide] <blockquote> のインデント（ > と内容の間のスペース、なお > 自体の文字数を含む）
			processor.use(remarkLintCodeBlockStyle, 'fenced'); // [style-guide] <pre><code> 構文
			processor.use(remarkLintDefinitionCase); // [style-guide] 定義ラベルの冒頭は小文字
			/* remark-lint-definition-spacing: [style-guide] definition は使用禁止設定にしているので不要 */
			processor.use(remarkLintEmphasisMarker, '*'); // [style-guide] <em> 構文
			processor.use(remarkLintFencedCodeFlag, {
				allowEmpty: true,
				flags: config.codeLanguages,
			}); // [style-guide] <pre><code> の言語
			processor.use(remarkLintFencedCodeMarker, '`'); // [style-guide] <pre><code> 構文
			/* remark-lint-file-extension: [style-guide] ファイルからの読み込みは使用していないので不要 */
			/* remark-lint-final-definition: [style-guide] 要検討 */
			/* remark-lint-final-newline: [recommended] 最終行の空白はむしろ JavaScript で除去しているので競合してしまう */
			processor.use(remarkLintFirstHeadingLevel, 1); // 最初の見出しは 1
			/* remark-lint-hard-break-spaces: [style-guide][recommended] break は使用禁止設定にしているので不要 */
			processor.use(remarkLintHeadingDepthLimit, config.headingDepthLimit); // 見出しレベルの最大値
			processor.use(remarkLintHeadingIncrement); // [style-guide] 見出しの数字飛ばし
			processor.use(remarkLintHeadingStyle, 'atx'); // [style-guide] 見出し構文
			/* remark-lint-link-title-style: [style-guide] リンクタイトルは使用禁止設定にしているので不要 */
			processor.use(remarkLintListItemBulletIndent); // [recommended] リスト項目のインデント禁止
			processor.use(remarkLintListItemContentIndent); // [style-guide] リスト項目のインデント統一
			processor.use(remarkLintListItemIndent, 'one'); // [style-guide][recommended] リスト項目のビュレットと内容の間をスペースに統一
			/* remark-lint-list-item-spacing: [style-guide] 要検討 */
			/* remark-lint-maximum-heading-length: [style-guide] 不要 */
			/* remark-lint-maximum-line-length: [style-guide] 不要 */
			processor.use(remarkLintNoBlockquoteWithoutMarker); // [style-guide][recommended] <blockquote> 内において > で始まらない行を禁止
			/* remark-lint-no-consecutive-blank-lines: [style-guide] <dl> での空行が誤検知されてしまう */
			processor.use(remarkLintNoDuplicateDefinitions); // [recommended] 参照先が重複していないこと
			/* remark-lint-no-duplicate-headings: [style-guide] 空見出しが引っ掛かってしまう */
			/* no-emphasis-as-heading: [style-guide] 不要 */
			processor.use(remarkLintNoEmptySections); // セクション内にコンテンツが存在すること
			/* remark-lint-no-file-name-articles: [style-guide] ファイルからの読み込みは使用していないので不要 */
			/* remark-lint-no-file-name-consecutive-dashes: [style-guide] ファイルからの読み込みは使用していないので不要 */
			/* remark-lint-no-file-name-irregular-characters: [style-guide] ファイルからの読み込みは使用していないので不要 */
			/* remark-lint-no-file-name-mixed-case: [style-guide] ファイルからの読み込みは使用していないので不要 */
			/* remark-lint-no-file-name-outer-dashes: [style-guide] ファイルからの読み込みは使用していないので不要 */
			processor.use(remarkLintNoHeadingContentIndent); // [recommended] 見出し記号と内容の間のスペースは1つのみ
			/* remark-lint-no-heading-punctuation: [style-guide] 不要 */
			/* remark-lint-no-literal-urls: [style-guide][recommended] 本文中であえてリンクにしない URL を記述することがあるので不要 */
			processor.use(remarkLintNoLinkTitle); // リンクの title 禁止
			processor.use(remarkLintNoLooseList); // Loose list 禁止
			processor.use(remarkLintNoMissingBlankLines, { exceptTightLists: true }); // ブロック間の空行必須
			/* remark-lint-no-multiple-toplevel-headings: [style-guide] # を見出しレベル2の扱いにしているので当然複数出現は許容する */
			/* remark-lint-no-shell-dollars: [style-guide] 不要 */
			/* remark-lint-no-shortcut-reference-image: [style-guide][recommended] image は使用禁止設定にしているので不要 */
			processor.use(remarkLintNoShortcutReferenceLink); // [style-guide][recommended] 参照リンクでは末尾の [] が必須
			processor.use(remarkLintNoTableIndentation); // [style-guide] <table> のインデント禁止
			processor.use(remarkLintNoTypes, ['break', 'definition', 'image', 'thematicBreak']); // 使用禁止要素
			processor.use(remarkLintNoUndefinedReferences); // [recommended] 参照先が存在すること
			processor.use(remarkLintNoUnusedDefinitions); // [recommended] 参照元が存在すること
			processor.use(remarkLintOrderedListMarkerStyle, '.'); // [style-guide][recommended] <ol> のマーカー表記
			processor.use(remarkLintOrderedListMarkerValue, 'one'); // [style-guide] <ol> のマーカー表記
			/* remark-lint-rule-style: [style-guide] thematicBreak は使用禁止設定にしているので不要 */
			processor.use(remarkLintStrongMarker, '*'); // [style-guide] <strong> 構文
			processor.use(remarkLintTableCellPadding, 'padded'); // [style-guide] <th>, <td> の | と内容の間のスペース
			/* remark-lint-table-pipe-alignment: [style-guide] 要検討 */
			processor.use(remarkLintTablePipes); // [style-guide] <table> の最初と末尾の | 必須
			processor.use(remarkLintUnorderedListMarkerStyle, '-'); // [style-guide] <ol> のマーカー表記
		}

		processor.use(remarkParse); // Markdown → mdast

		processor.use(headingToMdast, { maxDepth: config.headingDepthLimit }); // toc 処理より前に実行する必要がある
		processor.use(tocToMdast); // section 処理より前に実行する必要がある
		processor.use(blankToMdast);
		processor.use(blockquoteToMdast);
		processor.use(boxToMdast);
		processor.use(defListToMdast);
		processor.use(embeddedToMdast);
		processor.use(footnoteToMdast);
		processor.use(sectionToMdast, { maxDepth: config.headingDepthLimit });
		processor.use(tableToMdast);

		processor.use(remarkRehype, {
			allowDangerousHtml: true,
			clobberPrefix: '',
			handlers: {
				code: codeToHast,
				defList: defListToHast,
				defListDescription: mdastDefListDescription2hast,
				defListTerm: mdastDefListTerm2hast,
				footnoteReference: footnoteReferenceToHast,
				heading: headingToHast,
				link: linkToHast,
				list: listToHast,
				'x-blank': xBlankToHast,
				'x-blockquote': xBlockquoteToHast,
				'x-box': xBoxToHast,
				'x-embedded-media': xEmbeddedMediaToHast,
				'x-embedded-amazon': xEmbeddedAmazonToHast,
				'x-embedded-youtube': xEmbeddedYouTubeToHast,
				'x-heading': xHeadingToHast,
				'x-section': xSectionToHast,
				'x-table': tableToHast,
				'x-toc': xTocToHast,
			},
		}); // mdast → hast

		processor.use(footnoteHast);
		processor.use(rehypeHighlight, {
			languages: {
				css: highlightCss,
				diff: highlightDiff,
				http: highlightHttp,
				javascript: highlightJavascript,
				json: highlightJson,
				markdown: highlightMarkdown,
				typescript: highlightTypescript,
				xml: highlightXml,
			},
			prefix: 'hljs-',
		});

		processor.use(rehypeStringify, {
			allowDangerousHtml: true,
			characterReferences: {
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
	 * @param markdown - Markdown strings
	 *
	 * @returns HTML
	 */
	async toHtml(markdown: string): Promise<VFile> {
		return this.#remark.process(markdown);
	}
}
