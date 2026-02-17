import type { Element, ElementContent } from 'hast';
import type { Heading, Root } from 'mdast';
import type { State } from 'mdast-util-to-hast';
import { select } from 'unist-util-select';
import { name as nameXHeading } from '../../toMdast/block/heading.ts';

/**
 * Table of contents
 */

interface XHeading extends Heading {
	id: string;
}

interface XToc extends Root {
	children: XHeading[];
}

export const xTocToHast = (state: State, node: XToc): ElementContent | ElementContent[] | undefined => {
	const { children } = node;
	if (children.length <= 1) {
		return undefined;
	}

	const element: Element = {
		type: 'element',
		tagName: 'nav',
		properties: {
			'aria-label': '目次',
			className: ['p-toc'],
		},
		children: [
			{
				type: 'element',
				tagName: 'ol',
				properties: {},
				children: children.map((childNode): ElementContent => {
					const heading = select(nameXHeading, childNode);
					if (heading === undefined) {
						return {
							type: 'text',
							value: '',
						};
					}

					return {
						type: 'element',
						tagName: 'li',
						properties: {},
						children: [
							{
								type: 'element',
								tagName: 'a',
								properties: {
									href: `#${encodeURIComponent(childNode.id)}`,
								},
								children: state.all(heading as XHeading),
							},
						],
					};
				}),
			},
		],
	};

	return element;
};
