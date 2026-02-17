import type { ElementContent } from 'hast';
import { type DefListNode } from 'mdast-util-definition-list';
import { type State } from 'mdast-util-to-hast';

/**
 * <dl>
 */

export const defListToHast = (state: State, node: DefListNode): ElementContent | ElementContent[] | undefined => {
	return {
		type: 'element',
		tagName: 'dl',
		properties: {
			className: ['p-list-description'],
		},
		children: state.all(node),
	};
};
