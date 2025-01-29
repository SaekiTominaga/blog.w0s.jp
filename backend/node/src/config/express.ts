export default {
	origin: 'https://blog.w0s.jp',
	extension: {
		html: '.html',
		json: '.json',
		brotli: '.br',
		map: '.map',
	},
	request: {
		urlencoded: {
			limit: '1mb',
		},
	},
	response: {
		header: {
			hsts: 'max-age=31536000',
			csp: "frame-ancestors 'self'; report-uri https://report.w0s.jp/report/csp report-to default",
			csp_html:
				"base-uri 'none'; form-action 'self' https://www.google.com; frame-ancestors 'self'; report-uri https://report.w0s.jp/report/csp report-to default",
			cspro_html:
				"default-src 'self'; connect-src 'self' https://w0s.jp https://*.w0s.jp https://pagead2.googlesyndication.com https://csi.gstatic.com https://ep1.adtrafficquality.google; font-src 'self' data:; frame-src 'self' https://www.youtube-nocookie.com https://www.google.com https://tpc.googlesyndication.com https://googleads.g.doubleclick.net https://ep2.adtrafficquality.google; img-src 'self' data: https://media.w0s.jp https://m.media-amazon.com https://*.ytimg.com https://pagead2.googlesyndication.com https://ep1.adtrafficquality.google; media-src 'self' https://media.w0s.jp; script-src-elem 'self' https://analytics.w0s.jp https://pagead2.googlesyndication.com https://tpc.googlesyndication.com https://ep2.adtrafficquality.google; style-src 'self' 'unsafe-inline'; trusted-types default goog#html google#safe dompurify 'allow-duplicates'; require-trusted-types-for 'script'; report-uri https://report.w0s.jp/report/csp; report-to default",
			reporting_endpoints: {
				default: 'https://report.w0s.jp/report/csp',
			},
		},
		compression: {
			threshold: '512',
		},
	},
	static: {
		root: '../frontend/public',
		extensions: ['.html', '.atom'],
		indexes: ['index.html'],
		headers: {
			mime_type: {
				path: {
					'/favicon.ico': 'image/svg+xml;charset=utf-8',
				},
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
			},
			cache_control: {
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
			cors: {
				directory: ['/json/'],
			},
			source_map: {
				extensions: ['.js', '.mjs'],
			},
		},
		auth_basic: [
			{
				urls: ['/admin/*'],
				realm: 'Admin',
				htpasswd: 'basic-admin.txt',
			},
		],
	},
	cache_control: 'max-age=600',
	errorpage: {
		path_401: 'errorpage/401.html',
		path_403: 'errorpage/403.html',
		path_404: 'errorpage/404.html',
		path_500: 'errorpage/500.html',
	},
	sidebar: {
		newly: {
			maximum_number: 8,
		},
	},
};
