import type { Paragraph } from 'mdast';

/**
 * Check if a node is an empty paragraph.
 *
 * @param node - Node
 *
 * @returns true if the node content is empty
 */
export const isEmptyParagraph = (node: Paragraph): boolean => node.children.every((child) => child.type === 'text' && child.value.trim() === '');
