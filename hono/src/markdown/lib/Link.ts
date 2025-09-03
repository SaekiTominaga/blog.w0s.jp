import configRemark from '../../config/remark.ts';

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
		const absoluteUrlMatchGroups = new RegExp(`^(?<absoluteUrl>${configRemark.regexp.absoluteUrl})$`).exec(mdUrl)?.groups;
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
		const entryMatchGroups = new RegExp(`^(?<entryId>${configRemark.regexp.entryId}(#.+)?)$`).exec(mdUrl)?.groups;
		if (entryMatchGroups !== undefined) {
			const { entryId } = entryMatchGroups;

			if (entryId !== undefined) {
				return {
					href: `/entry/${mdUrl}`,
				};
			}
		}

		/* Amazon 商品ページへのリンク */
		const amazonMatchGroups = new RegExp(`^amazon:(?<asin>${configRemark.regexp.asin})$`).exec(mdUrl)?.groups;
		if (amazonMatchGroups !== undefined) {
			const { asin } = amazonMatchGroups;

			if (asin !== undefined) {
				return {
					href: `https://www.amazon.co.jp/dp/${asin}/ref=nosim?tag=${configRemark.amazonTrackingId}`, // https://affiliate.amazon.co.jp/help/node/topic/GP38PJ6EUR6PFBEC
					hostIcon: { fileName: 'amazon.png', altText: 'Amazon' },
				};
			}
		}

		/* ページ内リンク */
		const pageLinkMatchGroups = /^#(?<id>.+)/.exec(mdUrl)?.groups;
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
		if (!new RegExp(`^${configRemark.regexp.absoluteUrl}$`).test(content)) {
			const host = url.hostname;

			/* サイトアイコン */
			const hostIconConfig = configRemark.linkHostIcon.find((icon) => icon.host === host);
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
