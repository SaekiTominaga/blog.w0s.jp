import type { ElementContent } from 'hast';
import type { Heading } from 'mdast';
import type { State } from 'mdast-util-to-hast';

/**
 * <hn>
 */

interface XHeading extends Heading {
	id?: string;
}

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

	return {
		type: 'element',
		tagName: 'div',
		properties: {
			className: ['p-entry-section__hdg'],
		},
		children: [
			{
				type: 'element',
				tagName: `h${String(depth)}`,
				properties: {},
				children: state.all(node),
			},
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
