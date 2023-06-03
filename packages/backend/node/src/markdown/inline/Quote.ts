import type { PhrasingContent, Parent as ParentNode } from 'mdast';
import type { H } from 'mdast-util-to-hast';
import type { HastElementContent } from 'mdast-util-to-hast/lib/state.js';
import type { Plugin } from 'unified';
import type { Literal, Node, Parent } from 'unist';
import { visit } from 'unist-util-visit';
import Quote, { type Meta } from '../lib/Quote.js';

export const name = 'quote';

interface QuoteNode extends ParentNode {
	type: typeof name;
	meta: Meta;
	children: PhrasingContent[];
}

/**
 * <q>
 */
export default class {
	static toMdast(): Plugin {
		const QUOTE_OPEN = '{{';
		const QUOTE_CLOSE = '}}';

		const META_OPEN = '(';
		const META_CLOSE = ')';

		return (tree: Node): void => {
			visit(tree, 'text', (node: Literal, index: number | null, parent: Parent | null): void => {
				if (index === null || parent === null) {
					return;
				}

				const value = node.value as string;

				const quoteOpenIndex = value.indexOf(QUOTE_OPEN);
				if (quoteOpenIndex === -1) {
					return;
				}
				const quoteCloseIndex = value.indexOf(QUOTE_CLOSE, quoteOpenIndex + QUOTE_OPEN.length);
				if (quoteCloseIndex === -1 || quoteCloseIndex <= quoteOpenIndex) {
					return;
				}

				const beforeQuoteValue = value.substring(0, quoteOpenIndex);
				const quoteValue = value.substring(quoteOpenIndex + QUOTE_OPEN.length, quoteCloseIndex);
				const afterQuoteValue = value.substring(quoteCloseIndex + QUOTE_CLOSE.length);

				/* 引用のメタ情報を取得 */
				const meta: Meta = {};

				const metaOpenIndex = afterQuoteValue.indexOf(META_OPEN);
				const metaCloseIndex = afterQuoteValue.indexOf(META_CLOSE, META_OPEN.length);
				if (metaOpenIndex === 0 && metaCloseIndex > metaOpenIndex) {
					const metaValue = afterQuoteValue.substring(metaOpenIndex + META_OPEN.length, metaCloseIndex);
					metaValue.split(' ').forEach((fragment) => {
						Object.assign(meta, Quote.classifyMeta(fragment));
					});
				}

				const beforeQuoteNode: Literal = {
					type: 'text',
					value: beforeQuoteValue,
				};

				let quoteNode: PhrasingContent | QuoteNode;
				if (meta.url !== undefined) {
					quoteNode = {
						type: 'link',
						url: meta.url,
						children: [
							{
								// @ts-expect-error: ts(2322)
								type: name,
								// @ts-expect-error: ts(2322)
								meta: meta,
								children: [
									{
										type: 'text',
										value: quoteValue,
									},
								],
							},
						],
					};
				} else {
					quoteNode = {
						type: name,
						meta: meta,
						children: [
							{
								type: 'text',
								value: quoteValue,
							},
						],
					};
				}

				const afterQuoteNode: Literal = {
					type: 'text',
					value: Object.entries(meta).length === 0 ? afterQuoteValue : afterQuoteValue.substring(metaCloseIndex + META_CLOSE.length),
				};

				parent.children.splice(index, 1, beforeQuoteNode, quoteNode, afterQuoteNode);
			});
		};
	}

	static toHast(state: H, node: QuoteNode): HastElementContent | HastElementContent[] {
		const { meta } = node;

		const attributes: { lang?: string; cite?: string } = {};
		if (meta.lang !== undefined) {
			attributes.lang = meta.lang;
		}
		if (meta.url !== undefined) {
			attributes.cite = meta.url;
		} else if (meta.isbn !== undefined && meta.isbn.valid) {
			attributes.cite = `urn:ISBN:${meta.isbn.value}`;
		}

		return {
			type: 'element',
			tagName: 'q',
			properties: attributes,
			children: state.all({ type: 'root', children: node.children }),
		};
	}
}
