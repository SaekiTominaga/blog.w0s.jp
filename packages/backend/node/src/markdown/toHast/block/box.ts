import type { BlockContent, Root } from 'mdast';
import type { H } from 'mdast-util-to-hast';
import type { HastElementContent } from 'mdast-util-to-hast/lib/state.js';

/**
 * Box
 */

interface XBox extends Root {
	name: string;
	children: BlockContent[];
}

export const xBoxToHast = (state: H, node: XBox): HastElementContent | HastElementContent[] | null | undefined => {
	return {
		type: 'element',
		tagName: 'div',
		properties: {
			className: ['p-box', `-${node.name}`],
		},
		children: state.all(node),
	};
};
