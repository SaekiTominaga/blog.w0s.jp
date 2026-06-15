import type { ElementContent } from 'hast';
import type { Root } from 'mdast';
import type { State } from 'mdast-util-to-hast';

/**
 * Link
 */

export const linkToHast = (state: State, node: Root): ElementContent | ElementContent[] | undefined => {
	return {
		type: 'element',
		tagName: 'div',
		properties: {
			className: ['p-link'],
		},
		children: node.children.map((child): ElementContent => {
			const content = state.one(child, node);
			if (content === undefined) {
				return {
					type: 'text',
					value: '',
				};
			}

			return {
				type: 'element',
				tagName: 'p',
				properties: {},
				children: Array.isArray(content) ? content : [content],
			};
		}),
	};
};
