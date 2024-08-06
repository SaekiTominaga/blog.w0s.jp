export const config = {
	lang: 'ja',
	headingDepthLimit: 2,
	amazonTrackingId: 'w0s.jp-22',
	linkHostIcon: [
		{
			host: 'bsky.app',
			alt: 'Bluesky',
			fileName: 'bluesky.png',
		},
		{
			host: 'x.com',
			alt: 'X',
			fileName: 'x.png',
		},
		{
			host: 'twitter.com',
			alt: 'X',
			fileName: 'x.png',
		},
		{
			host: 'www.instagram.com',
			alt: 'Instagram',
			fileName: 'instagram.png',
		},
		{
			host: 'www.youtube.com',
			alt: 'YouTube',
			fileName: 'youtube.svg',
		},
		{
			host: 'www.nicovideo.jp',
			alt: 'ニコニコ動画',
			fileName: 'nicovideo.png',
		},
		{
			host: 'www.amazon.co.jp',
			alt: 'Amazon',
			fileName: 'amazon.png',
		},
		{
			host: 'ja.wikipedia.org',
			alt: 'Wikipedia',
			fileName: 'wikipedia.svg',
		},
		{
			host: 'github.com',
			alt: 'GitHub',
			fileName: 'github.svg',
		},
		{
			host: 'www.w3.org',
			alt: 'W3C',
			fileName: 'w3c.png',
		},
		{
			host: 'html.spec.whatwg.org',
			alt: 'WHATWG',
			fileName: 'whatwg.svg',
		},
		{
			host: 'caniuse.com',
			alt: 'Can I use...',
			fileName: 'caniuse.png',
		},
	],
	codeLanguages: [
		'arduino',
		'ino',
		'bash',
		'sh',
		'c',
		'h',
		'cpp',
		'cc',
		'c++',
		'h++',
		'hpp',
		'hh',
		'hxx',
		'cxx',
		'csharp',
		'cs',
		'c#',
		'css',
		'diff',
		'patch',
		'go',
		'golang',
		'graphql',
		'gql',
		'ini',
		'toml',
		'java',
		'jsp',
		'javascript',
		'js',
		'jsx',
		'mjs',
		'cjs',
		'json',
		'kotlin',
		'kt',
		'kts',
		'less',
		'lua',
		'makefile',
		'mk',
		'mak',
		'make',
		'markdown',
		'md',
		'mkdown',
		'mkd',
		'objectivec',
		'mm',
		'objc',
		'obj-c',
		'obj-c++',
		'objective-c++',
		'perl',
		'pl',
		'pm',
		'php',
		'php-template',
		'plaintext',
		'text',
		'txt',
		'python',
		'py',
		'gyp',
		'ipython',
		'python-repl',
		'pycon',
		'r',
		'ruby',
		'rb',
		'gemspec',
		'podspec',
		'thor',
		'irb',
		'rust',
		'rs',
		'scss',
		'shell',
		'console',
		'shellsession',
		'sql',
		'swift',
		'typescript',
		'ts',
		'tsx',
		'mts',
		'cts',
		'vbnet',
		'vb',
		'wasm',
		'xml',
		'html',
		'xhtml',
		'rss',
		'atom',
		'xjb',
		'xsd',
		'xsl',
		'plist',
		'wsf',
		'svg',
		'yaml',
		'yml',
	], // https://github.com/wooorm/lowlight#data
};

export const regexp = {
	lang: '[a-z]{2}',
	absoluteUrl: "https?://[-_.!~*'()a-zA-Z0-9;/?:@&=+$,%#]+",
	isbn: '(978|979)-[0-9]{1,5}-[0-9]{1,7}-[0-9]{1,7}-[0-9]|[0-9]{1,5}-[0-9]{1,7}-[0-9]{1,7}-[0-9X]',
	entryId: '[1-9][0-9]*',
	footnoteId: '[a-zA-Z0-9-_]+',
	asin: '[0-9A-Z]{10}',
	amazonImageId: '[a-zA-Z0-9-_+%]+',
	youtubeId: '[a-zA-Z0-9-_]+',
};
