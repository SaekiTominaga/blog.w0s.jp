/** @type {import('stylelint').Config} */
export default {
	extends: ['@w0s/stylelint-config'],
	rules: {
		'max-nesting-depth': [
			5,
			{
				severity: 'warning',
			},
		],
		'selector-class-pattern':
			'^([lcpu])-([a-z][a-z0-9]*)(-[a-z0-9]+)*(?:__[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*)?(?:--[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*){0,2}$|^-([a-z][a-z0-9]*)(-[a-z0-9]+)*$|^adsbygoogle$',

		/* color function */
		'color-no-hex': true,
		'function-disallowed-list': ['rgb', 'hsl', 'hwb', 'lab', 'lch'], // `color-function` parameter accepts only `oklab()` or `oklch()` <https://drafts.csswg.org/css-color/#typedef-color-function>
	},
	overrides: [
		{
			files: ['style/foundation/_var.css'],
			rules: {
				'custom-property-empty-line-before': null,
			},
		},
	],
};
