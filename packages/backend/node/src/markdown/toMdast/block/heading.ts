import GithubSlugger from 'github-slugger';
import type { Heading, PhrasingContent } from 'mdast';
import { toString } from 'mdast-util-to-string';
import type { Plugin } from 'unified';
import type { Parent } from 'unist';
import { visit, CONTINUE } from 'unist-util-visit';

/**
 * <hn>
 */

export const name = 'x-heading';

export interface XHeading extends Parent {
	type: typeof name;
	depth: Remark.HeadingDepth;
	id?: string;
	children: PhrasingContent[];
}

interface Options {
	maxDepth?: Remark.HeadingDepth;
}

const toMdast = (options?: Options): Plugin => {
	const maxDepth = options?.maxDepth ?? 6;

	const slugger = new GithubSlugger();

	return (tree: Parent): void => {
		visit(tree, 'heading', (node: Heading, index: number | null, parent: Parent | null): boolean => {
			if (index === null || parent === null) {
				return CONTINUE;
			}
			if (node.depth > maxDepth) {
				return CONTINUE;
			}

			const heading: XHeading = {
				type: name,
				depth: node.depth,
				children: node.children,
			};
			if (node.children.length >= 1) {
				heading.id = slugger.slug(toString(node));
			}
			parent.children.splice(index, 1, heading);

			return CONTINUE;
		});
	};
};
export default toMdast;
