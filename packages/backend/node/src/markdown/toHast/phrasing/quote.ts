import type { PhrasingContent, Root } from 'mdast';
import type { H } from 'mdast-util-to-hast';
import type { HastElementContent } from 'mdast-util-to-hast/lib/state.js';
import { type Meta } from '../../lib/Quote.js';

interface XQuote extends Root {
	quotemeta: Meta;
	children: PhrasingContent[];
}

/**
 * <q>
 */

export const xQuoteToHast = (state: H, node: XQuote): HastElementContent | HastElementContent[] | null | undefined => {
	const { quotemeta: meta } = node;

	const attributes: { lang?: string; cite?: string } = {};
	if (meta.lang !== undefined) {
		attributes.lang = meta.lang;
	}
	if (meta.url !== undefined) {
		attributes.cite = meta.url;
	} else if (meta.isbn?.valid) {
		attributes.cite = `urn:ISBN:${meta.isbn.value}`;
	}

	return {
		type: 'element',
		tagName: 'q',
		properties: attributes,
		children: state.all(node),
	};
};
