import { select, selectAll } from 'hast-util-select';
import type { Node } from 'hast-util-select/lib/types.js';
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
			className: ['p-footnotes'],
		};

		const list = select(':scope > ol', footnote);
		if (list === null) {
			return;
		}
		list.tagName = 'ul';

		selectAll(':scope > li', list).forEach((listItem) => {
			const pElement = select(':scope > p', listItem);
			if (pElement !== null) {
				listItem.children = pElement?.children; // <li> の子要素に <p> があるのを削除する
			}

			const backref = select('[data-footnote-backref]', listItem);
			if (backref === null) {
				return;
			}

			const href = backref.properties?.['href'];
			backref.properties = {
				href: href,
			};
		});
	};
};
export default hast;
