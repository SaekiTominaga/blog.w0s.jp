import type { Link } from 'mdast';
import { lintRule } from 'unified-lint-rule';
import type { Parent } from 'unist';
import { visit, CONTINUE } from 'unist-util-visit';
import { generated } from 'unist-util-generated';
import type { VFile } from 'vfile';

const noLinkTitle = lintRule('remark-lint:no-link-title', (tree: Parent, file: VFile) => {
	visit(tree, 'link', (node: Link): boolean => {
		if (generated(node)) {
			return CONTINUE;
		}

		if (node.title !== null && node.title !== undefined) {
			file.message('Do not set title to link', node);
		}

		return CONTINUE;
	});
});
export default noLinkTitle;
