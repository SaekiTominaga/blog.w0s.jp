const config = {
	singleQuote: true,
	plugins: ['prettier-plugin-ejs'],

	overrides: [
		{
			files: ['*.html', '*.ejs'],
			options: {
				parser: 'html',
				printWidth: 9999,
			},
		},
		{
			files: '*.css',
			options: {
				parser: 'css',
				singleQuote: false,
			},
		},
	],
};
export default config;
