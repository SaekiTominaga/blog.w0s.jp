import type { ElementContent, Properties } from 'hast';
import type { List, Literal, Paragraph } from 'mdast';
import type { State } from 'mdast-util-to-hast';

/**
 * <ol>, <ul>
 */

export const listToHast = (state: State, node: List): ElementContent | ElementContent[] | undefined => {
	const listItems = node.children;

	/* Ordered list */
	if (node.ordered) {
		const attributes: Properties = {
			className: ['p-list-num'],
			'data-digit': listItems.length.toString().length,
		};
		if (node.start !== null && node.start !== undefined && node.start !== 1) {
			attributes['start'] = node.start;
		}

		return {
			type: 'element',
			tagName: 'ol',
			properties: attributes,
			children: state.all(node),
		};
	}

	/* Link list */
	const linkList = listItems.every((listItem) => {
		const childFirstNode = (listItem.children as Paragraph[]).at(0)?.children.at(0);
		return childFirstNode?.type === 'link';
	}); // 順不同リストの先頭がすべてリンク形式（`[text](URL)`）だった場合
	if (linkList) {
		return {
			type: 'element',
			tagName: 'ul',
			properties: {
				className: ['p-links'],
			},
			children: state.all(node),
		};
	}

	/* Note list */
	const NOTE_START = 'note: ';

	const noteList = listItems.every((listItem) => {
		const childFirstNode = (listItem.children as Paragraph[]).at(0)?.children.at(0);
		return childFirstNode?.type === 'text' && childFirstNode.value.startsWith(NOTE_START);
	}); // 順不同リストの先頭がすべて `note: ` で始まる場合
	if (noteList) {
		listItems.forEach((listItem) => {
			const childFirstTextNode = (listItem.children.at(0) as Paragraph).children.at(0) as Literal;
			childFirstTextNode.value = childFirstTextNode.value.substring(NOTE_START.length);
		});

		return {
			type: 'element',
			tagName: 'ul',
			properties: {
				className: ['p-notes'],
			},
			children: state.all(node),
		};
	}

	/* Unordered list */
	return {
		type: 'element',
		tagName: 'ul',
		properties: {
			className: ['p-list'],
		},
		children: state.all(node),
	};
};
