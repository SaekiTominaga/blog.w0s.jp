import type { ElementContent } from 'hast';
import type { FootnoteReference } from 'mdast';
import type { State } from 'mdast-util-to-hast';
import { normalizeUri } from 'micromark-util-sanitize-uri';

/**
 * Footnote
 *
 * @see https://github.com/syntax-tree/mdast-util-to-hast/blob/main/lib/handlers/footnote-reference.js
 */

export const footnoteReferenceToHast = (state: State, node: FootnoteReference): ElementContent | ElementContent[] | undefined => {
	const clobberPrefix = typeof state.options.clobberPrefix === 'string' ? state.options.clobberPrefix : 'user-content-';
	const id = node.identifier.toUpperCase();
	const safeId = normalizeUri(id.toLowerCase());
	const index = state.footnoteOrder.indexOf(id);

	let counter: number;

	let reuseCounter = state.footnoteCounts.get(id);
	if (reuseCounter === undefined) {
		reuseCounter = 0;
		state.footnoteOrder.push(id);
		counter = state.footnoteOrder.length;
	} else {
		counter = index + 1;
	}

	reuseCounter += 1;
	state.footnoteCounts.set(id, reuseCounter);

	return {
		type: 'element',
		tagName: 'span',
		properties: {
			className: ['c-footnote-ref'],
		},
		children: [
			{
				type: 'element',
				tagName: 'a',
				properties: {
					href: `#${clobberPrefix}fn-${safeId}`,
					id: `${clobberPrefix}fnref-${safeId}${reuseCounter > 1 ? `-${String(reuseCounter)}` : ''}`,
					className: ['js-footnote-reference-popover'],
					'data-popover-label': '脚注',
					'data-popover-class': 'p-footnote-popover',
					'data-popover-hide-text': '閉じる',
					'data-popover-hide-image-src': '/image/footnote-popover-close.svg',
					'data-popover-hide-image-width': '24',
					'data-popover-hide-image-height': '24',
				},
				children: [
					{
						type: 'text',
						value: `[${String(counter)}]`,
					},
				],
			},
		],
	};
};
