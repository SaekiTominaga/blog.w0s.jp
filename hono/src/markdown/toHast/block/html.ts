import type { HTML } from 'mdast';
import type { H } from 'mdast-util-to-hast';
import type { HastElementContent } from 'mdast-util-to-hast/lib/state.js';

/**
 * HTML
 */

export const htmlToHast = (_state: H, node: HTML): HastElementContent | HastElementContent[] | null | undefined => {
	return {
		type: 'text',
		value: node.value,
	};
};
