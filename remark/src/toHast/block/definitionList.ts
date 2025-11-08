import { type DefListNode } from 'mdast-util-definition-list';
import { all, type H } from 'mdast-util-to-hast';
import type { HastElementContent } from 'mdast-util-to-hast/lib/state.ts';

/**
 * <dl>
 */

export const defListToHast = (state: H, node: DefListNode): HastElementContent | HastElementContent[] | null | undefined => {
	return state(
		node,
		'dl',
		{
			className: ['p-list-description'],
		},
		all(state, node),
	);
};
