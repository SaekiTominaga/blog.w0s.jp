/** @type {import('@markuplint/ml-config').Config} */
export default {
	extends: ['@w0s/markuplint-config'],
	parser: {
		'.ejs$': '@markuplint/ejs-parser',
	},
	excludeFiles: ['template/sns', 'template/xml'],
	rules: {
		'no-restricted-element': ['noscript', 'embed', 'base', 'style', 'h5', 'h6', 's', 'i', 'u', 'wbr', 'area'],
		'class-naming': [
			'/^[lcpu]-([a-z][a-z0-9]*)(-[a-z0-9]+)*(?:__[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*)?(?:--[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*){0,2}$/',
			'/^-([a-z][a-z0-9]*)(-[a-z0-9]+)*$/',
			'/^js-([a-z][a-z0-9]*)(-[a-z0-9]+)*$/',
			'/^adsbygoogle$/',
		],
	},
	nodeRules: [
		{
			selector: '[id], ins.adsbygoogle',
			rules: {
				'no-empty-palpable-content': false,
			},
		},
		{
			selector: 'table',
			rules: {
				'require-accessible-name': false,
			},
		},
		{
			selector: 'button > svg[role="img"]',
			rules: {
				'no-aria-on-presentational-children': false,
			},
		},
		{
			selector: '.p-book-item__link > a[aria-labelledby]',
			rules: {
				'no-redundant-accessible-name': false,
			},
		},
		{
			selector: '.p-entry__body dl',
			rules: {
				'require-element': false,
			},
		},
		{
			selector: '.p-entry__body table',
			rules: {
				'require-element': ['thead'],
			},
		},
		{
			selector: '.p-post-preview__messages',
			rules: {
				'require-owned-elements': false,
			},
		},
	],
	childNodeRules: [
		{
			selector: '.p-code__code',
			inheritance: true,
			rules: {
				'class-naming': false,
				'no-empty-palpable-content': false,
			},
		},
		{
			/* Customizable Select */
			selector: '.c-search__engine',
			inheritance: true,
			rules: {
				'no-unescaped-char': false,
			},
		},
	],
	overrideMode: 'merge',
	overrides: {
		'**/*.ejs': {
			rules: {
				'permitted-contents': false,
				'label-no-multiple-controls': false,
				'label-has-control': false,
			},
		},
		'.html/**/*.html': {
			rules: {
				'permitted-contents': false, // Customizable Select
			},
		},
		'template/4xx.html': {
			rules: {
				'permitted-contents': false, // Customizable Select
			},
		},
		'template/404.html': {
			rules: {
				'permitted-contents': false, // Customizable Select
			},
		},
		'template/list.ejs': {
			rules: {
				'require-h1': false,
			},
		},
	},
};
