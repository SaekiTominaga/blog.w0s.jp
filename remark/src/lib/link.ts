import config from '../config.ts';

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

/**
 * リソースタイプによるアイコン情報を取得する
 *
 * @param url - リンク URL
 *
 * @returns リソースタイプによるアイコン情報
 */
const getTypeInfo = (url: URL): TypeInfo => {
	let typeIcon: Icon | undefined;

	/* PDFアイコン */
	if (url.pathname.endsWith('.pdf')) {
		typeIcon = {
			fileName: 'pdf.png',
			altText: 'PDF',
		};
	}

	return { typeIcon: typeIcon };
};

/**
 * ホスト名によるアイコン情報を取得する
 *
 * @param content - リンクテキスト
 * @param url - リンク URL
 *
 * @returns ホスト名によるアイコン情報
 */
const getHostInfo = (content: string, url: URL): HostInfo => {
	let hostIcon: Icon | undefined;
	let hostText: string | undefined;

	/* 絶対 URL 表記でない場合はドメイン情報を記載 */
	if (!new RegExp(`^${config.regexp.absoluteUrl}$`, 'v').test(content)) {
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
};

/**
 * リンクに付随する情報を取得する
 *
 * @param mdContent - Markdown に書かれたリンクテキスト
 * @param mdUrl - Markdown に書かれた URL
 *
 * @returns リンクに付随する情報
 */
export const getInfo = (mdContent: string, mdUrl: string): Info => {
	/* 絶対 URL */
	if (new RegExp(`^${config.regexp.absoluteUrl}$`, 'v').test(mdUrl)) {
		const url = new URL(mdUrl);

		const { hostIcon, hostText } = getHostInfo(mdContent, url);

		if (new RegExp(`^https://www.amazon.[a-z]+(.[a-z]+)?/dp/${config.regexp.asin}$`, 'v').test(mdUrl)) {
			/* Amazon 商品ページ */
			return {
				href: `${mdUrl}/ref=nosim?tag=${config.amazonTrackingId}`, // https://affiliate.amazon.co.jp/help/node/topic/GP38PJ6EUR6PFBEC
				hostIcon: hostIcon,
				hostText: hostText,
			};
		}

		const { typeIcon } = getTypeInfo(url);

		return {
			href: mdUrl,
			typeIcon: typeIcon,
			hostIcon: hostIcon,
			hostText: hostText,
		};
	}

	/* 別記事へのリンク */
	const entryMatchGroups = new RegExp(`^(?<entryId>${config.regexp.entryId}(#.+)?)$`, 'v').exec(mdUrl)?.groups;
	if (entryMatchGroups !== undefined) {
		const { entryId } = entryMatchGroups;

		if (entryId !== undefined) {
			return {
				href: `/entry/${mdUrl}`,
			};
		}
	}

	/* ページ内リンク */
	const pageLinkMatchGroups = /^#(?<id>.+)/v.exec(mdUrl)?.groups;
	if (pageLinkMatchGroups !== undefined) {
		const { id } = pageLinkMatchGroups;

		if (id !== undefined) {
			return {
				href: mdUrl,
			};
		}
	}

	return {};
};
