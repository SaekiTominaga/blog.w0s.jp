import type { Properties } from 'hast';
import type { Blockquote } from 'mdast';
import type { H } from 'mdast-util-to-hast';
import type { HastElement, HastElementContent } from 'mdast-util-to-hast/lib/state.ts';
import HastUtil from '../../lib/HastUtil.ts';
import LinkUtil from '../../lib/Link.ts';
import configRemark from '../../config.ts';

/**
 * <blockquote>
 */

interface XBlockquote extends Blockquote {
	lang?: string;
	metaText?: string;
	metaUrl?: string;
	metaIsbn?: string;
}

export const xBlockquoteToHast = (state: H, node: XBlockquote): HastElementContent | HastElementContent[] | null | undefined => {
	const { lang, metaText, metaUrl, metaIsbn } = node;

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
					if (lang !== undefined && lang !== configRemark.lang) {
						omitAttribute['lang'] = configRemark.lang;
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
	if (lang !== undefined && lang !== configRemark.lang) {
		blockquoteAttribute['lang'] = lang;
	}
	if (metaIsbn !== undefined) {
		blockquoteAttribute['cite'] = `urn:ISBN:${metaIsbn}`;
	}

	const figcaptionChild: HastElementContent[] = [];
	if (metaText !== undefined) {
		if (metaUrl !== undefined) {
			/* URL とテキストが両方指定 */
			const { href, typeIcon, hostIcon, hostText } = LinkUtil.getInfo(metaText, metaUrl);

			figcaptionChild.push({
				type: 'element',
				tagName: 'a',
				properties: {
					href: href,
				},
				children: [
					{
						type: 'text',
						value: metaText,
					},
				],
			});
			figcaptionChild.push(...HastUtil.linkInfo(typeIcon, hostIcon ?? hostText));
		} else {
			/* テキストのみ指定 */
			figcaptionChild.push({
				type: 'text',
				value: metaText,
			});
		}
	} else if (metaUrl !== undefined) {
		/* URL のみ指定 */
		figcaptionChild.push({
			type: 'element',
			tagName: 'a',
			properties: {
				href: metaUrl,
			},
			children: [
				{
					type: 'text',
					value: metaUrl,
				},
			],
		});
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
