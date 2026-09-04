import type { Heading } from 'mdast';
import { lintRule } from 'unified-lint-rule';
import type { Parent } from 'unist';
import { CONTINUE, visit } from 'unist-util-visit';
import { generated } from 'unist-util-generated';
import type { VFile } from 'vfile';

const headingLevelRange = lintRule(
	'remark-lint:heading-level-range',
	(
		tree: Parent,
		file: VFile,
		options: {
			min: Heading['depth'];
			max: Heading['depth'];
		},
	) => {
		visit(tree, 'heading', (node: Heading): boolean => {
			if (generated(node)) {
				return CONTINUE;
			}

			if (node.depth < options.min) {
				file.message(`Heading level must be \`${String(options.min)}\` or higher`, node);
			}

			if (node.depth > options.max) {
				file.message(`Heading level must be \`${String(options.max)}\` or lower`, node);
			}

			return CONTINUE;
		});
	},
);
export default headingLevelRange;
