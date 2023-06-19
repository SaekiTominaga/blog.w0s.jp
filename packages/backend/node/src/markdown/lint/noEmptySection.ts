import type { Heading } from 'mdast';
import { lintRule } from 'unified-lint-rule';
import type { Parent } from 'unist';
import { visit, CONTINUE } from 'unist-util-visit';
import { generated } from 'unist-util-generated';
import type { VFile } from 'vfile';

const noEmptySection = lintRule('remark-lint:no-empty-section', (tree: Parent, file: VFile) => {
	visit(tree, 'heading', (node: Heading, index: number | null, parent: Parent | null): boolean => {
		if (generated(node)) {
			return CONTINUE;
		}
		if (index === null || parent === null) {
			return CONTINUE;
		}

		const nextSibling = parent.children.at(index + 1);
		if ((nextSibling?.type === 'heading' && (<Heading>nextSibling).depth === node.depth) || index === parent.children.length - 1) {
			file.message('Section contents are empty except for the heading', node);
			return CONTINUE;
		}

		return CONTINUE;
	});
});
export default noEmptySection;
