import pluginCssnano from 'cssnano';
import pluginCustomMedia from 'postcss-custom-media';
import pluginGlobalData from '@csstools/postcss-global-data';
import pluginImport from 'postcss-import';
import pluginNesting from 'postcss-nesting';

/** @type {import('postcss-load-config').Config} */
export default {
	plugins: [
		pluginCssnano({
			preset: [
				'lite',
				{
					normalizeWhitespace: false,
				},
			],
		}),
		pluginGlobalData({
			files: ['style/foundation/_@custom-media.css'],
		}), // `postcss-custom-media` より先に定義する必要がある
		pluginCustomMedia(),
		pluginImport(),
		pluginNesting(),
	],
};
