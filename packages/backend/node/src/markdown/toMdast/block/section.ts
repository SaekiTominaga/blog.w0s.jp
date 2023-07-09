import type { Plugin } from 'unified';
import type { Node, Parent } from 'unist';
import { findAfter } from 'unist-util-find-after';
import { visit, CONTINUE } from 'unist-util-visit';
import type { XHeading } from './heading.js';

/**
 * <section>
 */

export const name = 'x-section';

interface XSection extends Parent {
	type: typeof name;
	depth: number;
	id: string;
}

interface Options {
	maxDepth?: Remark.HeadingDepth;
}

const toMdast = (options?: Options): Plugin => {
	const maxDepth = options?.maxDepth ?? 6;

	return (tree: Parent): void => {
		for (let depth = 1; depth <= maxDepth; depth += 1) {
			visit(tree, 'x-heading', (node: XHeading, index: number | null, parent: Parent | null): boolean => {
				if (index === null || parent === null) {
					return CONTINUE;
				}
				if (node.depth !== depth) {
					return CONTINUE;
				}
				if (node.id === undefined) {
					return CONTINUE;
				}

				const afterSectionNode = findAfter(parent, node, (testNode: Node): boolean => {
					switch (testNode.type) {
						case 'x-heading': {
							return (<XHeading>testNode).depth <= node.depth;
						}
						default:
							return false;
					}
				});

				const sectionCloseIndex = afterSectionNode !== null ? parent.children.indexOf(afterSectionNode) : -1;

				const sectionChildren = parent.children.slice(index, sectionCloseIndex > 0 ? sectionCloseIndex : undefined);
				const section: XSection = {
					type: name,
					depth: node.depth,
					id: node.id,
					children: sectionChildren,
				};

				parent.children.splice(index, section.children.length, section);
				return CONTINUE;
			});
		}
	};
};
export default toMdast;
