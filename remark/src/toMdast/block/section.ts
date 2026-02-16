import type { Heading, Root } from 'mdast';
import type { Plugin } from 'unified';
import type { Node, Parent } from 'unist';
import { findAfter } from 'unist-util-find-after';
import { visit, CONTINUE } from 'unist-util-visit';
import type { XHeading } from './heading.ts';

/**
 * <section>
 */

const name = 'x-section';

interface XSection extends Parent {
	type: typeof name;
	depth: number;
	id: string;
}

interface Options {
	maxDepth?: Heading['depth'];
}

const toMdast: Plugin<Options[], Root> = (options?: Readonly<Options>) => {
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
							return (testNode as XHeading).depth <= node.depth;
						}
						default:
							return false;
					}
				});

				const sectionCloseIndex = afterSectionNode !== undefined ? parent.children.indexOf(afterSectionNode) : -1;

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
