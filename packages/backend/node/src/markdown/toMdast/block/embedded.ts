import type { Paragraph } from 'mdast';
import { toString } from 'mdast-util-to-string';
import type { Plugin } from 'unified';
import type { Parent } from 'unist';
import { visit, CONTINUE } from 'unist-util-visit';
import { regexp } from '../../config.js';

/**
 * Embedded content
 */

export const nameMedia = 'x-embedded-media';
export const nameMediaItem = 'x-embedded-media-item';
export const nameAmazon = 'x-embedded-amazon';
export const nameAmazonItem = 'x-embedded-amazon-item';
export const nameYouTube = 'x-embedded-youtube';
export const nameYouTubeItem = 'x-embedded-youtube-item';

interface Size {
	width: number;
	height: number;
}

interface AmazonImage {
	id: string;
	size?: Size;
}

export interface XMediaItem {
	type: typeof nameMediaItem;
	filename: string;
	title: string;
}

export interface XAmazonItem {
	type: typeof nameAmazonItem;
	asin: string;
	title: string;
	image?: AmazonImage;
}

export interface XYouTubeItem {
	type: typeof nameYouTubeItem;
	id: string;
	title: string;
	size?: Size;
	start?: number;
}

interface XEmbeddedMedia extends Parent {
	type: typeof nameMedia;
	children: XMediaItem[];
}

interface XEmbeddedAmazon extends Parent {
	type: typeof nameAmazon;
	children: XAmazonItem[];
}

interface XEmbeddedYouTube extends Parent {
	type: typeof nameYouTube;
	children: XYouTubeItem[];
}

interface Structured {
	name: string;
	meta: {
		require: string;
		option: string | undefined;
	};
}

const toMdast = (): Plugin => {
	const EMBEDDED_START = '@';
	const SERVICE_AMAZON = 'amazon';
	const SERVICE_YOUTUBE = 'youtube';
	const NAME_META_SEPARATOR = ': ';
	const META_SEPARATOR = ' ';
	const OPTION_OPEN = ' <';
	const OPTION_CLOSE = '>';

	const parse = (value: string): Structured[] | null => {
		if (!value.startsWith(EMBEDDED_START)) {
			return null;
		}

		const structuredList: Structured[] = [];
		for (const line of value.split('\n')) {
			if (!line.startsWith(EMBEDDED_START)) {
				return null;
			}

			const nameMetaSeparatorIndex = line.indexOf(NAME_META_SEPARATOR);
			if (nameMetaSeparatorIndex === -1) {
				return null;
			}

			const name = line.substring(EMBEDDED_START.length, nameMetaSeparatorIndex);
			const meta = line.substring(nameMetaSeparatorIndex + NAME_META_SEPARATOR.length);

			const optionOpenIndex = meta.lastIndexOf(OPTION_OPEN);
			const optionCloseIndex = meta.lastIndexOf(OPTION_CLOSE);

			let require = meta;
			let option: string | undefined;
			if (optionOpenIndex !== -1 && optionCloseIndex === meta.length - OPTION_CLOSE.length) {
				require = meta.substring(0, optionOpenIndex);
				option = meta.substring(optionOpenIndex + OPTION_OPEN.length, meta.length - OPTION_CLOSE.length);
			}

			structuredList.push({
				name: name,
				meta: {
					require: require,
					option: option,
				},
			});
		}

		return structuredList;
	};

	return (tree: Parent): void => {
		visit(tree, 'paragraph', (node: Paragraph, index: number | null, parent: Parent | null): boolean => {
			if (index === null || parent === null) {
				return CONTINUE;
			}

			const structuredList = parse(toString(node));
			if (structuredList === null || structuredList.length === 0) {
				return CONTINUE;
			}

			if (structuredList.every((structured) => structured.name.includes('.'))) {
				const items: XMediaItem[] = [];

				for (const structured of structuredList) {
					const { require: metaRequire } = structured.meta;

					const item: XMediaItem = {
						type: nameMediaItem,
						filename: structured.name,
						title: metaRequire,
					};

					items.push(item);
				}

				const embedded: XEmbeddedMedia = {
					type: nameMedia,
					children: items,
				};
				parent.children.splice(index, 1, embedded);
			} else if (structuredList.every((structured) => structured.name === SERVICE_AMAZON)) {
				const items: XAmazonItem[] = [];

				for (const structured of structuredList) {
					const { require: metaRequire, option: metaOption } = structured.meta;

					const requireSeparator1Index = metaRequire.indexOf(META_SEPARATOR);
					const asin = metaRequire.substring(0, requireSeparator1Index);
					const title = metaRequire.substring(requireSeparator1Index + META_SEPARATOR.length);

					if (!new RegExp(`^${regexp.asin}$`).test(asin)) {
						return CONTINUE;
					}

					let imageId: string | undefined;
					let imageSize: Size | undefined;
					metaOption?.split(META_SEPARATOR).forEach((meta) => {
						if (/^[1-9][0-9]{1,2}x[1-9][0-9]{1,2}$/.test(meta)) {
							/* 画像サイズ */
							const sizes = meta.split('x');
							imageSize = {
								width: Number(sizes.at(0)),
								height: Number(sizes.at(1)),
							};
						} else if (new RegExp(`^${regexp.amazonImageId}$`).test(meta)) {
							/* 画像ID */
							imageId = meta;
						}
					});

					const item: XAmazonItem = {
						type: nameAmazonItem,
						asin: asin,
						title: title,
					};
					if (imageId !== undefined) {
						item.image = {
							id: imageId,
						};
						if (imageSize !== undefined) {
							item.image.size = imageSize;
						}
					}

					items.push(item);
				}

				const embedded: XEmbeddedAmazon = {
					type: nameAmazon,
					children: items,
				};
				parent.children.splice(index, 1, embedded);
			} else if (structuredList.every((structured) => structured.name === SERVICE_YOUTUBE)) {
				const items: XYouTubeItem[] = [];

				for (const structured of structuredList) {
					const { require: metaRequire, option: metaOption } = structured.meta;

					const requireSeparator1Index = metaRequire.indexOf(META_SEPARATOR);
					const id = metaRequire.substring(0, requireSeparator1Index);
					const title = metaRequire.substring(requireSeparator1Index + META_SEPARATOR.length);

					if (!new RegExp(`^${regexp.youtubeId}$`).test(id)) {
						return CONTINUE;
					}

					let size: Size | undefined;
					let start: number | undefined;
					metaOption?.split(META_SEPARATOR).forEach((meta) => {
						if (/^[1-9][0-9]{2}x[1-9][0-9]{2}$/.test(meta)) {
							/* 動画サイズ */
							const sizes = meta.split('x');
							size = {
								width: Number(sizes.at(0)),
								height: Number(sizes.at(1)),
							};
						} else if (/^[1-9][0-9]*$/.test(meta)) {
							/* 開始位置（秒） */
							start = Number(meta);
						}
					});

					const item: XYouTubeItem = {
						type: nameYouTubeItem,
						id: id,
						title: title,
					};
					if (size !== undefined) {
						item.size = size;
					}
					if (start !== undefined) {
						item.start = start;
					}

					items.push(item);
				}

				const embedded: XEmbeddedYouTube = {
					type: nameYouTube,
					children: items,
				};
				parent.children.splice(index, 1, embedded);
			}

			return CONTINUE;
		});
	};
};
export default toMdast;
