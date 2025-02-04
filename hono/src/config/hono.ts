export default {
	extension: {
		html: '.html',
		json: '.json',
		brotli: '.br',
		map: '.map',
	},
	response: {
		header: {
			hsts: 'max-age=31536000',
			csp: {
				'frame-ancestors': ["'self'"],
				'report-uri': ['https://report.w0s.jp/report/csp'],
				'report-to': ['default'],
			},
			cspHtml: {
				'base-uri': ["'none'"],
				'form-action': ["'self'", 'https://www.google.com'],
				'frame-ancestors': ["'self'"],
				'report-uri': ['https://report.w0s.jp/report/csp'],
				'report-to': ['default'],
			},
			csproHtml: {
				'default-src': ["'self'"],
				'connect-src': [
					"'self'",
					'https://w0s.jp',
					'https://*.w0s.jp',
					'https://pagead2.googlesyndication.com',
					'https://csi.gstatic.com',
					'https://ep1.adtrafficquality.google',
				],
				'font-src': ["'self'", 'data:'],
				'frame-src': [
					"'self'",
					'https://www.youtube-nocookie.com',
					'https://www.google.com',
					'https://tpc.googlesyndication.com',
					'https://googleads.g.doubleclick.net',
					'https://ep2.adtrafficquality.google',
				],
				'img-src': [
					"'self'",
					'data:',
					'https://media.w0s.jp',
					'https://m.media-amazon.com',
					'https://*.ytimg.com',
					'https://pagead2.googlesyndication.com',
					'https://ep1.adtrafficquality.google',
				],
				'media-src': ["'self'", 'https://media.w0s.jp'],
				'script-src-elem': [
					"'self'",
					'https://analytics.w0s.jp',
					'https://pagead2.googlesyndication.com',
					'https://tpc.googlesyndication.com',
					'https://ep2.adtrafficquality.google',
				],
				'style-src': ["'self'", "'unsafe-inline'"],
				'trusted-types': ['default', 'goog#html', 'google#safe', "'allow-duplicates'"],
				'require-trusted-types-for': ["'script'"],
				'report-uri': ['https://report.w0s.jp/report/csp'],
				'report-to': ['default'],
			},
			reportingEndpoints: {
				default: 'https://report.w0s.jp/report/csp',
			},
		},
		compression: {
			threshold: 512,
		},
	},
	static: {
		root: '../public',
		index: 'index.html',
		extensions: ['.html', '.atom'], // URL 上で省略できる拡張子
		headers: {
			mimeType: {
				extension: {
					'.atom': 'application/atom+xml;charset=utf-8',
					'.json': 'application/json',
					'.map': 'application/octet-stream',
					'.xml': 'application/xml;charset=utf-8',
					'.jpg': 'image/jpeg',
					'.jpeg': 'image/jpeg',
					'.png': 'image/png',
					'.svg': 'image/svg+xml;charset=utf-8',
					'.webp': 'image/webp',
					'.css': 'text/css;charset=utf-8',
					'.html': 'text/html;charset=utf-8',
					'.js': 'text/javascript;charset=utf-8',
					'.mjs': 'text/javascript;charset=utf-8',
					'.txt': 'text/plain;charset=utf-8',
				},
			}, // TODO: 未使用
			cacheControl: {
				default: 'max-age=600',
				path: [
					{
						paths: ['/favicon.ico'],
						value: 'max-age=604800',
					},
				],
				extension: [
					{
						extensions: ['.webp', '.jpg', '.jpeg', '.png', '.svg'],
						value: 'max-age=3600',
					},
					{
						extensions: ['.map'],
						value: 'no-cache',
					},
				],
			},
			sourceMap: {
				extensions: ['.js', '.mjs'],
			},
		},
	},
	basicAuth: {
		unauthorizedMessage: 'Unauthorized',
	},
	cacheControl: 'max-age=600',
	errorpage: {
		path401: '../errorpage/401.html',
		path403: '../errorpage/403.html',
		path404: '../errorpage/404.html',
		path500: '../errorpage/500.html',
	},
	sidebar: {
		newly: {
			maximumNumber: 8,
		},
	},
};
