import path from 'path';
import url from 'url';

const dirname = path.dirname(url.fileURLToPath(import.meta.url));

export default {
	entry: {
		'blog.mjs': './docs/script/_src/blog.ts',
		'error.mjs': './docs/script/_src/error.ts',
		'google-analytics.js': './docs/script/_src/google-analytics.ts',
		'trusted-types.js': './docs/script/_src/trusted-types.ts',
	},
	mode: 'production',
	output: {
		filename: '[name]',
		path: `${path.resolve(dirname, 'docs/script')}`,
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				use: {
					loader: 'ts-loader',
					options: {
						configFile: 'docs/script/tsconfig.json',
					},
				},
			},
		],
	},
	resolve: {
		extensions: ['.ts'],
	},
	devtool: 'hidden-source-map',
};
