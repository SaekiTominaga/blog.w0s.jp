import type { HTML } from 'mdast';
import { lintRule } from 'unified-lint-rule';
import type { Parent } from 'unist';
import { visit, CONTINUE } from 'unist-util-visit';
import { generated } from 'unist-util-generated';
import type { VFile } from 'vfile';

const noRecommendedHtml = lintRule('remark-lint:no-recommended-html', (tree: Parent, file: VFile) => {
	visit(tree, 'html', (node: HTML): boolean => {
		if (generated(node)) {
			return CONTINUE;
		}

		file.info('Use inline code syntax (``) for HTML fragments whenever possible', node);

		return CONTINUE;
	});
});
export default noRecommendedHtml;
