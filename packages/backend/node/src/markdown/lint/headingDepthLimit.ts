import type { Heading } from 'mdast';
import { lintRule } from 'unified-lint-rule';
import type { Parent } from 'unist';
import { visit, CONTINUE } from 'unist-util-visit';
import { generated } from 'unist-util-generated';
import type { VFile } from 'vfile';

const headingDepthLimit = lintRule('remark-lint:heading-depth-limit', (tree: Parent, file: VFile, option: Remark.HeadingDepth) => {
	visit(tree, 'heading', (node: Heading): boolean => {
		if (generated(node)) {
			return CONTINUE;
		}

		if (node.depth > option) {
			file.message(`Heading depth must be \`${option}\` or lower`, node);
		}

		return CONTINUE;
	});
});
export default headingDepthLimit;
