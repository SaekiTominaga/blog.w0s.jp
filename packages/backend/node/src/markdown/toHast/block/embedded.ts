import path from 'node:path';
import type { Properties } from 'hast-util-select/lib/types.js';
import type { H } from 'mdast-util-to-hast';
import type { HastElement, HastElementContent } from 'mdast-util-to-hast/lib/state.js';
import PaapiItemImageUrlParser from '@saekitominaga/paapi-item-image-url-parser';
import type { XMediaItem, XAmazonItem, XYouTubeItem } from '../../toMdast/block/embedded.js';
import { config } from '../../config.js';

/**
 * Embedded content
 */

interface XEmbeddedMedia {
	children: XMediaItem[];
}

interface XEmbeddedYouTube {
	children: XYouTubeItem[];
}

interface XEmbeddedAmazon {
	children: XAmazonItem[];
}

const IMAGE_MAX_SIZE = { width: 640, height: 480 };
const YOUTUBE_BASE_SIZE = { width: 640, height: 360 };
const AMAZON_IMAGE_SIZE = 160;

export const xEmbeddedMediaToHast = (_state: H, node: XEmbeddedMedia): HastElementContent | HastElementContent[] | null | undefined => {
	const items = node.children.map((item): HastElement => {
		const { filename, title } = item;

		let media: HastElementContent;
		switch (path.extname(filename)) {
			case '.jpg':
			case '.jpeg':
			case '.png': {
				media = {
					type: 'element',
					tagName: 'a',
					properties: {
						href: `https://media.w0s.jp/image/blog/${filename}`,
					},
					children: [
						{
							type: 'element',
							tagName: 'picture',
							children: [
								{
									type: 'element',
									tagName: 'source',
									properties: {
										type: 'image/avif',
										srcset: `https://media.w0s.jp/thumbimage/blog/${filename}?type=avif;w=${IMAGE_MAX_SIZE.width};h=${
											IMAGE_MAX_SIZE.height
										};quality=60, https://media.w0s.jp/thumbimage/blog/${filename}?type=avif;w=${IMAGE_MAX_SIZE.width * 2};h=${
											IMAGE_MAX_SIZE.height * 2
										};quality=30 2x`,
									},
									children: [],
								},
								{
									type: 'element',
									tagName: 'source',
									properties: {
										type: 'image/webp',
										srcset: `https://media.w0s.jp/thumbimage/blog/${filename}?type=webp;w=${IMAGE_MAX_SIZE.width};h=${
											IMAGE_MAX_SIZE.height
										};quality=60, https://media.w0s.jp/thumbimage/blog/${filename}?type=webp;w=${IMAGE_MAX_SIZE.width * 2};h=${
											IMAGE_MAX_SIZE.height * 2
										};quality=30 2x`,
									},
									children: [],
								},
								{
									type: 'element',
									tagName: 'img',
									properties: {
										src: `https://media.w0s.jp/thumbimage/blog/${filename}?type=jpeg;w=${IMAGE_MAX_SIZE.width};h=${IMAGE_MAX_SIZE.height};quality=60`,
										alt: 'オリジナル画像',
										className: ['p-embed__image'],
									},
									children: [],
								},
							],
						},
					],
				};
				break;
			}
			case '.svg': {
				media = {
					type: 'element',
					tagName: 'img',
					properties: {
						src: `https://media.w0s.jp/image/blog/${filename}`,
						alt: '',
						className: ['p-embed__image'],
					},
					children: [],
				};
				break;
			}
			case '.mp4': {
				media = {
					type: 'element',
					tagName: 'video',
					properties: {
						src: `https://media.w0s.jp/video/blog/${filename}`,
						controls: true,
						className: ['p-embed__video'],
					},
					children: [],
				};
				break;
			}
			default:
				media = {
					type: 'text',
					value: '',
				};
		}

		return {
			type: 'element',
			tagName: 'figure',
			children: [
				{
					type: 'element',
					tagName: 'div',
					properties: {
						className: ['p-embed'],
					},
					children: [media],
				},
				{
					type: 'element',
					tagName: 'figcaption',
					properties: {
						className: ['c-caption'],
					},
					children: [
						{
							type: 'text',
							value: title,
						},
					],
				},
			],
		};
	});

	return items;
};

export const xEmbeddedYouTubeToHast = (_state: H, node: XEmbeddedYouTube): HastElementContent | HastElementContent[] | null | undefined => {
	const items = node.children.map((item): HastElement => {
		const { id, title, size, start } = item;

		const width = size?.width ?? YOUTUBE_BASE_SIZE.width;
		const height = size?.height ?? YOUTUBE_BASE_SIZE.height;

		const embeddedSearchParams = new URLSearchParams();
		embeddedSearchParams.set('cc_load_policy', '1');
		if (start !== undefined && start > 1) {
			embeddedSearchParams.set('start', String(start));
		}

		const linkSearchParams = new URLSearchParams();
		linkSearchParams.set('v', id);
		if (start !== undefined && start > 1) {
			linkSearchParams.set('t', `${start}s`);
		}

		return {
			type: 'element',
			tagName: 'figure',
			children: [
				{
					type: 'element',
					tagName: 'div',
					properties: {
						className: ['p-embed'],
					},
					children: [
						{
							type: 'element',
							tagName: 'iframe',
							properties: {
								src: `https://www.youtube-nocookie.com/embed/${id}?${embeddedSearchParams.toString()}`, // https://support.google.com/youtube/answer/171780
								allow: 'encrypted-media;fullscreen;gyroscope;picture-in-picture',
								title: 'YouTube 動画',
								width: String(width),
								height: String(height),
								className: ['p-embed__frame'],
								style: `--aspect-ratio:${width}/${height}`,
							},
							children: [
								{
									type: 'text',
									value: '',
								},
							],
						},
					],
				},
				{
					type: 'element',
					tagName: 'figcaption',
					properties: {
						className: ['c-caption'],
					},
					children: [
						{
							type: 'element',
							tagName: 'a',
							properties: {
								href: `https://www.youtube.com/watch?${linkSearchParams.toString()}`,
							},
							children: [
								{
									type: 'text',
									value: title,
								},
							],
						},
						{
							type: 'element',
							tagName: 'img',
							properties: {
								src: '/image/icon/youtube.svg',
								alt: '(YouTube)',
								width: '16',
								height: '16',
								className: ['c-link-icon'],
							},
							children: [],
						},
					],
				},
			],
		};
	});

	return items;
};

export const xEmbeddedAmazonToHast = (_state: H, node: XEmbeddedAmazon): HastElementContent | HastElementContent[] | null | undefined => {
	const items = node.children.map((item): HastElement => {
		const { asin, title, image } = item;

		const imageElementProperties: Properties = {};
		if (image !== undefined) {
			const paapi5ItemImageUrlParser = new PaapiItemImageUrlParser(new URL(`https://m.media-amazon.com/images/I/${image.id}.jpg`));
			paapi5ItemImageUrlParser.setSize(AMAZON_IMAGE_SIZE);

			const url = paapi5ItemImageUrlParser.toString();
			paapi5ItemImageUrlParser.setSizeMultiply(2);
			const url2x = paapi5ItemImageUrlParser.toString();

			imageElementProperties['src'] = url;
			imageElementProperties['srcset'] = `${url2x} 2x`;
			imageElementProperties['alt'] = '';

			if (image.size !== undefined) {
				let width: number;
				let height: number;
				if (image.size.width > image.size.height) {
					width = AMAZON_IMAGE_SIZE;
					height = Math.round((image.size.height * AMAZON_IMAGE_SIZE) / image.size.width);
				} else {
					width = Math.round((image.size.width * AMAZON_IMAGE_SIZE) / image.size.height);
					height = AMAZON_IMAGE_SIZE;
				}

				imageElementProperties['width'] = String(width);
				imageElementProperties['height'] = String(height);
			}
		} else {
			imageElementProperties['src'] = '/image/entry/amazon-noimage.svg';
			imageElementProperties['alt'] = '';
			imageElementProperties['width'] = '113';
			imageElementProperties['height'] = '160';
		}
		imageElementProperties['className'] = ['p-amazon__image'];

		return {
			type: 'element',
			tagName: 'li',
			children: [
				{
					type: 'element',
					tagName: 'a',
					properties: {
						className: ['p-amazon__link'],
						href: `https://www.amazon.co.jp/dp/${asin}/ref=nosim?tag=${config.amazonTrackingId}`, // https://affiliate-program.amazon.com/help/node/topic/GP38PJ6EUR6PFBEC
					},
					children: [
						{
							type: 'element',
							tagName: 'div',
							properties: {
								className: ['p-amazon__thumb'],
							},
							children: [
								{
									type: 'element',
									tagName: 'img',
									properties: imageElementProperties,
									children: [],
								},
							],
						},
						{
							type: 'element',
							tagName: 'div',
							properties: {
								className: ['p-amazon__text'],
							},
							children: [
								{
									type: 'element',
									tagName: 'p',
									properties: {
										className: ['p-amazon__title'],
									},
									children: [
										{
											type: 'text',
											value: title,
										},
									],
								},
							],
						},
					],
				},
			],
		};
	});

	return {
		type: 'element',
		tagName: 'aside',
		properties: {
			className: ['p-amazon'],
		},
		children: [
			{
				type: 'element',
				tagName: 'h2',
				properties: {
					className: ['p-amazon__hdg'],
				},
				children: [
					{
						type: 'element',
						tagName: 'img',
						properties: {
							src: '/image/entry/amazon-buy.png',
							srcset: '/image/entry/amazon-buy@2x.png 2x',
							alt: 'Amazon で買う',
							width: '127',
							height: '26',
						},
						children: [],
					},
				],
			},
			{
				type: 'element',
				tagName: 'ul',
				properties: {
					className: ['p-amazon__list'],
				},
				children: items,
			},
		],
	};
};
