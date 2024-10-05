import { format } from 'prettier';

export default async (vFile) => {
	const value = vFile.value.toString();

	const formatted = await format(value, {
		endOfLine: 'lf',
		printWidth: 9999,
		useTabs: true,
		parser: 'html',
	});

	return formatted.trim();
};
