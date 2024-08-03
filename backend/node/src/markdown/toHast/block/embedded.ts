import path from 'node:path';
import type { Properties } from 'hast-util-select/lib/types.js';
import type { Root } from 'mdast';
import type { H } from 'mdast-util-to-hast';
import type { HastElement, HastElementContent } from 'mdast-util-to-hast/lib/state.js';
import PaapiItemImageUrlParser from '@w0s/paapi-item-image-url-parser';
import type { AmazonImage, Size } from '../../toMdast/block/embedded.js';
import { config } from '../../config.js';

/**
 * Embedded content
 */

interface XEmbeddedMedia extends Root {
	filename: string;
	size: Size | undefined;
}

interface XEmbeddedYouTube {
	id: string;
	title: string;
	size: Size | undefined;
	start: number | undefined;
	end: number | undefined;
}

interface XAmazonItem {
	asin: string;
	title: string;
	image: AmazonImage | undefined;
}

interface XEmbeddedAmazon {
	children: XAmazonItem[];
}

const IMAGE_MAX_SIZE = { width: 640, height: 480 };
const YOUTUBE_BASE_SIZE = { width: 640, height: 360 };
const AMAZON_IMAGE_SIZE = 160;

export const xEmbeddedMediaToHast = (state: H, node: XEmbeddedMedia): HastElementContent | HastElementContent[] | null | undefined => {
	const { filename, size } = node;

	const extension = path.extname(filename);

	const media: HastElementContent[] = [];
	switch (extension) {
		case '.jpg':
		case '.jpeg':
		case '.png': {
			let width = size?.width;
			let height = size?.height;
			if (size !== undefined) {
				/* ThumbImageUtil.getThumbSize() と同一の処理 */
				if (IMAGE_MAX_SIZE.width < size.width || IMAGE_MAX_SIZE.height < size.height) {
					const reductionRatio = Math.min(IMAGE_MAX_SIZE.width / size.width, IMAGE_MAX_SIZE.height / size.height);

					width = Math.round(size.width * reductionRatio);
					height = Math.round(size.height * reductionRatio);
				}
			}

			media.push({
				type: 'element',
				tagName: 'picture',
				children: [
					{
						type: 'element',
						tagName: 'source',
						properties: {
							type: 'image/avif',
							srcset: `https://media.w0s.jp/thumbimage/blog/${filename}?type=avif;w=${String(IMAGE_MAX_SIZE.width)};h=${String(
								IMAGE_MAX_SIZE.height,
							)};quality=60, https://media.w0s.jp/thumbimage/blog/${filename}?type=avif;w=${String(IMAGE_MAX_SIZE.width * 2)};h=${String(
								IMAGE_MAX_SIZE.height * 2,
							)};quality=30 2x`,
						},
						children: [],
					},
					{
						type: 'element',
						tagName: 'source',
						properties: {
							type: 'image/webp',
							srcset: `https://media.w0s.jp/thumbimage/blog/${filename}?type=webp;w=${String(IMAGE_MAX_SIZE.width)};h=${String(
								IMAGE_MAX_SIZE.height,
							)};quality=60, https://media.w0s.jp/thumbimage/blog/${filename}?type=webp;w=${String(IMAGE_MAX_SIZE.width * 2)};h=${String(
								IMAGE_MAX_SIZE.height * 2,
							)};quality=30 2x`,
						},
						children: [],
					},
					{
						type: 'element',
						tagName: 'img',
						properties: {
							src: `https://media.w0s.jp/thumbimage/blog/${filename}?type=jpeg;w=${String(IMAGE_MAX_SIZE.width)};h=${String(IMAGE_MAX_SIZE.height)};quality=60`,
							alt: '',
							width: width,
							height: height,
							crossorigin: '',
							className: ['p-embed__image'],
						},
						children: [],
					},
				],
			});
			break;
		}
		case '.svg': {
			media.push({
				type: 'element',
				tagName: 'img',
				properties: {
					src: `https://media.w0s.jp/image/blog/${filename}`,
					alt: '',
					width: size?.width,
					height: size?.height,
					className: ['p-embed__image'],
				},
				children: [],
			});
			break;
		}
		case '.mp4': {
			media.push({
				type: 'element',
				tagName: 'video',
				properties: {
					src: `https://media.w0s.jp/video/blog/${filename}`,
					controls: true,
					width: size?.width,
					height: size?.height,
					className: ['p-embed__video'],
				},
				children: [],
			});
			break;
		}
		default:
	}

	const caption: HastElementContent[] = [
		{
			type: 'element',
			tagName: 'span',
			properties: {
				class: 'c-caption__text',
			},
			children: state.all(node),
		},
	];
	switch (extension) {
		case '.jpg':
		case '.jpeg':
		case '.png': {
			caption.push({
				type: 'element',
				tagName: 'a',
				properties: {
					href: `https://media.w0s.jp/image/blog/${filename}`,
					class: 'c-caption__media-expansion',
				},
				children: [
					{
						type: 'element',
						tagName: 'img',
						properties: {
							src: '/image/entry/media-expansion.svg',
							alt: '',
							width: '16',
							height: '16',
						},
						children: [],
					},
					{
						type: 'text',
						value: 'オリジナル画像',
					},
				],
			});
			break;
		}
		default:
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
				children: media,
			},
			{
				type: 'element',
				tagName: 'figcaption',
				properties: {
					className: ['c-caption'],
				},
				children: caption,
			},
		],
	};
};

export const xEmbeddedYouTubeToHast = (_state: H, node: XEmbeddedYouTube): HastElementContent | HastElementContent[] | null | undefined => {
	const { id, title, size, start, end } = node;

	const width = size?.width ?? YOUTUBE_BASE_SIZE.width;
	const height = size?.height ?? YOUTUBE_BASE_SIZE.height;

	const embeddedSearchParams = new URLSearchParams(); // https://developers.google.com/youtube/player_parameters?hl=ja#Parameters
	embeddedSearchParams.set('cc_load_policy', '1');

	const linkSearchParams = new URLSearchParams();
	linkSearchParams.set('v', id);

	if (start !== undefined && start >= 1) {
		embeddedSearchParams.set('start', String(start));
		linkSearchParams.set('t', `${String(start)}s`);
	}

	if (end !== undefined && end >= 1) {
		embeddedSearchParams.set('end', String(end));
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
							width: width,
							height: height,
							className: ['p-embed__frame'],
							style: `--aspect-ratio:${String(width)}/${String(height)}`,
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
						tagName: 'span',
						properties: {
							class: 'c-caption__text',
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
								tagName: 'small',
								properties: {
									className: 'c-domain',
								},
								children: [
									{
										type: 'element',
										tagName: 'img',
										properties: {
											src: '/image/icon/youtube.svg',
											alt: '(YouTube)',
											width: '16',
											height: '16',
										},
										children: [],
									},
								],
							},
						],
					},
				],
			},
		],
	};
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
		tagName: 'div',
		properties: {
			className: ['p-amazon'],
		},
		children: [
			{
				type: 'element',
				tagName: 'p',
				properties: {
					className: ['p-amazon__label'],
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
