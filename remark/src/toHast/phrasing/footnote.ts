import type { ElementContent } from 'hast';
import type { FootnoteReference } from 'mdast';
import type { State } from 'mdast-util-to-hast';
import { normalizeUri } from 'micromark-util-sanitize-uri';

/**
 * Footnote
 */

export const footnoteReferenceToHast = (state: State, node: FootnoteReference): ElementContent | ElementContent[] | undefined => {
	const id = node.identifier.toUpperCase();
	const safeId = normalizeUri(id.toLowerCase());
	const index = state.footnoteOrder.indexOf(id);

	let counter: number;
	if (index === -1) {
		state.footnoteOrder.push(id);
		state.footnoteCounts.set('id', 1);
		counter = state.footnoteOrder.length;
	} else {
		state.footnoteCounts.set('id', (state.footnoteCounts.get('id') ?? 0) + 1);
		counter = index + 1;
	}

	const reuseCounter = state.footnoteCounts.get('id') ?? 0;

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
					href: `#${state.options.clobberPrefix ?? ''}fn-${safeId}`,
					id: `${state.options.clobberPrefix ?? ''}fnref-${safeId}${reuseCounter > 1 ? `-${String(reuseCounter)}` : ''}`,
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
