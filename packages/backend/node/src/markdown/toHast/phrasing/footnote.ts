import type { FootnoteReference } from 'mdast';
import type { H } from 'mdast-util-to-hast';
import type { HastElementContent } from 'mdast-util-to-hast/lib/state.js';
import { normalizeUri } from 'micromark-util-sanitize-uri';

/**
 * Footnote
 */

export const footnoteReferenceToHast = (state: H, node: FootnoteReference): HastElementContent | HastElementContent[] | null | undefined => {
	const id = node.identifier.toUpperCase();
	const safeId = normalizeUri(id.toLowerCase());
	const index = state.footnoteOrder.indexOf(id);

	let counter: number;
	if (index === -1) {
		state.footnoteOrder.push(id);
		state.footnoteCounts[id] = 1;
		counter = state.footnoteOrder.length;
	} else {
		state.footnoteCounts[id] += 1;
		counter = index + 1;
	}

	const reuseCounter = state.footnoteCounts[id] ?? 0;

	return {
		type: 'element',
		tagName: 'span',
		properties: {
			className: ['c-annotate'],
		},
		children: [
			{
				type: 'element',
				tagName: 'a',
				properties: {
					href: `#${state.clobberPrefix}fn-${safeId}`,
					id: `${state.clobberPrefix}ref-${safeId}${reuseCounter > 1 ? `-${reuseCounter}` : ''}`,
					is: 'w0s-tooltip-trigger',
					'data-tooltip-label': '脚注',
					'data-tooltip-class': 'p-tooltip',
					'data-tooltip-close-text': '閉じる',
					'data-tooltip-close-image-src': '/image/tooltip-close.svg',
				},
				children: [
					{
						type: 'text',
						value: `[${counter}]`,
					},
				],
			},
		],
	};
};
