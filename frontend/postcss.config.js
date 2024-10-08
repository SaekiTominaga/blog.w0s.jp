/** @type {import('postcss-load-config').Config} */
export default {
	plugins: {
		'@csstools/postcss-global-data': {
			files: ['style/foundation/_@custom-media.css'],
		},
		'postcss-custom-media': {},
		'postcss-nesting': {},
		'postcss-import': {},
		cssnano: {
			preset: [
				'lite',
				{
					normalizeWhitespace: false,
				},
			],
		},
	},
};
