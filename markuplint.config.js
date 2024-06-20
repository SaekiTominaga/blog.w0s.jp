/** @type {import('@markuplint/ml-config').Config} */
export default {
	extends: ['./node_modules/@w0s/markuplint-config/.markuplintrc'],
	parser: {
		'.ejs$': '@markuplint/ejs-parser',
	},
	excludeFiles: ['views/feed/*.ejs', 'views/social/*.ejs', 'views/xml/*.ejs'],
	rules: {
		'disallowed-element': ['base', 'style', 'h5', 'h6', 's', 'i', 'u', 'wbr', 'area'],
		'permitted-contents': false,
		'label-has-control': false,
		'require-accessible-name': false,
		'required-h1': false,
		'class-naming': [
			'/^[lcpu]-([a-z][a-z0-9]*)(-[a-z0-9]+)*(?:__[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*)?(?:--[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*){0,2}$/',
			'/^-([a-z][a-z0-9]*)(-[a-z0-9]+)*$/',
			'/^js-([a-z][a-z0-9]*)(-[a-z0-9]+)*$/',
			'/^hljs-([a-z][a-z0-9]*)(-[a-z0-9]+)*$/',
			'/^language-[a-z]+$/',
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
			selector: 'aside',
			rules: {
				'landmark-roles': false,
			},
		},
		{
			selector: 'video',
			rules: {
				'no-empty-palpable-content': false,
			},
		},
		{
			selector: 'table',
			rules: {
				'required-element': ['thead'],
			},
		},
		{
			selector: '.p-post-preview__messages',
			rules: {
				'required-element': false,
				'wai-aria': false,
			},
		},
		{
			selector: '.p-post-preview__messages > tbody',
			rules: {
				'permitted-contents': false,
			},
		},
		{
			selector: '#image-preview',
			rules: {
				'wai-aria': false,
			},
		},
		{
			selector: 'template time',
			rules: {
				'invalid-attr': {
					options: {
						ignoreAttrNamePrefix: ['datetime'],
					},
				},
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
				'no-empty-palpable-content': false,
				'class-naming': false,
			},
		},
	],
};
