import type { Root } from 'mdast';
import type { Plugin } from 'unified';
import type { Parent } from 'unist';
import { selectAll } from 'unist-util-select';
import { type XHeading, name as nameHeading } from './heading.ts';

/**
 * Table of contents
 */

const name = 'x-toc';

interface XToc extends Parent {
	type: typeof name;
	children: XHeading[];
}

const toMdast: Plugin<[], Root> = () => {
	return (tree: Parent): void => {
		const heading2s = (selectAll(nameHeading, tree) as XHeading[]).filter((node) => node.depth === 2 && node.id !== undefined);

		const firstHeading = heading2s.at(0);
		if (firstHeading === undefined) {
			return;
		}

		const toc: XToc = {
			type: name,
			children: heading2s,
		};

		tree.children.splice(tree.children.indexOf(firstHeading), 0, toc);
	};
};
export default toMdast;
