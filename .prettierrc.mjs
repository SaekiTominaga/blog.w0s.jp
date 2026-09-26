/** @type {import("prettier").Config} */
const config = {
	printWidth: 160, // rollup-plugin-prettier は .editorconfig の設定が適用されないためここで指定する
	useTabs: true, // rollup-plugin-prettier は .editorconfig の設定が適用されないためここで指定する
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
