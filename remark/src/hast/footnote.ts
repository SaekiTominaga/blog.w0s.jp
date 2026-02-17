import type { ElementContent, Root } from 'hast';
import { select, selectAll } from 'hast-util-select';
import type { Plugin } from 'unified';

/**
 * 脚注
 */

const hast: Plugin<[], Root> = () => {
	return (tree: Root): void => {
		const footnote = select('[data-footnotes]', tree);
		if (footnote === undefined) {
			return;
		}
		footnote.properties = {
			className: ['p-footnote'],
		};

		const heading = select('#footnote-label', footnote);
		if (heading !== undefined) {
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
		if (list === undefined) {
			return;
		}
		list.tagName = 'ul';
		list.properties = {
			className: ['p-footnote__list'],
		};

		selectAll(':scope > li', list).forEach((listItem, index) => {
			const { id } = listItem.properties;
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
						value: `${String(index + 1)}.`,
					},
				],
			});

			const content = select(':scope > p', listItem);
			if (content !== undefined) {
				content.properties = {
					className: ['p-footnote__content'],
				};

				const contentChildren: ElementContent[] = [];
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
				if (backref !== undefined) {
					const { href } = backref.properties;

					contentChildren.push({
						type: 'element',
						tagName: 'a',
						properties: {
							href: href,
							className: ['p-footnote__backref'],
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
