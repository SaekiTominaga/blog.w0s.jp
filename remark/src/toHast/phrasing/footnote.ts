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
	const clobberPrefix = state.options.clobberPrefix ?? 'user-content-';
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
		tagName: 'footnote-reference',
		properties: {
			ignore: '.p-footnote__backref',
			'popover-label': '脚注',
			className: ['c-footnote-ref'],
		},
		children: [
			{
				type: 'element',
				tagName: 'a',
				properties: {
					href: `#${clobberPrefix}fn-${safeId}`,
					id: `${clobberPrefix}fnref-${safeId}${reuseCounter > 1 ? `-${String(reuseCounter)}` : ''}`,
					slot: 'anchor',
				},
				children: [
					{
						type: 'text',
						value: `[${String(counter)}]`,
					},
				],
			},
			{
				type: 'element',
				tagName: 'template',
				properties: {
					slot: 'popover__hide',
				},
				children: [],
				content: {
					type: 'root',
					children: [
						{
							type: 'element',
							tagName: 'img',
							properties: {
								src: '/image/footnote-popover-close.svg',
								alt: '閉じる',
								width: '12',
								height: '12',
							},
							children: [],
						},
					],
				},
			},
		],
	};
};
