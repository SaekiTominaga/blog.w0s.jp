import type { Properties } from 'hast';
import type { Blockquote } from 'mdast';
import type { H } from 'mdast-util-to-hast';
import type { HastElement, HastElementContent } from 'mdast-util-to-hast/lib/state.js';
import HastUtil from '../../lib/HastUtil.js';
import LinkUtil from '../../lib/Link.js';
import { config } from '../../config.js';

/**
 * <blockquote>
 */

interface XBlockquote extends Blockquote {
	lang?: string;
	citetext?: string;
	citeurl?: string;
	citeisbn?: string;
}

export const xBlockquoteToHast = (state: H, node: XBlockquote): HastElementContent | HastElementContent[] | null | undefined => {
	const { lang, citetext, citeurl, citeisbn } = node;

	const childElements: HastElementContent[] = [];

	node.children.forEach((child) => {
		if (child.type === 'paragraph') {
			const paragraphChildren = child.children;
			if (paragraphChildren.length === 1) {
				const paragraphChild = paragraphChildren.at(0);
				if (paragraphChild?.type === 'text' && paragraphChild.value === '~') {
					/* <blockquote> の中の行が '~' の場合は中略 */
					const omitAttribute: Properties = {
						className: ['p-quote__omit'],
					};
					if (lang !== undefined && lang !== config.lang) {
						omitAttribute['lang'] = config.lang;
					}

					childElements.push({
						type: 'element',
						tagName: 'p',
						children: [
							{
								type: 'element',
								tagName: 'b',
								properties: omitAttribute,
								children: [
									{
										type: 'text',
										value: '(中略)',
									},
								],
							},
						],
					});
					return;
				}
			}
		}

		const childElement = state.one(child, node);
		if (childElement !== null && childElement !== undefined) {
			if (Array.isArray(childElement)) {
				childElement.forEach((element) => childElements.push(element));
			} else {
				childElements.push(childElement);
			}
		}
	});

	const blockquoteAttribute: Properties = {
		className: ['p-quote'],
	};
	if (lang !== undefined && lang !== config.lang) {
		blockquoteAttribute['lang'] = lang;
	}
	if (citeurl !== undefined) {
		blockquoteAttribute['cite'] = citeurl;
	} else if (citeisbn !== undefined) {
		// URL と ISBN が両方指定されていた場合、ISBN は無視される
		blockquoteAttribute['cite'] = `urn:ISBN:${citeisbn}`;
	}

	const figcaptionChild: HastElementContent[] = [];
	if (citetext !== undefined) {
		if (citeurl !== undefined) {
			const { href, typeIcon, hostIcon, hostText } = LinkUtil.getInfo(citetext, citeurl);

			figcaptionChild.push({
				type: 'element',
				tagName: 'a',
				properties: {
					href: href,
				},
				children: [
					{
						type: 'text',
						value: citetext,
					},
				],
			});
			figcaptionChild.push(...HastUtil.linkInfo(typeIcon, hostIcon ?? hostText));
		} else {
			figcaptionChild.push({
				type: 'text',
				value: citetext,
			});
		}
	}

	const figureChild: HastElement[] = [];
	figureChild.push({
		type: 'element',
		tagName: 'blockquote',
		properties: blockquoteAttribute,
		children: childElements,
	});
	if (figcaptionChild.length >= 1) {
		figureChild.push({
			type: 'element',
			tagName: 'figcaption',
			properties: {
				className: ['c-caption', '-meta'],
			},
			children: [
				{
					type: 'element',
					tagName: 'span',
					properties: {
						class: 'c-caption__text',
					},
					children: figcaptionChild,
				},
			],
		});
	}

	return {
		type: 'element',
		tagName: 'figure',
		children: figureChild,
	};
};
