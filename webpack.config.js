import path from 'path';
import url from 'url';

const dirname = path.dirname(url.fileURLToPath(import.meta.url));

export default {
	entry: {
		'blog.mjs': './public/script/_src/blog.ts',
		'admin.mjs': './public/script/_src/admin.ts',
		'error.mjs': './public/script/_src/error.ts',
		'google-analytics.js': './public/script/_src/google-analytics.ts',
		'trusted-types.js': './public/script/_src/trusted-types.ts',
	},
	mode: 'production',
	output: {
		filename: '[name]',
		path: `${path.resolve(dirname, 'public/script')}`,
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				use: {
					loader: 'ts-loader',
					options: {
						configFile: 'public/script/tsconfig.json',
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
