import type { Heading } from 'mdast';

export default {
	lang: 'ja',
	regexp: {
		lang: '[a-z]{2}',
		absoluteUrl: "https?:\\/\\/[\\-_.!~*'\\(\\)a-zA-Z0-9;\\/?:@&=+$,%#]+",
		isbn: '(978|979)-[0-9]{1,5}-[0-9]{1,7}-[0-9]{1,7}-[0-9]|[0-9]{1,5}-[0-9]{1,7}-[0-9]{1,7}-[0-9X]',
		entryId: '[1-9][0-9]*',
		footnoteId: '[a-zA-Z0-9\\-_]+',
		asin: '[0-9A-Z]{10}',
		amazonImageId: '[a-zA-Z0-9\\-_+%]+',
		youtubeId: '[a-zA-Z0-9\\-_]+',
	},
	headingDepthLimit: 2 as Heading['depth'],
	linkHostIcon: [
		{
			host: 'bsky.app',
			alt: 'Bluesky',
			fileName: 'bluesky.svg',
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
	amazonTrackingId: 'w0s.jp-22',
	codeLanguages: [
		'css', // ✅
		'diff', // ✅
		'http',
		'javascript', // ✅
		'json', // ✅
		'markdown', // ✅
		'typescript', // ✅
		'xml', // ✅
		'html', // ✅
	], // `common` にないものは Markdown.ts における `rehype-highlight` の読み込み時に登録作業が必要 https://github.com/wooorm/lowlight#data
};
