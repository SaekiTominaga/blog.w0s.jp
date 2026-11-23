import type { Root } from 'hast';
import { select, selectAll } from 'hast-util-select';
import type { Plugin } from 'unified';

/**
 * 脚注
 *
 * <section data-footnotes="" class="footnotes">
 * 	<h2 class="sr-only" id="footnote-label">Footnotes</h2>
 * 	<ol>
 * 		<li id="fn-1">
 * 			<p>Footnote text. <a href="#fnref-1" data-footnote-backref="" aria-label="Back to reference 1" class="data-footnote-backref">↩</a></p>
 * 		</li>
 * 	</ol>
 * </section>
 *
 * ↓
 *
 * <section class="p-footnote">
 * 	<h2 class="p-footnote__hdg">脚注</h2>
 * 	<ul class="p-footnote__list">
 * 		<li>
 * 			<data value="1" class="p-footnote__no">1.</data>
 * 			<div id="fn-1" class="p-footnote__content">
 * 				<p>Footnote text. <a href="#fnref-1" class="p-footnote__backref">↩ 戻る</a></p>
 * 			</div>
 * 		</li>
 * 	</ul>
 * </section>
 */

const hast: Plugin<[], Root> = () => {
	return (tree: Root): void => {
		const section = select('[data-footnotes]', tree);
		if (section === undefined) {
			return;
		}
		section.properties = {
			className: ['p-footnote'],
		};

		const heading = select('#footnote-label', section);
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

		const list = select(':scope > ol', section);
		if (list !== undefined) {
			list.tagName = 'ul';
			list.properties = {
				className: ['p-footnote__list'],
			};
		}

		selectAll(':scope > li', list).forEach((listItem, index) => {
			const { children, properties } = listItem;
			const { id } = properties;

			listItem.properties = {};
			listItem.children = [
				{
					type: 'element',
					tagName: 'data',
					properties: {
						value: String(index + 1),
						className: ['p-footnote__no'],
					},
					children: [
						{
							type: 'text',
							value: `${String(index + 1)}.`,
						},
					],
				},
				{
					type: 'element',
					tagName: 'div',
					properties: {
						id: id,
						className: ['p-footnote__content'],
					},
					children: children,
				},
			];

			const backref = select('[data-footnote-backref]', listItem);
			if (backref !== undefined) {
				const { href } = backref.properties;

				backref.properties = {
					href: href,
					className: ['p-footnote__backref'],
				};
				backref.children = [
					{
						type: 'text',
						value: '↩ 戻る',
					},
				];
			}
		});
	};
};
export default hast;
