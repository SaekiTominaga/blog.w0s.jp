import type { ElementContent, Properties } from 'hast';
import type { List } from 'mdast';
import type { State } from 'mdast-util-to-hast';

/**
 * <ol>, <ul>
 */

export const listToHast = (state: State, node: List): ElementContent | ElementContent[] | undefined => {
	const listItems = node.children;

	/* Ordered list */
	if (node.ordered) {
		const attributes: Properties = {
			className: ['p-list-num'],
			'data-digit': listItems.length.toString().length,
		};
		if (node.start !== null && node.start !== undefined && node.start !== 1) {
			attributes['start'] = node.start;
		}

		return {
			type: 'element',
			tagName: 'ol',
			properties: attributes,
			children: state.all(node),
		};
	}

	/* Unordered list */
	return {
		type: 'element',
		tagName: 'ul',
		properties: {
			className: ['p-list'],
		},
		children: state.all(node),
	};
};
