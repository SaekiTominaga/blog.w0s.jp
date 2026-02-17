import { lintRule } from 'unified-lint-rule';
import type { Node, Parent } from 'unist';
import { visit, CONTINUE } from 'unist-util-visit';
import { generated } from 'unist-util-generated';
import type { VFile } from 'vfile';

const noTypes = lintRule('remark-lint:no-types', (tree: Parent, file: VFile, option: readonly string[]) => {
	visit(tree, (node: Node, index: number | undefined, parent: Parent | undefined): boolean => {
		if (generated(node)) {
			return CONTINUE;
		}
		if (index === undefined || parent === undefined) {
			return CONTINUE;
		}

		if (option.includes(node.type)) {
			file.message(`Do not use node type "${node.type}"`, node);
			return CONTINUE;
		}

		return CONTINUE;
	});
});
export default noTypes;
