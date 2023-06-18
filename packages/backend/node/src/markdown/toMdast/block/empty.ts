import type { Paragraph } from 'mdast';
import type { Plugin } from 'unified';
import type { Node, Parent } from 'unist';
import { visit, CONTINUE } from 'unist-util-visit';

/**
 * Empty paragraph
 */

export const name = 'x-empty';

interface XEmpty extends Node {
	type: typeof name;
}

const toMdast = (): Plugin => {
	const EMPTY_SIGN = '␣';

	return (tree: Parent): void => {
		visit(tree, 'paragraph', (node: Paragraph, index: number | null, parent: Parent | null): boolean => {
			if (index === null || parent === null) {
				return CONTINUE;
			}

			const { children } = node;
			if (children.length === 1) {
				const child = children.at(0);
				if (child?.type === 'text' && child.value === EMPTY_SIGN) {
					const empty: XEmpty = {
						type: name,
					};

					parent.children.splice(index, 1, empty);
				}
			}

			return CONTINUE;
		});
	};
};
export default toMdast;
