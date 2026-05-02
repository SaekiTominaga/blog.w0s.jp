import path from 'node:path';
import type { ElementContent, Properties } from 'hast';
import type { Root } from 'mdast';
import type { State } from 'mdast-util-to-hast';
import PaapiItemImageUrlParser from '@w0s/paapi-item-image-url-parser';
import type { AmazonImage, Dimensions } from '../../toMdast/block/paragraphRoot.ts';
import config from '../../config.ts';

/**
 * Embedded content
 */

interface XEmbeddedMedia extends Root {
	filename: string;
	dimensions: Dimensions | undefined;
}

interface XEmbeddedYouTube {
	id: string;
	title: string;
	dimensions: Dimensions | undefined;
	start: number | undefined;
	end: number | undefined;
}

interface XEmbeddedAmazon {
	asin: string;
	title: string;
	image: AmazonImage | undefined;
}

const IMAGE_MAX_DIMENSIONS = { width: 640, height: 480 };
const YOUTUBE_BASE_DIMENSIONS = { width: 640, height: 360 };
const AMAZON_IMAGE_DIMENSIONS = 160;

export const xEmbeddedMediaToHast = (state: State, node: XEmbeddedMedia): ElementContent | ElementContent[] | undefined => {
	const { filename, dimensions } = node;

	const extension = path.extname(filename);

	const media: ElementContent[] = [];
	switch (extension) {
		case '.jpg':
		case '.jpeg':
		case '.png': {
			let width = dimensions?.width;
			let height = dimensions?.height;
			if (dimensions !== undefined) {
				/* ThumbImageUtil.getThumbSize() と同一の処理 */
				if (IMAGE_MAX_DIMENSIONS.width < dimensions.width || IMAGE_MAX_DIMENSIONS.height < dimensions.height) {
					const reductionRatio = Math.min(IMAGE_MAX_DIMENSIONS.width / dimensions.width, IMAGE_MAX_DIMENSIONS.height / dimensions.height);

					width = Math.round(dimensions.width * reductionRatio);
					height = Math.round(dimensions.height * reductionRatio);
				}
			}

			media.push({
				type: 'element',
				tagName: 'img',
				properties: {
					src: `/entry/image/thumb/${filename}@d=${String(IMAGE_MAX_DIMENSIONS.width)}x${String(IMAGE_MAX_DIMENSIONS.height)};q=60.avif`,
					srcset: `/entry/image/thumb/${filename}@d=${String(IMAGE_MAX_DIMENSIONS.width * 2)}x${String(IMAGE_MAX_DIMENSIONS.height * 2)};q=30.avif 2x`,
					alt: 'サムネイル画像',
					width: width,
					height: height,
					className: ['p-embed__image'],
				},
				children: [],
			});
			break;
		}
		case '.svg': {
			media.push({
				type: 'element',
				tagName: 'img',
				properties: {
					src: `/entry/image/${filename}`,
					alt: '画像',
					width: dimensions?.width,
					height: dimensions?.height,
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
					src: `/entry/video/${filename}`,
					controls: true,
					width: dimensions?.width,
					height: dimensions?.height,
					className: ['p-embed__video'],
				},
				children: [],
			});
			break;
		}
		default:
	}

	const caption: ElementContent[] = [
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
					href: `/entry/image/${filename}`,
					class: 'c-caption__media-expansion',
				},
				children: [
					{
						type: 'element',
						tagName: 'img',
						properties: {
							src: '/image/media-expansion.svg',
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
		properties: {},
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

export const xEmbeddedYouTubeToHast = (_state: State, node: XEmbeddedYouTube): ElementContent | ElementContent[] | undefined => {
	const { id, title, dimensions, start, end } = node;

	const width = dimensions?.width ?? YOUTUBE_BASE_DIMENSIONS.width;
	const height = dimensions?.height ?? YOUTUBE_BASE_DIMENSIONS.height;

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
		properties: {},
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

export const xEmbeddedAmazonToHast = (_state: State, node: XEmbeddedAmazon): ElementContent | ElementContent[] | undefined => {
	const { asin, title, image } = node;

	const imageElementProperties: Properties = {};
	if (image !== undefined) {
		const paapi5ItemImageUrlParser = new PaapiItemImageUrlParser(new URL(`https://m.media-amazon.com/images/I/${image.id}.jpg`));
		paapi5ItemImageUrlParser.setSize(AMAZON_IMAGE_DIMENSIONS);

		const url1x = paapi5ItemImageUrlParser.getURL();
		paapi5ItemImageUrlParser.setSizeMultiply(2);
		const url2x = paapi5ItemImageUrlParser.getURL();

		imageElementProperties['src'] = url1x.toString();
		imageElementProperties['srcset'] = `${url2x.toString()} 2x`;
		imageElementProperties['alt'] = '';

		if (image.dimensions !== undefined) {
			let width: number;
			let height: number;
			if (image.dimensions.width > image.dimensions.height) {
				width = AMAZON_IMAGE_DIMENSIONS;
				height = Math.round((image.dimensions.height * AMAZON_IMAGE_DIMENSIONS) / image.dimensions.width);
			} else {
				width = Math.round((image.dimensions.width * AMAZON_IMAGE_DIMENSIONS) / image.dimensions.height);
				height = AMAZON_IMAGE_DIMENSIONS;
			}

			imageElementProperties['width'] = String(width);
			imageElementProperties['height'] = String(height);
		}
	} else {
		imageElementProperties['src'] = '/image/amazon-noimage.svg';
		imageElementProperties['alt'] = '';
		imageElementProperties['width'] = '113';
		imageElementProperties['height'] = '160';
	}
	imageElementProperties['className'] = ['p-amazon__image'];

	return {
		type: 'element',
		tagName: 'div',
		properties: {
			className: ['p-amazon'],
		},
		children: [
			{
				type: 'element',
				tagName: 'div',
				properties: {
					className: ['p-amazon__label'],
				},
				children: [
					{
						type: 'element',
						tagName: 'img',
						properties: {
							src: '/image/amazon-buy.png',
							srcset: '/image/amazon-buy@2x.png 2x',
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
				tagName: 'p',
				properties: {
					className: ['p-amazon__item'],
				},
				children: [
					{
						type: 'element',
						tagName: 'a',
						properties: {
							href: `https://www.amazon.co.jp/dp/${asin}/ref=nosim?tag=${config.amazonTrackingId}`, // https://affiliate-program.amazon.com/help/node/topic/GP38PJ6EUR6PFBEC
						},
						children: [
							{
								type: 'element',
								tagName: 'span',
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
								tagName: 'span',
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
};
