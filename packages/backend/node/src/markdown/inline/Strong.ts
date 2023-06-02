import type { Code as StrongNode } from 'mdast';
import type { H } from 'mdast-util-to-hast';
import type { HastElementContent } from 'mdast-util-to-hast/lib/state.js';

/**
 * <strong> → <em>
 */
export default class {
	static toHast(state: H, node: StrongNode): HastElementContent | HastElementContent[] {
		return {
			type: 'element',
			tagName: 'em',
			children: state.all(node),
		};
	}
}
