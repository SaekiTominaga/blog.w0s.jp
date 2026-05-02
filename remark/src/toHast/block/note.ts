import type { ElementContent } from 'hast';
import type { Root } from 'mdast';
import type { State } from 'mdast-util-to-hast';

/**
 * Note
 */

export const xNoteToHast = (state: State, node: Root): ElementContent | ElementContent[] | undefined => {
	return {
		type: 'element',
		tagName: 'p',
		properties: {
			className: ['p-note'],
		},
		children: [
			{
				type: 'element',
				tagName: 'span',
				properties: {
					className: ['p-note__sign'],
				},
				children: [
					{
						type: 'text',
						value: '※',
					},
				],
			},
			{
				type: 'element',
				tagName: 'span',
				properties: {
					className: ['p-note__text'],
				},
				children: state.all(node),
			},
		],
	};
};
