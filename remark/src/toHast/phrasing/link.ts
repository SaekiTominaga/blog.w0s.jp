import type { Link } from 'mdast';
import type { H } from 'mdast-util-to-hast';
import type { HastElementContent } from 'mdast-util-to-hast/lib/state.ts';
import { toString } from 'mdast-util-to-string';
import { linkInfo } from '../../lib/hast.ts';
import { getInfo } from '../../lib/link.ts';

/**
 * <a href>
 */

export const linkToHast = (state: H, node: Link): HastElementContent | HastElementContent[] | null | undefined => {
	const { href, typeIcon, hostIcon, hostText } = getInfo(toString(node), node.url);

	if (href === undefined) {
		return {
			type: 'element',
			tagName: 'a',
			children: state.all(node),
		};
	}

	const link: HastElementContent[] = [
		{
			type: 'element',
			tagName: 'a',
			properties: { href: href },
			children: state.all(node),
		},
	];
	link.push(...linkInfo(typeIcon, hostIcon ?? hostText));

	return link;
};
