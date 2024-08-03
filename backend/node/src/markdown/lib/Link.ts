import { config, regexp } from '../config.js';

export interface Icon {
	fileName: string; // アイコンのファイル名
	altText: string; // アイコンの代替テキスト
}

interface Info {
	href?: string; // `href` 属性値
	typeIcon?: Icon | undefined; // リソースタイプによるアイコン
	hostIcon?: Icon | undefined; // ホスト名によるアイコン
	hostText?: string | undefined; // ホスト名
}

interface TypeInfo {
	typeIcon: Icon | undefined;
}

interface HostInfo {
	hostIcon: Icon | undefined;
	hostText: string | undefined;
}

export default class Link {
	/**
	 * リンクに付随する情報を取得する
	 *
	 * @param mdContent - Markdown に書かれたリンクテキスト
	 * @param mdUrl - Markdown に書かれた URL
	 *
	 * @returns リンクに付随する情報
	 */
	static getInfo(mdContent: string, mdUrl: string): Info {
		/* 絶対 URL */
		const absoluteUrlMatchGroups = mdUrl.match(new RegExp(`^(?<absoluteUrl>${regexp.absoluteUrl})$`))?.groups;
		if (absoluteUrlMatchGroups !== undefined) {
			const { absoluteUrl } = absoluteUrlMatchGroups;

			if (absoluteUrl !== undefined) {
				const url = new URL(mdUrl);

				const { typeIcon } = this.#getTypeInfo(url);
				const { hostIcon, hostText } = this.#getHostInfo(mdContent, url);

				return {
					href: mdUrl,
					typeIcon: typeIcon,
					hostIcon: hostIcon,
					hostText: hostText,
				};
			}
		}

		/* 別記事へのリンク */
		const entryMatchGroups = mdUrl.match(new RegExp(`^(?<id>${regexp.entryId}(#.+)?)$`))?.groups;
		if (entryMatchGroups !== undefined) {
			const { id } = entryMatchGroups;

			if (id !== undefined) {
				return {
					href: `/${mdUrl}`,
				};
			}
		}

		/* Amazon 商品ページへのリンク */
		const amazonMatchGroups = mdUrl.match(new RegExp(`^amazon:(?<asin>${regexp.asin})$`))?.groups;
		if (amazonMatchGroups !== undefined) {
			const { asin } = amazonMatchGroups;

			if (asin !== undefined) {
				return {
					href: `https://www.amazon.co.jp/dp/${asin}/ref=nosim?tag=${config.amazonTrackingId}`, // https://affiliate.amazon.co.jp/help/node/topic/GP38PJ6EUR6PFBEC
					hostIcon: { fileName: 'amazon.png', altText: 'Amazon' },
				};
			}
		}

		/* ページ内リンク */
		const pageLinkMatchGroups = mdUrl.match(/^#(?<id>.+)/)?.groups;
		if (pageLinkMatchGroups !== undefined) {
			const { id } = pageLinkMatchGroups;

			if (id !== undefined) {
				return {
					href: mdUrl,
				};
			}
		}

		return {};
	}

	/**
	 * リソースタイプによるアイコン情報を取得する
	 *
	 * @param url - リンク URL
	 *
	 * @returns リソースタイプによるアイコン情報
	 */
	static #getTypeInfo(url: URL): TypeInfo {
		let typeIcon: Icon | undefined;

		/* PDFアイコン */
		if (url.pathname.endsWith('.pdf')) {
			typeIcon = {
				fileName: 'pdf.png',
				altText: 'PDF',
			};
		}

		return { typeIcon: typeIcon };
	}

	/**
	 * ホスト名によるアイコン情報を取得する
	 *
	 * @param content - リンクテキスト
	 * @param url - リンク URL
	 *
	 * @returns ホスト名によるアイコン情報
	 */
	static #getHostInfo(content: string, url: URL): HostInfo {
		let hostIcon: Icon | undefined;
		let hostText: string | undefined;

		/* 絶対 URL 表記でない場合はドメイン情報を記載 */
		if (!new RegExp(`^${regexp.absoluteUrl}$`).test(content)) {
			const host = url.hostname;

			/* サイトアイコン */
			const hostIconConfig = config.linkHostIcon.find((icon) => icon.host === host);
			if (hostIconConfig !== undefined) {
				hostIcon = {
					fileName: hostIconConfig.fileName,
					altText: hostIconConfig.alt,
				};
			} else {
				/* サイトアイコンがない場合はホスト名をテキストで表記 */
				hostText = host;
			}
		}

		return { hostIcon: hostIcon, hostText: hostText };
	}
}
