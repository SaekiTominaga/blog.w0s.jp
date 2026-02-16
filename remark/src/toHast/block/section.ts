import type { ElementContent } from 'hast';
import type { Root } from 'mdast';
import type { State } from 'mdast-util-to-hast';

/**
 * <section>
 */

interface XSection extends Root {
	depth: number;
	id: string;
}

export const xSectionToHast = (state: State, node: XSection): ElementContent | ElementContent[] | undefined => {
	const element: ElementContent = {
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
