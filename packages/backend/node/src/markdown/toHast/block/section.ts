import type { Parent } from 'mdast';
import type { H } from 'mdast-util-to-hast';
import type { HastElementContent } from 'mdast-util-to-hast/lib/state.js';
import type { name } from '../../toMdast/block/section.js';

/**
 * <section>
 */

interface XSection extends Parent {
	type: typeof name;
	depth: number;
	id: string;
}

export const xSectionToHast = (state: H, node: XSection): HastElementContent | HastElementContent[] | null | undefined => {
	const element: HastElementContent = {
		type: 'element',
		tagName: 'section',
		properties: {
			className: ['p-entry-section', `-hdg${node.depth}`],
			id: node.id,
		},
		children: state.all({
			type: 'root',
			children: node.children,
		}),
	};

	return element;
};
