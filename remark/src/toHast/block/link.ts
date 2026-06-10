import type { ElementContent } from 'hast';
import type { Root } from 'mdast';
import type { State } from 'mdast-util-to-hast';

/**
 * Link
 */

export const linkToHast = (state: State, node: Root): ElementContent | ElementContent[] | undefined => {
	return {
		type: 'element',
		tagName: 'p',
		properties: {
			className: ['p-link'],
		},
		children: state.all(node),
	};
};
