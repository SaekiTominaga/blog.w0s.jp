export const config = {
	sectionIdPrefix: 'section-',
	amazonTrackingId: 'w0s.jp-22',
	linkHostIcon: [
		{
			host: 'github.com',
			alt: 'GitHub',
			fileName: 'github.svg',
		},
		{
			host: 'twitter.com',
			alt: 'Twitter',
			fileName: 'twitter.svg',
		},
		{
			host: 'www.youtube.com',
			alt: 'YouTube',
			fileName: 'youtube.svg',
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
};

export const regexp = {
	lang: '[a-z]{2}',
	absoluteUrl: "https?://[-_.!~*'()a-zA-Z0-9;/?:@&=+$,%#]+",
	isbn: '(978|979)-[0-9]{1,5}-[0-9]{1,7}-[0-9]{1,7}-[0-9]|[0-9]{1,5}-[0-9]{1,7}-[0-9]{1,7}-[0-9X]',
	entryId: '[1-9][0-9]*',
	footnoteId: '[-_a-zA-Z0-9]+',
	asin: '[0-9A-Z]{10}',
	youtubeId: '[-_a-zA-Z0-9]+',
	tweetId: '[1-9][0-9]*',
};
