import type { FootnoteReference } from 'mdast';
import { lintRule } from 'unified-lint-rule';
import type { Parent } from 'unist';
import { CONTINUE, visit } from 'unist-util-visit';
import { generated } from 'unist-util-generated';
import type { VFile } from 'vfile';

const footnoteReferenceIdentifier = lintRule('remark-lint:footnote-reference-identifier', (tree: Parent, file: VFile) => {
	visit(tree, 'footnoteReference', (node: FootnoteReference): boolean => {
		if (generated(node)) {
			return CONTINUE;
		}

		if (node.identifier.includes('#')) {
			file.message('Do not use `#` in footnote reference ID', node);
		}

		return CONTINUE;
	});
});
export default footnoteReferenceIdentifier;
