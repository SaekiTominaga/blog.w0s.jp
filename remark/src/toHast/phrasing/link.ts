import type { ElementContent } from 'hast';
import type { Link } from 'mdast';
import type { State } from 'mdast-util-to-hast';
import { toString } from 'mdast-util-to-string';
import { linkInfo } from '../../lib/hast.ts';
import { getInfo } from '../../lib/link.ts';

/**
 * <a href>
 */

export const linkToHast = (state: State, node: Link): ElementContent | ElementContent[] | undefined => {
	const { href, typeIcon, hostIcon, hostText } = getInfo(toString(node), node.url);

	if (href === undefined) {
		return {
			type: 'element',
			tagName: 'a',
			properties: {},
			children: state.all(node),
		};
	}

	const link: ElementContent[] = [
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
