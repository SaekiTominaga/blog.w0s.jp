import { lintRule } from 'unified-lint-rule';
import type { Node, Parent } from 'unist';
import { visit, CONTINUE } from 'unist-util-visit';
import { generated } from 'unist-util-generated';
import type { VFile } from 'vfile';

const noTypes = lintRule('remark-lint:no-types', (tree: Parent, file: VFile, option: string[]) => {
	visit(tree, (node: Node, index: number | null, parent: Parent | null): boolean => {
		if (generated(node)) {
			return CONTINUE;
		}
		if (index === null || parent === null) {
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
