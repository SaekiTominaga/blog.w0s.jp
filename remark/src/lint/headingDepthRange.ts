import type { Heading } from 'mdast';
import { lintRule } from 'unified-lint-rule';
import type { Parent } from 'unist';
import { CONTINUE, visit } from 'unist-util-visit';
import { generated } from 'unist-util-generated';
import type { VFile } from 'vfile';

const headingDepthRange = lintRule(
	'remark-lint:heading-depth-range',
	(
		tree: Parent,
		file: VFile,
		option: {
			min: Heading['depth'];
			max: Heading['depth'];
		},
	) => {
		visit(tree, 'heading', (node: Heading): boolean => {
			if (generated(node)) {
				return CONTINUE;
			}

			if (node.depth < option.min) {
				file.message(`Heading depth must be \`${String(option.min)}\` or higher`, node);
			}

			if (node.depth > option.max) {
				file.message(`Heading depth must be \`${String(option.max)}\` or lower`, node);
			}

			return CONTINUE;
		});
	},
);
export default headingDepthRange;
