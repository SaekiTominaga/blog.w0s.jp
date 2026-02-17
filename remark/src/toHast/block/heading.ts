import type { ElementContent } from 'hast';
import type { Heading } from 'mdast';
import type { State } from 'mdast-util-to-hast';
import { hn } from '../../lib/hast.ts';

/**
 * <hn>
 */

interface XHeading extends Heading {
	id?: string;
}

export const headingToHast = (state: State, node: Heading): ElementContent | ElementContent[] | undefined => {
	const { depth } = node;

	const heading = hn(depth, state.all(node));

	return heading;
};

export const xHeadingToHast = (state: State, node: XHeading): ElementContent | ElementContent[] | undefined => {
	const { depth, id } = node;

	if (id === undefined) {
		return {
			type: 'element',
			tagName: 'hr',
			properties: {
				className: ['p-section-break'],
			},
			children: [],
		};
	}

	const heading = hn(depth, state.all(node));

	return {
		type: 'element',
		tagName: 'div',
		properties: {
			className: ['p-entry-section__hdg'],
		},
		children: [
			heading,
			{
				type: 'element',
				tagName: 'p',
				properties: {
					className: ['p-entry-section__self-link'],
				},
				children: [
					{
						type: 'element',
						tagName: 'a',
						properties: {
							href: `#${encodeURIComponent(id)}`,
							className: ['c-self-link'],
						},
						children: [
							{
								type: 'text',
								value: '§',
							},
						],
					},
				],
			},
		],
	};
};
