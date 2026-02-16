import { defListFromMarkdown } from 'mdast-util-definition-list';
import { defList } from 'micromark-extension-definition-list';
import type { Extension } from 'micromark-util-types';

/**
 * <dl>
 */

interface FromMarkdownExtension {
	enter: {
		defList: object;
		defListTerm: object;
		defListDescription: object;
	};
	exit: {
		defList: object;
		defListTerm: object;
		defListDescription: object;
	};
}

export default function toMdast() {
	// @ts-expect-error: ts(2683)
	const data = this.data();

	const add = (field: string, value: Extension | FromMarkdownExtension): void => {
		const list: unknown[] = data[field] !== undefined ? data[field] : (data[field] = []);

		list.push(value);
	};

	add('micromarkExtensions', defList);
	add('fromMarkdownExtensions', defListFromMarkdown);
}
