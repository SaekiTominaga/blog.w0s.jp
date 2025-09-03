import type { Literal, PhrasingContent } from 'mdast';
import type { Plugin } from 'unified';
import type { Parent } from 'unist';
import { visit, CONTINUE } from 'unist-util-visit';
import Quote, { type Meta } from '../../lib/Quote.ts';

/**
 * <q>
 */

const name = 'x-quote';

interface XQuote extends Parent {
	type: typeof name;
	quotemeta: Meta;
	children: PhrasingContent[];
}

const toMdast = (): Plugin => {
	const QUOTE_OPEN = '{';
	const QUOTE_CLOSE = '}';

	const META_OPEN = '(';
	const META_CLOSE = ')';

	return (tree: Parent): void => {
		visit(tree, 'text', (node: Literal, index: number | null, parent: Parent | null): boolean => {
			if (index === null || parent === null) {
				return CONTINUE;
			}

			const { value } = node;

			const quoteOpenIndex = value.indexOf(QUOTE_OPEN);
			if (quoteOpenIndex === -1) {
				return CONTINUE;
			}
			const quoteCloseIndex = value.indexOf(QUOTE_CLOSE, quoteOpenIndex + QUOTE_OPEN.length);
			if (quoteCloseIndex === -1 || quoteCloseIndex <= quoteOpenIndex) {
				return CONTINUE;
			}

			const beforeQuoteValue = value.substring(0, quoteOpenIndex);
			const quoteValue = value.substring(quoteOpenIndex + QUOTE_OPEN.length, quoteCloseIndex);
			const afterQuoteValue = value.substring(quoteCloseIndex + QUOTE_CLOSE.length);

			if (quoteValue === '') {
				return CONTINUE;
			}

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

			let quoteNode: PhrasingContent | XQuote;
			if (meta.url !== undefined) {
				quoteNode = {
					type: 'link',
					url: meta.url,
					children: [
						{
							// @ts-expect-error: ts(2322)
							type: name,
							quotemeta: meta,
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
					quotemeta: meta,
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

			return CONTINUE;
		});
	};
};
export default toMdast;
