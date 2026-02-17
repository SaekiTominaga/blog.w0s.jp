import type { Paragraph, Root } from 'mdast';
import type { Plugin } from 'unified';
import type { Node, Parent } from 'unist';
import { visit, CONTINUE } from 'unist-util-visit';

/**
 * Blank paragraph
 */

const name = 'x-blank';

interface XBlank extends Node {
	type: typeof name;
}

const toMdast: Plugin<[], Root> = () => {
	const BLANK_SIGN = '␣';

	return (tree: Parent): void => {
		visit(tree, 'paragraph', (node: Paragraph, index: number | null, parent: Parent | null): boolean => {
			if (index === null || parent === null) {
				return CONTINUE;
			}

			const { children } = node;
			if (children.length === 1) {
				const child = children.at(0);
				if (child?.type === 'text' && child.value === BLANK_SIGN) {
					const blank: XBlank = {
						type: name,
					};

					parent.children.splice(index, 1, blank);
				}
			}

			return CONTINUE;
		});
	};
};
export default toMdast;
