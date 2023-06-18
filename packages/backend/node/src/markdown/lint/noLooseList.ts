import type { List } from 'mdast';
import { lintRule } from 'unified-lint-rule';
import type { Parent } from 'unist';
import { visit, CONTINUE } from 'unist-util-visit';
import { generated } from 'unist-util-generated';
import type { VFile } from 'vfile';

const noLooseList = lintRule('remark-lint:no-loose-list', (tree: Parent, file: VFile) => {
	visit(tree, 'list', (node: List): boolean => {
		if (generated(node)) {
			return CONTINUE;
		}

		if (node.spread) {
			file.message('Do not use loose list', node);
		}

		return CONTINUE;
	});
});
export default noLooseList;
