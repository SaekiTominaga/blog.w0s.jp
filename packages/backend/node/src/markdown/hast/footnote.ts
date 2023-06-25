import { select, selectAll } from 'hast-util-select';
import type { Node } from 'hast-util-select/lib/types.js';
import type { HastElementContent } from 'mdast-util-to-hast/lib/state';
import type { Plugin } from 'unified';

/**
 * 脚注
 */

const hast = (): Plugin => {
	return (tree: Node): void => {
		const footnote = select('[data-footnotes]', tree);
		if (footnote === null) {
			return;
		}
		footnote.properties = {
			className: ['p-footnote'],
		};

		const heading = select('#footnote-label', footnote);
		if (heading !== null) {
			heading.properties = {
				className: ['p-footnote__hdg'],
			};
			heading.children = [
				{
					type: 'text',
					value: '脚注',
				},
			];
		}

		const list = select(':scope > ol', footnote);
		if (list === null) {
			return;
		}
		list.tagName = 'ul';
		list.properties = {
			className: ['p-footnote__list'],
		};

		selectAll(':scope > li', list).forEach((listItem, index) => {
			const id = listItem.properties?.['id'];
			listItem.properties = {};

			listItem.children.splice(1, 0, {
				type: 'element',
				tagName: 'span',
				properties: {
					className: ['p-footnote__no'],
				},
				children: [
					{
						type: 'text',
						value: `${index + 1}.`,
					},
				],
			});

			const content = select(':scope > p', listItem);
			if (content !== null) {
				content.properties = {
					className: ['p-footnote__content'],
				};

				const contentChildren: HastElementContent[] = [];
				contentChildren.push({
					type: 'element',
					tagName: 'span',
					properties: {
						id: id,
					},
					children: content.children,
				});
				contentChildren.push({
					type: 'text',
					value: ' ',
				});

				const backref = select(':scope > [data-footnote-backref]', content);
				if (backref !== null) {
					const href = backref.properties?.['href'];

					contentChildren.push({
						type: 'element',
						tagName: 'a',
						properties: {
							href: href,
							className: ['c-footnote-backref'],
						},
						children: [
							{
								type: 'text',
								value: '↩ 戻る',
							},
						],
					});

					content.children.splice(content.children.indexOf(backref), 1);

					const lastChild = content.children.at(-1);
					if (lastChild?.type === 'text') {
						lastChild.value = lastChild.value.trim(); // content.children の末尾の [data-footnote-backref] の前にある空白文字を削除する
					}
				}

				content.children = contentChildren;
			}
		});
	};
};
export default hast;
