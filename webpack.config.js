import path from 'path';
import url from 'url';

const dirname = path.dirname(url.fileURLToPath(import.meta.url));

export default {
	entry: {
		'trusted-types.js': './public/script/_src/trusted-types.ts',
		'analytics.js': './public/script/_src/analytics.ts',
		'google-analytics.js': './public/script/_src/google-analytics.ts',
		'blog.mjs': './public/script/_src/blog.ts',
		'error.mjs': './public/script/_src/error.ts',
		'admin.mjs': './public/script/_src/admin.ts',
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
