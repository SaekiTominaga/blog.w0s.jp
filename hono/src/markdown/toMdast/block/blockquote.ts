import type { BlockContent, Blockquote, DefinitionContent, Text } from 'mdast';
import { toString } from 'mdast-util-to-string';
import type { Plugin } from 'unified';
import type { Parent } from 'unist';
import { remove } from 'unist-util-remove';
import { visit, CONTINUE, EXIT } from 'unist-util-visit';
import Quote from '../../lib/Quote.ts';

/**
 * <blockquote>
 */

const name = 'x-blockquote';

interface XBlockquote extends Parent {
	type: typeof name;
	lang?: string;
	citetext?: string;
	citeurl?: string;
	citeisbn?: string;
	citeamazon?: string;
	children: (BlockContent | DefinitionContent)[];
}

const toMdast = (): Plugin => {
	const META_START = '?';

	return (tree: Parent): void => {
		visit(tree, 'blockquote', (node: Blockquote, index: number | null, parent: Parent | null): boolean => {
			if (index === null || parent === null) {
				return CONTINUE;
			}

			const blockquote: XBlockquote = {
				type: name,
				children: node.children,
			};

			const childLastNode = node.children.at(-1);
			if (childLastNode?.type === 'list') {
				const listItems = childLastNode.children;
				const metaExist = listItems.every((listItem): boolean => {
					const paragraph = listItem.children.at(0);
					if (paragraph?.type === 'paragraph') {
						const listItemFirstChild = paragraph.children.at(0);
						return listItemFirstChild?.type === 'text' && listItemFirstChild.value.startsWith(META_START);
					}
					return false;
				});

				if (metaExist) {
					listItems.forEach((listItem) => {
						visit(listItem, 'text', (text: Text): boolean => {
							text.value = text.value.substring(META_START.length); // 先頭記号文字を除去

							return EXIT;
						});

						const metaText = toString(listItem);
						const meta = Quote.classifyMeta(metaText);

						if (meta.lang !== undefined) {
							blockquote.lang = meta.lang;
						} else if (meta.url !== undefined) {
							blockquote.citeurl = meta.url;
						} else if (meta.isbn !== undefined) {
							if (meta.isbn.valid) {
								blockquote.citeisbn = meta.isbn.value;
							}
						} else if (meta.amazon !== undefined) {
							blockquote.citeamazon = meta.amazon;
						} else {
							blockquote.citetext = metaText;
						}
					});

					const BLOCKQUOTE_META_TEMP_NAME = 'blockquote-meta';
					// @ts-expect-error: ts(2322)
					childLastNode.type = BLOCKQUOTE_META_TEMP_NAME;
					remove(node, BLOCKQUOTE_META_TEMP_NAME);
				}
			}

			parent.children.splice(index, 1, blockquote);

			return CONTINUE;
		});
	};
};
export default toMdast;
