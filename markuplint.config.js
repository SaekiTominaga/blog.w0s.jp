/** @type {import('@markuplint/ml-config').Config} */
export default {
	extends: ['@w0s/markuplint-config'],
	parser: {
		'.ejs$': '@markuplint/ejs-parser',
	},
	excludeFiles: ['template/feed', 'template/sns', 'template/xml'],
	rules: {
		'disallowed-element': ['base', 'style', 'h5', 'h6', 's', 'i', 'u', 'wbr', 'area'],
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
			selector: '.p-entry__body dl',
			rules: {
				'required-element': false,
			},
		},
		{
			selector: '.p-entry__body table',
			rules: {
				'required-element': ['thead'],
			},
		},
		{
			selector: '.p-post-preview__messages',
			rules: {
				'wai-aria': false,
			},
		},
	],
	childNodeRules: [
		{
			selector: '.p-entry__body',
			inheritance: true,
			rules: {
				'character-reference': false,
			},
		},
		{
			selector: '.p-code__code',
			inheritance: true,
			rules: {
				'class-naming': false,
				'no-empty-palpable-content': false,
			},
		},
	],
	overrideMode: 'merge',
	overrides: {
		'**/*.ejs': {
			rules: {
				'permitted-contents': false,
				'label-has-control': false,
			},
		},
		'template/error.ejs': {
			rules: {
				'required-h1': false,
			},
		},
		'template/list.ejs': {
			rules: {
				'required-h1': false,
			},
		},
	},
};
