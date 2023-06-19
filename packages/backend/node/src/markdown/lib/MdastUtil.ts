import type { Paragraph } from 'mdast';

export default class MdastUtil {
	/**
	 * Check if a node is an empty paragraph.
	 *
	 * @param {object} node - Node
	 *
	 * @returns {boolean} true if the node content is empty
	 */
	static isEmptyParagraph(node: Paragraph): boolean {
		return node.children.every((child) => child.type === 'text' && child.value.trim() === '');
	}
}
