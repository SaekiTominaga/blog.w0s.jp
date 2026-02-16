import type { Table, AlignType, TableContent } from 'mdast';
import type { Extension as FromMarkdownExtension } from 'mdast-util-from-markdown';
import { gfmTableFromMarkdown } from 'mdast-util-gfm-table';
import { gfmTable } from 'micromark-extension-gfm-table';
import type { Extension } from 'micromark-util-types';
import type { Parent } from 'unist';
import { visit, CONTINUE } from 'unist-util-visit';

/**
 * <table>
 */

const name = 'x-table';

interface XTable extends Parent {
	type: typeof name;
	align?: AlignType[] | null | undefined;
	firstRowHeaderCell: boolean; // 一列目がヘッダーセルかどうか
	children: TableContent[];
}

export default function toMdast() {
	const FIRST_ROW_HEADER_SIGN = '~'; // 一行目の一列目のセル（もっとも左上のセル）がこの記号文字で始まっていたら全行の一列目をヘッダーセル（<th>）にする

	// @ts-expect-error: ts(2683)
	const data = this.data();

	const add = (field: string, value: Extension | FromMarkdownExtension): void => {
		const list: unknown[] = data[field] !== undefined ? data[field] : (data[field] = []);

		list.push(value);
	};

	add('micromarkExtensions', gfmTable());
	add('fromMarkdownExtensions', gfmTableFromMarkdown());

	return (tree: Parent): void => {
		visit(tree, 'table', (node: Table, index: number | null, parent: Parent | null): boolean => {
			if (index === null || parent === null) {
				return CONTINUE;
			}

			let firstRowHeaderCell = false;

			const firstColfirstRowCellFirstNode = node.children.at(0)?.children.at(0)?.children.at(0); // 一行目の一列目のセル（もっとも左上のセル）の最初のノード
			if (firstColfirstRowCellFirstNode?.type === 'text' && firstColfirstRowCellFirstNode.value.startsWith(FIRST_ROW_HEADER_SIGN)) {
				firstColfirstRowCellFirstNode.value = firstColfirstRowCellFirstNode.value.substring(FIRST_ROW_HEADER_SIGN.length);
				firstRowHeaderCell = true;
			}

			const table: XTable = {
				type: name,
				align: node.align,
				firstRowHeaderCell: firstRowHeaderCell,
				children: node.children,
			};

			parent.children.splice(index, 1, table);

			return CONTINUE;
		});
	};
}
