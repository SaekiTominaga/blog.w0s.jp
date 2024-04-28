import type { Node, Parent } from 'unist';
import { convert, type Test } from 'unist-util-is';

export default class UnistUtil {
	/**
	 * Searches for a node at or after the specified position.
	 * This is similar to `unist-util-find-after`<https://github.com/syntax-tree/unist-util-find-after>, except that the position specified by index itself is also searched.
	 *
	 * @param parent - Parent node
	 * @param index - Index of child in parent
	 * @param test - `unist-util-is-compatible` test <https://github.com/syntax-tree/unist-util-is#test>
	 *
	 * @returns Node hit by the `test` function
	 */
	static findAfter(parent: Parent, index: number, test: Test): Node | null {
		const is = convert(test);

		const { children } = parent;
		let i = index;
		while (i < children.length) {
			const child = children.at(i);
			if (child !== undefined && is(child, i, parent)) {
				return child;
			}

			i += 1;
		}

		return null;
	}
}
