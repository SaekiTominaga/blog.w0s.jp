import type { Root } from 'mdast';
import type { H } from 'mdast-util-to-hast';
import type { HastElementContent } from 'mdast-util-to-hast/lib/state.js';

/**
 * <section>
 */

interface XSection extends Root {
	depth: number;
	id: string;
}

export const xSectionToHast = (state: H, node: XSection): HastElementContent | HastElementContent[] | null | undefined => {
	const element: HastElementContent = {
		type: 'element',
		tagName: 'section',
		properties: {
			className: ['p-entry-section', `-hdg${String(node.depth)}`],
			id: node.id,
		},
		children: state.all(node),
	};

	return element;
};
