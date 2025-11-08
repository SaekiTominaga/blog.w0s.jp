import type { Heading } from 'mdast';
import type { H } from 'mdast-util-to-hast';
import type { HastElementContent } from 'mdast-util-to-hast/lib/state.ts';
import HastUtil from '../../lib/HastUtil.ts';

/**
 * <hn>
 */

interface XHeading extends Heading {
	id?: string;
}

export const headingToHast = (state: H, node: Heading): HastElementContent | HastElementContent[] | null | undefined => {
	const { depth } = node;

	const heading = HastUtil.hn(depth, state.all(node));

	return heading;
};

export const xHeadingToHast = (state: H, node: XHeading): HastElementContent | HastElementContent[] | null | undefined => {
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

	const heading = HastUtil.hn(depth, state.all(node));

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
