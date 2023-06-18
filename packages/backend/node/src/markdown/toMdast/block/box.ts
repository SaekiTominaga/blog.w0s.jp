import type { Paragraph, Text } from 'mdast';
import type { Plugin } from 'unified';
import type { Node, Parent } from 'unist';
import { findAllBetween } from 'unist-util-find-between-all';
import { visit, CONTINUE } from 'unist-util-visit';
import MdastUtil from '../../lib/MdastUtil.js';
import UnistUtil from '../../lib/UnistUtil.js';

/**
 * Box
 */

export const name = 'x-box';

interface XBox extends Parent {
	type: typeof name;
	name: string;
}

const toMdast = (): Plugin => {
	const BOX_OPEN = ':::';
	const BOX_CLOSE = ':::';

	return (tree: Parent): void => {
		visit(tree, 'paragraph', (startNode: Paragraph, index: number | null, parent: Parent | null): boolean => {
			if (index === null || parent === null) {
				return CONTINUE;
			}

			const startNodefirstChild = startNode.children.at(0);
			if (startNodefirstChild?.type !== 'text') {
				return CONTINUE;
			}

			const startNodefirstChildValue = startNodefirstChild.value;
			if (!startNodefirstChildValue.startsWith(BOX_OPEN)) {
				return CONTINUE;
			}

			const startNodefirstChildFirstLfIndex = startNodefirstChildValue.indexOf('\n');
			const boxName =
				startNodefirstChildFirstLfIndex === -1
					? startNodefirstChildValue.substring(BOX_OPEN.length)
					: startNodefirstChildValue.substring(BOX_OPEN.length, startNodefirstChildFirstLfIndex);
			if (boxName === '') {
				return CONTINUE;
			}

			const endNode = <Paragraph | null>UnistUtil.findAfter(parent, parent.children.indexOf(startNode), (node): boolean => {
				if (node.type !== 'paragraph') {
					return false;
				}

				const lastChild = (<Paragraph>node).children.at(-1);
				if (lastChild?.type !== 'text') {
					return false;
				}

				const lastChildValue = lastChild.value;
				return lastChildValue === BOX_CLOSE || lastChildValue.endsWith(`\n${BOX_CLOSE}`);
			});
			if (endNode === null) {
				return CONTINUE;
			}

			startNodefirstChild.value = startNodefirstChildValue.substring(BOX_OPEN.length + boxName.length).trimStart();

			const endNodelastChild = <Text>(<Paragraph>endNode).children.at(-1);
			const endNodelastChildValue = endNodelastChild.value;
			const endNodelastChildLastLfIndex = endNodelastChildValue.lastIndexOf('\n');
			endNodelastChild.value = endNodelastChildValue.substring(0, endNodelastChildLastLfIndex).trimEnd();

			let replaceSize = 0;
			const boxChildren: Node[] = [];

			if (!MdastUtil.isEmptyParagraph(startNode)) {
				boxChildren.push(startNode);
			}
			replaceSize += 1;

			if (!Object.is(startNode, endNode)) {
				const between = findAllBetween(parent, startNode, endNode);

				boxChildren.push(...between);
				replaceSize += between.length;

				if (!MdastUtil.isEmptyParagraph(endNode)) {
					boxChildren.push(endNode);
				}
				replaceSize += 1;
			}

			const box: XBox = {
				type: name,
				name: boxName,
				children: boxChildren,
			};
			parent.children.splice(index, replaceSize, box);

			return CONTINUE;
		});
	};
};
export default toMdast;
