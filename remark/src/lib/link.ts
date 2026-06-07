import type { ElementContent } from 'hast';
import { toString } from 'mdast-util-to-string';
import config from '../config.ts';

interface Icon {
	fileName: string; // アイコンのファイル名
	altText: string; // アイコンの代替テキスト
}

/**
 * リソースタイプによるアイコン情報を取得する
 *
 * @param url - リンク URL
 *
 * @returns リソースタイプによるアイコン情報
 */
const getTypeInfo = (url: URL): Icon | undefined => {
	/* PDFアイコン */
	if (url.pathname.endsWith('.pdf')) {
		return {
			fileName: 'pdf.png',
			altText: 'PDF',
		};
	}

	return undefined;
};

/**
 * ホスト名によるアイコン情報を取得する
 *
 * @param url - リンク URL
 * @param content - リンクテキスト
 *
 * @returns ホスト名によるアイコン情報
 */
const getHostInfo = (url: URL, content: string): Icon | string | undefined => {
	/* 絶対 URL 表記でない場合はドメイン情報を記載 */
	if (!new RegExp(`^${config.regexp.absoluteUrl}$`, 'v').test(content)) {
		const host = url.hostname;

		/* サイトアイコン */
		const hostIconConfig = config.linkHostIcon.find((icon) => icon.host === host);
		if (hostIconConfig !== undefined) {
			return {
				fileName: hostIconConfig.fileName,
				altText: hostIconConfig.alt,
			};
		}

		/* サイトアイコンがない場合はホスト名をテキストで表記 */
		return host;
	}

	return undefined;
};

/**
 * リンク情報を取得する
 *
 * @param mdContent - Markdown に書かれたリンクテキスト
 * @param mdPath - Markdown に書かれたリンクパス
 *
 * @returns リンク情報
 */
const getInfo = (
	mdContent: string,
	mdPath: string,
):
	| {
			href: string; // `href` 属性値
			type?: Icon | undefined; // リソースタイプ
			host?: string | Icon | undefined; // ホスト情報
	  }
	| undefined => {
	/* 絶対 URL */
	if (new RegExp(`^${config.regexp.absoluteUrl}$`, 'v').test(mdPath)) {
		const url = new URL(mdPath);

		if (new RegExp(`^https://www.amazon.[a-z]+(.[a-z]+)?/dp/${config.regexp.asin}$`, 'v').test(mdPath)) {
			/* Amazon 商品ページ */
			return {
				href: `${mdPath}/ref=nosim?tag=${config.amazonTrackingId}`, // https://affiliate.amazon.co.jp/help/node/topic/GP38PJ6EUR6PFBEC
				host: getHostInfo(url, mdContent),
			};
		}

		return {
			href: mdPath,
			type: getTypeInfo(url),
			host: getHostInfo(url, mdContent),
		};
	}

	/* 別記事へのリンク */
	const entryMatchGroups = new RegExp(`^(?<entryId>${config.regexp.entryId}(#.+)?)$`, 'v').exec(mdPath)?.groups;
	if (entryMatchGroups !== undefined) {
		const { entryId } = entryMatchGroups;

		if (entryId !== undefined) {
			return {
				href: `/entry/${mdPath}`,
			};
		}
	}

	/* ページ内リンク */
	const pageLinkMatchGroups = /^#(?<id>.+)/v.exec(mdPath)?.groups;
	if (pageLinkMatchGroups !== undefined) {
		const { id } = pageLinkMatchGroups;

		if (id !== undefined) {
			return {
				href: mdPath,
			};
		}
	}

	return undefined;
};

/**
 * リンク要素を組み立てる
 *
 * @param content - リンクテキスト
 * @param mdPath - Markdown に書かれたパス
 *
 * @returns リンク要素
 */
export const getLinkElements = (content: Readonly<ElementContent>[] | string, mdPath: string): ElementContent[] => {
	const info = getInfo(typeof content === 'string' ? content : toString(content), mdPath);

	const elements: ElementContent[] = [
		{
			type: 'element',
			tagName: 'a',
			properties: {
				href: info?.href,
			},
			children:
				typeof content === 'string'
					? [
							{
								type: 'text',
								value: content,
							},
						]
					: content,
		},
	];

	if (info?.type !== undefined) {
		elements.push({
			type: 'element',
			tagName: 'img',
			properties: {
				src: `/image/icon/${info.type.fileName}`,
				alt: `(${info.type.altText})`,
				width: '16',
				height: '16',
				className: 'c-link-icon',
			},
			children: [],
		});
	}

	if (info?.host !== undefined) {
		if (typeof info.host === 'string') {
			elements.push({
				type: 'element',
				tagName: 'small',
				properties: {
					className: 'c-domain',
				},
				children: [
					{
						type: 'text',
						value: '(',
					},
					{
						type: 'element',
						tagName: 'code',
						properties: {},
						children: [
							{
								type: 'text',
								value: info.host,
							},
						],
					},
					{
						type: 'text',
						value: ')',
					},
				],
			});
		} else {
			elements.push({
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
							src: `/image/icon/${info.host.fileName}`,
							alt: `(${info.host.altText})`,
							width: '16',
							height: '16',
						},
						children: [],
					},
				],
			});
		}
	}

	return elements;
};
