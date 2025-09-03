import type { Properties } from 'hast-util-select/lib/types.ts';
import type { Table, TableRow } from 'mdast';
import type { H } from 'mdast-util-to-hast';
import { toString } from 'mdast-util-to-string';
import type { HastElementContent } from 'mdast-util-to-hast/lib/state.ts';
import type { ElementContent } from 'mdast-util-to-hast/lib/handlers/table-row.ts';

/**
 * <table>
 */

interface XTable extends Table {
	firstRowHeaderCell: boolean; // 一列目がヘッダーセルかどうか
}

const tableRowToHast = (state: H, tableRows: TableRow[], table: XTable): HastElementContent[] => {
	const { align, firstRowHeaderCell, children: parentChildren } = table;

	return tableRows.map((tableRow): HastElementContent => {
		const rowIndex = parentChildren.indexOf(tableRow);
		let colIndex = 0;
		const length = align?.length ?? tableRow.children.length;

		const cells: ElementContent[] = [];

		while (colIndex < length) {
			const cell = tableRow.children.at(colIndex);
			const alignValue = align?.at(colIndex);

			if (cell !== undefined) {
				let tagName = 'td';
				const attributes: Properties = {};

				if (toString(cell) !== '') {
					if (rowIndex === 0) {
						/* in <thead> */
						tagName = 'th';
						attributes['scope'] = 'col';
					} else if (colIndex === 0 && firstRowHeaderCell) {
						/* in <tbody> */
						tagName = 'th';
						attributes['scope'] = 'row';
					}
				}

				if (alignValue !== null && alignValue !== undefined) {
					let alignValueLogical: string = alignValue;
					switch (alignValue) {
						case 'left': {
							alignValueLogical = 'start';
							break;
						}
						case 'right': {
							alignValueLogical = 'end';
							break;
						}
						default:
					}

					attributes['style'] = `text-align: ${alignValueLogical}`;
				}

				cells.push({
					type: 'element',
					tagName: tagName,
					properties: attributes,
					children: state.all(cell),
				});
			}

			colIndex += 1;
		}

		return {
			type: 'element',
			tagName: 'tr',
			children: state.wrap(cells, true),
		};
	});
};

export const tableToHast = (state: H, node: XTable): HastElementContent | HastElementContent[] | null | undefined => {
	return {
		type: 'element',
		tagName: 'table',
		properties: {
			className: ['p-table'],
		},
		children: [
			{
				type: 'element',
				tagName: 'thead',
				children: tableRowToHast(state, node.children.slice(0, 1), node),
			},
			{
				type: 'element',
				tagName: 'tbody',
				children: tableRowToHast(state, node.children.slice(1), node),
			},
		],
	};
};
