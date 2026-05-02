import type { Paragraph, PhrasingContent, Root } from 'mdast';
import { toString } from 'mdast-util-to-string';
import type { Plugin } from 'unified';
import type { Node, Parent } from 'unist';
import { CONTINUE, visit } from 'unist-util-visit';
import config from '../../config.ts';

/**
 * Paragraph
 */

export interface Dimensions {
	width: number;
	height: number;
}

export interface AmazonImage {
	id: string;
	dimensions: Dimensions | undefined;
}

const nameNote = 'x-note';
const nameInsert = 'x-insert';
const nameEmbeddedMedia = 'x-embedded-media';
const nameEmbeddedYouTube = 'x-embedded-youtube';
const nameEmbeddedAmazon = 'x-embedded-amazon';

interface XNote extends Parent {
	type: typeof nameNote;
	children: PhrasingContent[];
}

interface XInsert extends Parent {
	type: typeof nameInsert;
	date: Date;
	children: PhrasingContent[];
}

interface XEmbeddedMedia extends Parent {
	type: typeof nameEmbeddedMedia;
	filename: string;
	dimensions: Dimensions | undefined;
	children: PhrasingContent[];
}

interface XEmbeddedYouTube extends Node {
	type: typeof nameEmbeddedYouTube;
	id: string;
	title: string;
	dimensions: Dimensions | undefined;
	start: number | undefined;
	end: number | undefined;
}

interface XEmbeddedAmazon extends Node {
	type: typeof nameEmbeddedAmazon;
	asin: string;
	title: string;
	image: AmazonImage | undefined;
}

const parseNote = (node: Readonly<Paragraph>, firstChildValue: string): XNote | null => {
	const NOTE_PREFIX = 'note: ';

	if (!firstChildValue.startsWith(NOTE_PREFIX)) {
		return null;
	}

	return {
		type: nameNote,
		children: [
			{
				type: 'text',
				value: firstChildValue.substring(NOTE_PREFIX.length),
			},
			...node.children.slice(1),
		],
	};
};

const parseInsert = (node: Readonly<Paragraph>, firstChildValue: string): XInsert | null => {
	const INSERT_PREFIX_PATTERN = /^\+[0-9]{4}-[0-9]{2}-[0-9]{2}: /v; // +YYYY-MM-DD:␣

	if (!INSERT_PREFIX_PATTERN.test(firstChildValue)) {
		return null;
	}

	return {
		type: nameInsert,
		date: new Date(Number(firstChildValue.substring(1, 5)), Number(firstChildValue.substring(6, 8)) - 1, Number(firstChildValue.substring(9, 11))),
		children: [
			{
				type: 'text',
				value: firstChildValue.substring(13),
			},
			...node.children.slice(1),
		],
	};
};

const parseEmbedded = (node: Readonly<Paragraph>, firstChildValue: string): XEmbeddedMedia | XEmbeddedYouTube | XEmbeddedAmazon | null => {
	const EMBEDDED_PREFIX_SIGN = '@';
	const SERVICE_YOUTUBE = 'youtube';
	const SERVICE_AMAZON = 'amazon';
	const NAME_META_SEPARATOR = ': ';
	const META_SEPARATOR = ' ';

	if (!firstChildValue.startsWith(EMBEDDED_PREFIX_SIGN)) {
		return null;
	}

	const nameMetaSeparatorIndex = firstChildValue.indexOf(NAME_META_SEPARATOR);
	if (nameMetaSeparatorIndex === -1) {
		return null;
	}

	const name = firstChildValue.substring(EMBEDDED_PREFIX_SIGN.length, nameMetaSeparatorIndex);

	const metaContents: PhrasingContent[] = [
		{
			type: 'text',
			value: firstChildValue.substring(nameMetaSeparatorIndex + NAME_META_SEPARATOR.length),
		},
		...node.children.slice(1),
	]; // 接頭辞と区切り文字を除いたデータ

	/* 必須データとオプションデータに分離する */
	const { require: metaRequiredContent, option: metaOptionValue } = ((
		contents: PhrasingContent[],
	): {
		require: PhrasingContent[];
		option?: string | undefined;
	} => {
		const OPTION_OPEN = '<';
		const OPTION_CLOSE = '>';

		const lastChildContent = contents.at(-1);
		if (lastChildContent?.type !== 'text' && lastChildContent?.type !== 'html') {
			return {
				require: contents,
			};
		}

		const { value: lastChildValue } = lastChildContent;

		const optionOpenIndex = lastChildValue.lastIndexOf(OPTION_OPEN);
		const optionCloseIndex = lastChildValue.lastIndexOf(OPTION_CLOSE);

		let requireLastChildValue = lastChildValue;
		let optionValue: string | undefined;
		if (optionOpenIndex !== -1 && optionCloseIndex === lastChildValue.length - OPTION_CLOSE.length) {
			requireLastChildValue = lastChildValue.substring(0, optionOpenIndex).trimEnd();
			optionValue = lastChildValue.substring(optionOpenIndex + OPTION_OPEN.length, lastChildValue.length - OPTION_CLOSE.length);
		}

		if (lastChildContent.type === 'html') {
			const lastChildBefore = contents.at(-2);
			if (lastChildBefore?.type === 'text') {
				lastChildBefore.value = lastChildBefore.value.trimEnd();
			}
		}

		return {
			require: [
				...contents.slice(0, contents.length - 1),
				{
					type: lastChildContent.type,
					value: requireLastChildValue,
				},
			],
			option: optionValue,
		};
	})(metaContents);

	if (name.includes('.')) {
		const dimensions = ((value: string | undefined): Dimensions | undefined => {
			if (value === undefined || !/^[1-9][0-9]*x[1-9][0-9]*$/v.test(value)) {
				return undefined;
			}

			/* サイズ */
			const [width, height] = value.split('x');
			return {
				width: Number(width),
				height: Number(height),
			};
		})(metaOptionValue);

		return {
			type: nameEmbeddedMedia,
			filename: name,
			dimensions: dimensions,
			children: metaRequiredContent,
		};
	} else if (name === SERVICE_YOUTUBE) {
		const metaRequireString = toString(metaRequiredContent);

		const requireSeparator1Index = metaRequireString.indexOf(META_SEPARATOR);
		const id = metaRequireString.substring(0, requireSeparator1Index);
		const title = metaRequireString.substring(requireSeparator1Index + META_SEPARATOR.length);

		if (!new RegExp(`^${config.regexp.youtubeId}$`, 'v').test(id)) {
			return null;
		}

		let dimensions: Dimensions | undefined;
		let start: number | undefined;
		let end: number | undefined;
		metaOptionValue?.split(META_SEPARATOR).forEach((meta) => {
			if (/^[1-9][0-9]{2}x[1-9][0-9]{2}$/v.test(meta)) {
				/* 動画サイズ */
				const [metaWidth, metaHeight] = meta.split('x');

				dimensions = {
					width: Number(metaWidth),
					height: Number(metaHeight),
				};
			} else if (/^[1-9][0-9]*(-[1-9][0-9]*)?s$/v.test(meta)) {
				/* 開始・終了位置（秒） */
				const [metaStart, metaEnd] = meta.substring(0, meta.length - 1).split('-');

				start = Number(metaStart);
				if (metaEnd !== undefined) {
					end = Number(metaEnd);
				}
			}
		});

		return {
			type: nameEmbeddedYouTube,
			id: id,
			title: title,
			dimensions: dimensions,
			start: start,
			end: end,
		};
	} else if (name === SERVICE_AMAZON) {
		const metaRequireString = toString(metaRequiredContent);

		const requireSeparator1Index = metaRequireString.indexOf(META_SEPARATOR);
		const asin = metaRequireString.substring(0, requireSeparator1Index);
		const title = metaRequireString.substring(requireSeparator1Index + META_SEPARATOR.length);

		if (!new RegExp(`^${config.regexp.asin}$`, 'v').test(asin)) {
			return null;
		}

		let imageId: string | undefined;
		let imageDimensions: Dimensions | undefined;
		metaOptionValue?.split(META_SEPARATOR).forEach((meta) => {
			if (/^[1-9][0-9]{1,3}x[1-9][0-9]{1,3}$/v.test(meta)) {
				/* 画像サイズ */
				const [width, height] = meta.split('x');
				imageDimensions = {
					width: Number(width),
					height: Number(height),
				};
			} else if (new RegExp(`^${config.regexp.amazonImageId}$`, 'v').test(meta)) {
				/* 画像ID */
				imageId = meta;
			}
		});

		return {
			type: nameEmbeddedAmazon,
			asin: asin,
			title: title,
			image: imageId !== undefined ? { id: imageId, dimensions: imageDimensions } : undefined,
		};
	}

	return null;
};

const toMdast: Plugin<[], Root> = () => {
	return (tree: Parent): void => {
		visit(tree, 'paragraph', (node: Paragraph, index: number | null, parent: Parent | null): boolean => {
			if (index === null || parent?.type !== 'root') {
				return CONTINUE;
			}

			const firstChildContent = node.children.at(0);
			if (firstChildContent?.type !== 'text') {
				return CONTINUE;
			}

			const parsedNote = parseNote(node, firstChildContent.value);
			if (parsedNote !== null) {
				parent.children.splice(index, 1, parsedNote);
				return CONTINUE;
			}

			const parsedInsert = parseInsert(node, firstChildContent.value);
			if (parsedInsert !== null) {
				parent.children.splice(index, 1, parsedInsert);
				return CONTINUE;
			}

			const parsedEmbedded = parseEmbedded(node, firstChildContent.value);
			if (parsedEmbedded !== null) {
				parent.children.splice(index, 1, parsedEmbedded);
				return CONTINUE;
			}

			return CONTINUE;
		});
	};
};
export default toMdast;
