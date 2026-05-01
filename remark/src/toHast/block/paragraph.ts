import dayjs from 'dayjs';
import type { ElementContent } from 'hast';
import type { Paragraph } from 'mdast';
import type { State } from 'mdast-util-to-hast';

/**
 * <p>
 */

export const paragraphToHast = (state: State, node: Paragraph): ElementContent | ElementContent[] | undefined => {
	const childNodes = node.children;
	const firstChild = childNodes.at(0);

	if (node.position?.start.column === 1 && firstChild?.type === 'text') {
		const INSERT_PATTERN = /^\+[0-9]{4}-[0-9]{2}-[0-9]{2}: /v; // +YYYY-MM-DD:␣

		/* Insert */
		if (INSERT_PATTERN.test(firstChild.value)) {
			const date = dayjs(firstChild.value.substring(1, 11));

			firstChild.value = firstChild.value.substring(13);

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
						children: state.all({
							type: 'root',
							children: childNodes,
						}),
					},
				],
			};
		}
	}

	return {
		type: 'element',
		tagName: 'p',
		properties: {},
		children: state.all(node),
	};
};
