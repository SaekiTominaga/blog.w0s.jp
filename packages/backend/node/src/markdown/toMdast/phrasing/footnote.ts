import { gfmFootnoteFromMarkdown } from 'mdast-util-gfm-footnote';
import type { FromMarkdownExtension } from 'mdast-util-gfm-footnote/lib/index.js';
import { gfmFootnote } from 'micromark-extension-gfm-footnote';
import type { Extension } from 'micromark-util-types';

/**
 * Footnote
 */

export default function toMdast(): void {
	// @ts-expect-error: ts(2683)
	const data = this.data();

	const add = (field: string, value: Extension | FromMarkdownExtension): void => {
		const list = data[field] ? data[field] : (data[field] = []);

		list.push(value);
	};

	add('micromarkExtensions', gfmFootnote());
	add('fromMarkdownExtensions', gfmFootnoteFromMarkdown());
}
