import type { Heading, Parent } from 'mdast';
import type { H } from 'mdast-util-to-hast';
import type { HastElement, HastElementContent } from 'mdast-util-to-hast/lib/state.js';
import { select } from 'unist-util-select';
import { name as nameXHeading } from '../../toMdast/block/heading.js';
import type { name } from '../../toMdast/block/toc.js';

/**
 * Table of contents
 */

interface XHeading extends Heading {
	id: string;
}

interface XToc extends Parent {
	type: typeof name;
	children: XHeading[];
}

export const xTocToHast = (state: H, node: XToc): HastElementContent | HastElementContent[] | null | undefined => {
	const { children } = node;
	if (children.length <= 1) {
		return undefined;
	}

	const element: HastElement = {
		type: 'element',
		tagName: 'ol',
		properties: {
			'aria-label': '目次',
			className: ['p-toc'],
		},
		children: children.map((childNode): HastElementContent => {
			const heading = select(nameXHeading, childNode);
			if (heading === null) {
				return {
					type: 'text',
					value: '',
				};
			}

			return {
				type: 'element',
				tagName: 'li',
				children: [
					{
						type: 'element',
						tagName: 'a',
						properties: {
							href: `#${encodeURIComponent(childNode.id)}`,
						},
						children: state.all({
							type: 'root',
							children: (<XHeading>heading).children,
						}),
					},
				],
			};
		}),
	};

	return element;
};
