import type { HastElementContent } from 'mdast-util-to-hast/lib/state.js';

/**
 * Empty paragraph
 */

export const xEmptyToHast = (): HastElementContent | HastElementContent[] | null | undefined => {
	return null;
};
