import type { ElementContent } from 'hast';
import type { Link } from 'mdast';
import type { State } from 'mdast-util-to-hast';
import { getLinkElements } from '../../lib/link.ts';

/**
 * <a href>
 */

export const linkToHast = (state: State, node: Link): ElementContent | ElementContent[] | undefined => {
	return getLinkElements(state.all(node), node.url);
};
