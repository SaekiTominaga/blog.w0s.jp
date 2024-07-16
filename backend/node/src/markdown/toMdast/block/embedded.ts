import type { List, Paragraph, PhrasingContent } from 'mdast';
import { toString } from 'mdast-util-to-string';
import type { Plugin } from 'unified';
import type { Node, Parent } from 'unist';
import { visit, CONTINUE } from 'unist-util-visit';
import { regexp } from '../../config.js';

/**
 * Embedded content
 */

export const nameMedia = 'x-embedded-media';
export const nameYouTube = 'x-embedded-youtube';
export const nameAmazon = 'x-embedded-amazon';
export const nameAmazonItem = 'x-embedded-amazon-item';

export interface Size {
	width: number;
	height: number;
}

export interface AmazonImage {
	id: string;
	size: Size | undefined;
}

interface XEmbeddedMedia extends Parent {
	type: typeof nameMedia;
	filename: string;
	size: Size | undefined;
	children: PhrasingContent[];
}

interface XEmbeddedYouTube extends Node {
	type: typeof nameYouTube;
	id: string;
	title: string;
	size: Size | undefined;
	start: number | undefined;
}

interface XAmazonItem extends Node {
	type: typeof nameAmazonItem;
	asin: string;
	title: string;
	image: AmazonImage | undefined;
}

interface XEmbeddedAmazon extends Parent {
	type: typeof nameAmazon;
	children: XAmazonItem[];
}

interface Structured {
	name: string;
	meta: {
		require: PhrasingContent[];
		option: string | undefined;
	};
}

const toMdast = (): Plugin => {
	const EMBEDDED_START = '@';
	const SERVICE_YOUTUBE = 'youtube';
	const SERVICE_AMAZON = 'amazon';
	const NAME_META_SEPARATOR = ': ';
	const META_SEPARATOR = ' ';
	const OPTION_OPEN = '<';
	const OPTION_CLOSE = '>';

	const metaParse = (node: PhrasingContent): { require: PhrasingContent; option?: string | undefined } => {
		if (node.type !== 'text' && node.type !== 'html') {
			return {
				require: node,
			};
		}

		const { value } = node;

		let require = value;
		let option: string | undefined;

		const optionOpenIndex = value.lastIndexOf(OPTION_OPEN);
		const optionCloseIndex = value.lastIndexOf(OPTION_CLOSE);

		if (optionOpenIndex !== -1 && optionCloseIndex === value.length - OPTION_CLOSE.length) {
			require = value.substring(0, optionOpenIndex).trimEnd();
			option = value.substring(optionOpenIndex + OPTION_OPEN.length, value.length - OPTION_CLOSE.length);
		}

		return {
			require: {
				type: node.type,
				value: require,
			},
			option: option,
		};
	};

	const parse = (node: Paragraph): Structured | null => {
		const firstChild = node.children.at(0);
		if (firstChild?.type !== 'text') {
			return null;
		}

		const firstChildValue = firstChild.value;
		if (!firstChildValue.startsWith(EMBEDDED_START)) {
			return null;
		}

		const nameMetaSeparatorIndex = firstChildValue.indexOf(NAME_META_SEPARATOR);
		if (nameMetaSeparatorIndex === -1) {
			return null;
		}

		const name = firstChildValue.substring(EMBEDDED_START.length, nameMetaSeparatorIndex);

		const metaRequire = node.children.slice();
		let metaOption: string | undefined;
		metaRequire[0] = {
			type: 'text',
			value: firstChildValue.substring(nameMetaSeparatorIndex + NAME_META_SEPARATOR.length),
		};

		if (metaRequire.length === 1) {
			const { require, option } = metaParse(metaRequire[0]);
			metaRequire[0] = require;
			metaOption = option;
		} else {
			const lastChild = metaRequire.at(-1);
			if (lastChild !== undefined) {
				const { require, option } = metaParse(lastChild);
				metaRequire[metaRequire.length - 1] = require;
				metaOption = option;

				if (lastChild.type === 'html') {
					const lastChildBefore = metaRequire.at(-2);
					if (lastChildBefore?.type === 'text') {
						lastChildBefore.value = lastChildBefore.value.trimEnd();
					}
				}
			}
		}

		return {
			name: name,
			meta: {
				require: metaRequire,
				option: metaOption,
			},
		};
	};

	return (tree: Parent): void => {
		visit(tree, 'paragraph', (node: Paragraph, index: number | null, parent: Parent | null): boolean => {
			if (index === null || parent === null || parent.type === 'listItem') {
				return CONTINUE;
			}

			const structured = parse(node);
			if (structured === null) {
				return CONTINUE;
			}

			if (structured.name.includes('.')) {
				const { require: metaRequire, option: metaOption } = structured.meta;

				let size: Size | undefined;
				metaOption?.split(META_SEPARATOR).forEach((meta) => {
					if (/^[1-9][0-9]*x[1-9][0-9]*$/.test(meta)) {
						/* サイズ */
						const [width, height] = meta.split('x');
						size = {
							width: Number(width),
							height: Number(height),
						};
					}
				});

				const embedded: XEmbeddedMedia = {
					type: nameMedia,
					filename: structured.name,
					size: size,
					children: metaRequire,
				};
				parent.children.splice(index, 1, embedded);
			} else if (structured.name === SERVICE_YOUTUBE) {
				const { require: metaRequire, option: metaOption } = structured.meta;

				const metaRequireString = toString(metaRequire);

				const requireSeparator1Index = metaRequireString.indexOf(META_SEPARATOR);
				const id = metaRequireString.substring(0, requireSeparator1Index);
				const title = metaRequireString.substring(requireSeparator1Index + META_SEPARATOR.length);

				if (!new RegExp(`^${regexp.youtubeId}$`).test(id)) {
					return CONTINUE;
				}

				let size: Size | undefined;
				let start: number | undefined;
				metaOption?.split(META_SEPARATOR).forEach((meta) => {
					if (/^[1-9][0-9]{2}x[1-9][0-9]{2}$/.test(meta)) {
						/* 動画サイズ */
						const [width, height] = meta.split('x');
						size = {
							width: Number(width),
							height: Number(height),
						};
					} else if (/^[1-9][0-9]*$/.test(meta)) {
						/* 開始位置（秒） */
						start = Number(meta);
					}
				});

				const embedded: XEmbeddedYouTube = {
					type: nameYouTube,
					id: id,
					title: title,
					size: size,
					start: start,
				};
				parent.children.splice(index, 1, embedded);
			}

			return CONTINUE;
		});

		visit(tree, 'list', (node: List, index: number | null, parent: Parent | null): boolean => {
			if (index === null || parent === null) {
				return CONTINUE;
			}

			const items: XAmazonItem[] = [];

			const allClear = node.children.every((listItem): boolean => {
				const listItemChild = listItem.children.at(0);
				if (listItemChild?.type !== 'paragraph') {
					return false;
				}

				const structured = parse(listItemChild);
				if (structured === null) {
					return false;
				}

				if (structured.name === SERVICE_AMAZON) {
					const { require: metaRequire, option: metaOption } = structured.meta;

					const metaRequireString = toString(metaRequire);

					const requireSeparator1Index = metaRequireString.indexOf(META_SEPARATOR);
					const asin = metaRequireString.substring(0, requireSeparator1Index);
					const title = metaRequireString.substring(requireSeparator1Index + META_SEPARATOR.length);

					if (!new RegExp(`^${regexp.asin}$`).test(asin)) {
						return false;
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
						image:
							imageId !== undefined
								? {
										id: imageId,
										size: imageSize,
									}
								: undefined,
					};

					items.push(item);

					return true;
				}

				return false;
			});

			if (allClear) {
				/* リスト内の全てが Amazon 形式だった場合のみ */
				const embedded: XEmbeddedAmazon = {
					type: nameAmazon,
					children: items,
				};

				parent.children.splice(index, 1, embedded);
			}

			return CONTINUE;
		});
	};
};
export default toMdast;
