import type { Plugin } from 'unified';
import type { Parent } from 'unist';
import { selectAll } from 'unist-util-select';
import { name as nameHeading, type XHeading } from './heading.js';

/**
 * Table of contents
 */

export const name = 'x-toc';

interface XToc extends Parent {
	type: typeof name;
	children: XHeading[];
}

const toMdast = (): Plugin => {
	return (tree: Parent): void => {
		const heading1s = (selectAll(nameHeading, tree) as XHeading[]).filter((node) => node.depth === 1 && node.id !== undefined);

		const firstHeading = heading1s.at(0);
		if (firstHeading === undefined) {
			return;
		}

		const toc: XToc = {
			type: name,
			children: heading1s,
		};

		tree.children.splice(tree.children.indexOf(firstHeading), 0, toc);
	};
};
export default toMdast;
