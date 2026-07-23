interface HonoConfig {
	response: {
		header: {
			hsts: string;
			cacheControl: string;
			csp: Record<string, string[]>;
			cspHtml: Record<string, string[]>;
			csproHtml: Record<string, string[]>;
			reportingEndpoints: Record<string, string>;
		};
		compression: {
			threshold: number;
		};
	};
	static: {
		root: string;
		index: string;
		extensions: string[];
		headers: {
			contentType: {
				path: Record<string, string>;
				extension: Record<string, string>;
			};
			cacheControl: {
				default: string;
				path?: {
					paths: string[];
					value: string;
				}[];
				extension: {
					extensions: string[];
					value: string;
				}[];
			};
			sourceMap: string[];
		};
	};
	basicAuth: {
		paths: string[];
		realm: string;
		env: string;
	}[];
	redirect: {
		from: string;
		to: string;
	}[];
	errorpage: {
		unauthorized: string;
		notfound: string;
		clientError: string;
		serverError: string;
	};
	api: {
		dir: string;
		allowMethods: string[];
	};
	sidebar: {
		newly: {
			maximumNumber: number;
		};
	};
}

const config: HonoConfig = {
	response: {
		header: {
			hsts: 'max-age=31536000',
			cacheControl: 'max-age=600',
			csp: {
				'frame-ancestors': ["'self'"],
				'report-uri': ['https://report.w0s.jp/report/csp'],
				'report-to': ['default'],
			},
			cspHtml: {
				'base-uri': ["'none'"],
				'form-action': ["'self'", 'https://www.google.com', 'https://www.bing.com', 'https://search.yahoo.co.jp', 'https://duckduckgo.com'],
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
					'https://m.media-amazon.com',
					'https://*.ytimg.com',
					'https://pagead2.googlesyndication.com',
					'https://ep1.adtrafficquality.google',
				],
				'media-src': ["'self'"],
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
			contentType: {
				path: {
					'/favicon.ico': 'image/svg+xml; charset=utf-8',
				},
				extension: {
					/* hono 公式で規定されていないもの https://github.com/honojs/hono/blob/main/src/utils/mime.ts */
					'.atom': 'application/atom+xml; charset=utf-8',
					'.map': 'application/octet-stream',
				},
			},
			cacheControl: {
				default: 'max-age=600', // 10分
				path: [
					{
						paths: ['/favicon.ico'],
						value: 'max-age=604800', // 1週間
					},
				],
				extension: [
					{
						extensions: ['.avif', '.webp', '.jpg', '.jpeg', '.png', '.svg', '.mp4'],
						value: 'max-age=3600', // 1時間
					},
					{
						extensions: ['.map'],
						value: 'no-cache',
					},
				],
			},
			sourceMap: ['.js', '.mjs'],
		},
	},
	basicAuth: [
		{
			paths: ['/admin/*', '/api/clear', '/api/media'],
			realm: 'Admin',
			env: 'AUTH_FILE_ADMIN',
		},
	],
	redirect: [
		{
			/* 2025-02-XX */
			from: '/:entryId{[1-9][0-9]{0,2}}',
			to: '/entry/$1',
		},
	],
	errorpage: {
		unauthorized: '401.html', // 401
		notfound: '404.html', // 404
		clientError: '4xx.html', // 4xx
		serverError: '5xx.html', // 5xx
	},
	api: {
		dir: 'api', // API を示すディレクトリ
		allowMethods: ['GET', 'POST'],
	},
	sidebar: {
		newly: {
			maximumNumber: 8,
		},
	},
} as const;

export default config;
