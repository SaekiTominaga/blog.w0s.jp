import type { Code as CodeNode } from 'mdast';
import type { H } from 'mdast-util-to-hast';
import type { HastElementContent } from 'mdast-util-to-hast/lib/state.js';
import StringEscapeHtml from '@saekitominaga/string-escape-html';

/**
 * <code>
 */
export default class {
	static toHast(_state: H, node: CodeNode): HastElementContent | HastElementContent[] {
		const text = {
			type: 'text',
			value: StringEscapeHtml.unescape(node.value),
		};

		return {
			// @ts-expect-error: ts(2322)
			type: 'element',
			tagName: 'code',
			children: [text],
		};
	}
}
