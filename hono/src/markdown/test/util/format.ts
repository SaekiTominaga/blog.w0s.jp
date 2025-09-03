import { format } from 'prettier';
import type { VFile } from 'unified-lint-rule/lib/index.ts';

export default async (vFile: VFile): Promise<string> => {
	const value = vFile.value.toString();

	const formatted = await format(value, {
		endOfLine: 'lf',
		printWidth: 9999,
		useTabs: true,
		parser: 'html',
	});

	return formatted.trim();
};
