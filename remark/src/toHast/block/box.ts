import type { ElementContent } from 'hast';
import type { BlockContent, Root } from 'mdast';
import type { State } from 'mdast-util-to-hast';

/**
 * Box
 */

interface XBox extends Root {
	name: string;
	children: BlockContent[];
}

export const xBoxToHast = (state: State, node: XBox): ElementContent | ElementContent[] | undefined => {
	return {
		type: 'element',
		tagName: 'div',
		properties: {
			className: ['p-box', `-${node.name}`],
		},
		children: state.all(node),
	};
};
