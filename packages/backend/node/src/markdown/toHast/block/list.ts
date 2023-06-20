import dayjs from 'dayjs';
import { Properties } from 'hast-util-select/lib/types.js';
import type { Literal, List, Paragraph } from 'mdast';
import type { H } from 'mdast-util-to-hast';
import type { HastElementContent } from 'mdast-util-to-hast/lib/state.js';

/**
 * <ol>, <ul>
 */

export const listToHast = (state: H, node: List): HastElementContent | HastElementContent[] | null | undefined => {
	const listItems = node.children;

	/* Ordered list */
	if (node.ordered) {
		const attributes: Properties = {
			className: ['p-list-num'],
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
		const childFirstNode = (<Paragraph[]>listItem.children).at(0)?.children?.at(0);
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
		const childFirstNode = (<Paragraph[]>listItem.children).at(0)?.children?.at(0);
		return childFirstNode?.type === 'text' && childFirstNode.value.startsWith(NOTE_START);
	}); // 順不同リストの先頭がすべて `note: ` で始まる場合
	if (noteList) {
		listItems.forEach((listItem) => {
			const childFirstTextNode = <Literal>(<Paragraph>listItem.children.at(0)).children.at(0);
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

	/* Insert list */
	const INSERT_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}: /;

	const insertList = listItems.every((listItem) => {
		const childFirstNode = (<Paragraph[]>listItem.children).at(0)?.children?.at(0);
		return childFirstNode?.type === 'text' && INSERT_PATTERN.test(childFirstNode.value);
	}); // 順不同リストの先頭がすべて `YYYY-MM-DD: ` で始まる場合
	if (insertList) {
		const insertElements: HastElementContent[] = [];
		listItems.forEach((listItem) => {
			const childNodes = (<Paragraph>listItem.children.at(0)).children;
			const childFirstTextNode = <Literal>childNodes.at(0);

			const date = dayjs(childFirstTextNode.value.substring(0, 10));

			childFirstTextNode.value = childFirstTextNode.value.substring(12);

			insertElements.push({
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
			});
		});

		return insertElements;
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
