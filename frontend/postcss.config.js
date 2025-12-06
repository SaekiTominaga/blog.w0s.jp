import pluginCustomMedia from 'postcss-custom-media';
import pluginDiscardComments from 'postcss-discard-comments';
import pluginDiscardEmpty from 'postcss-discard-empty';
import pluginGlobalData from '@csstools/postcss-global-data';
import pluginImport from 'postcss-import';
import pluginNesting from 'postcss-nesting';

/** @type {import('postcss-load-config').Config} */
export default {
	plugins: [
		pluginGlobalData({
			files: ['style/foundation/_@custom-media.css'],
		}), // `postcss-custom-media` より先に定義する必要がある
		pluginCustomMedia(),
		pluginDiscardComments({
			remove: (comment) => comment.startsWith('*') || comment.startsWith('stylelint-') || comment.startsWith('prettylights-syntax-'),
		}),
		pluginDiscardEmpty(),
		pluginImport(),
		pluginNesting(),
	],
};
