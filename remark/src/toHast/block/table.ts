import type { ElementContent, Properties } from 'hast';
import type { Table, TableRow } from 'mdast';
import type { State } from 'mdast-util-to-hast';
import { toString } from 'mdast-util-to-string';

/**
 * <table>
 */

interface XTable extends Table {
	firstRowHeaderCell: boolean; // 一列目がヘッダーセルかどうか
}

const tableRowToHast = (state: State, tableRows: TableRow[], table: XTable): ElementContent[] => {
	const { align, firstRowHeaderCell, children: parentChildren } = table;

	return tableRows.map((tableRow): ElementContent => {
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
			properties: {},
			children: state.wrap(cells, true),
		};
	});
};

export const tableToHast = (state: State, node: XTable): ElementContent | ElementContent[] | undefined => {
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
				properties: {},
				children: tableRowToHast(state, node.children.slice(0, 1), node),
			},
			{
				type: 'element',
				tagName: 'tbody',
				properties: {},
				children: tableRowToHast(state, node.children.slice(1), node),
			},
		],
	};
};
