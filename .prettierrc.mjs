const config = {
	singleQuote: true,

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
