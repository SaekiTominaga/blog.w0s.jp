import { gfmFootnoteFromMarkdown } from 'mdast-util-gfm-footnote';
import type { FromMarkdownExtension } from 'mdast-util-gfm-footnote/lib/index.ts';
import { gfmFootnote } from 'micromark-extension-gfm-footnote';
import type { Extension } from 'micromark-util-types';

/**
 * Footnote
 */

export default function toMdast(): void {
	// @ts-expect-error: ts(2683)
	const data = this.data();

	const add = (field: string, value: Extension | FromMarkdownExtension): void => {
		const list: unknown[] = data[field] !== undefined ? data[field] : (data[field] = []);

		list.push(value);
	};

	add('micromarkExtensions', gfmFootnote());
	add('fromMarkdownExtensions', gfmFootnoteFromMarkdown());
}
