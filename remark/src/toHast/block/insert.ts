import dayjs from 'dayjs';
import type { ElementContent } from 'hast';
import type { Root } from 'mdast';
import type { State } from 'mdast-util-to-hast';

/**
 * Insert
 */

interface XInsert extends Root {
	date: Date;
}

export const xInsertToHast = (state: State, node: XInsert): ElementContent | ElementContent[] | undefined => {
	const date = dayjs(node.date);

	return {
		type: 'element',
		tagName: 'p',
		properties: {
			className: ['p-insert'],
		},
		children: [
			{
				type: 'element',
				tagName: 'span',
				properties: {
					className: ['p-insert__date'],
				},
				children: [
					{
						type: 'text',
						value: `${date.format('YYYY年M月D日')}追記`,
					},
				],
			},
			{
				type: 'element',
				tagName: 'ins',
				properties: {
					datetime: date.format('YYYY-MM-DD'),
					className: ['p-insert__text'],
				},
				children: state.all(node),
			},
		],
	};
};
