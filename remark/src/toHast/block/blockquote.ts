import type { Element, ElementContent, Properties } from 'hast';
import type { Blockquote } from 'mdast';
import type { State } from 'mdast-util-to-hast';
import { linkInfo } from '../../lib/hast.ts';
import { getInfo as getLinkInfo } from '../../lib/link.ts';
import config from '../../config.ts';

/**
 * <blockquote>
 */

interface XBlockquote extends Blockquote {
	lang?: string;
	metaText?: string;
	metaUrl?: string;
	metaIsbn?: string;
}

export const xBlockquoteToHast = (state: State, node: XBlockquote): ElementContent | ElementContent[] | undefined => {
	const { lang, metaText, metaUrl, metaIsbn } = node;

	const childElements: ElementContent[] = [];

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
						properties: {},
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

		// @ts-expect-error: ts(2345)
		const childElement = state.one(child, node);
		if (childElement !== undefined) {
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
	if (metaIsbn !== undefined) {
		blockquoteAttribute['cite'] = `urn:ISBN:${metaIsbn}`;
	}

	const figcaptionChild: ElementContent[] = [];
	if (metaText !== undefined) {
		if (metaUrl !== undefined) {
			/* URL とテキストが両方指定 */
			const { href, typeIcon, hostIcon, hostText } = getLinkInfo(metaText, metaUrl);

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
			figcaptionChild.push(...linkInfo(typeIcon, hostIcon ?? hostText));
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

	const figureChild: Element[] = [];
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
		properties: {},
		children: figureChild,
	};
};
