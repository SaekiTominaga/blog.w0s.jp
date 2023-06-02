import type { Link as LinkNode } from 'mdast';
import type { H } from 'mdast-util-to-hast';
import { toString } from 'mdast-util-to-string';
import type { HastElementContent } from 'mdast-util-to-hast/lib/state.js';
import Link from '../lib/Link.js';

/**
 * <a href>
 */
export default class {
	static toHast(state: H, node: LinkNode): HastElementContent | HastElementContent[] {
		const { href, typeIcon, hostIcon, hostText } = Link.getInfo(toString(node), node.url);

		if (href === undefined) {
			return {
				type: 'element',
				tagName: 'a',
				children: state.all(node),
			};
		}

		const hasts: HastElementContent[] = [
			{
				type: 'element',
				tagName: 'a',
				properties: { href: href },
				children: state.all(node),
			},
		];
		if (typeIcon !== undefined) {
			hasts.push({
				type: 'element',
				tagName: 'img',
				properties: {
					src: `/image/icon/${typeIcon.fileName}`,
					alt: `(${typeIcon.altText})`,
					width: '16',
					height: '16',
					className: 'c-link-icon',
				},
				children: [],
			});
		}
		if (hostIcon !== undefined) {
			hasts.push({
				type: 'element',
				tagName: 'img',
				properties: {
					src: `/image/icon/${hostIcon.fileName}`,
					alt: `(${hostIcon.altText})`,
					width: '16',
					height: '16',
					className: 'c-link-icon',
				},
				children: [],
			});
		} else if (hostText !== undefined) {
			hasts.push({
				type: 'element',
				tagName: 'b',
				properties: {
					className: 'c-domain',
				},
				children: [
					{
						type: 'text',
						value: `(${hostText})`,
					},
				],
			});
		}

		return hasts;
	}
}
