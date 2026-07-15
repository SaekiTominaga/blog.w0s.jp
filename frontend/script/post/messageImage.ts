import PaapiItemImageUrlParser from '@w0s/paapi-item-image-url-parser';

/**
 * 本処理前に行う処理
 *
 * @param $template - 選択画像を表示する要素
 *
 * @returns ラジオボタンで選択された値（画像ファイル名 or 外部サービス URL）
 */
const pre = ($template: HTMLTemplateElement): string | undefined => {
	let selectedImage: string | undefined;

	Array.from($template.parentNode?.children ?? [])
		.filter((element) => element !== $template)
		.forEach((element) => {
			const $radioChecked = element.querySelector<HTMLInputElement>('input[type="radio"]:checked');
			if ($radioChecked !== null) {
				selectedImage = $radioChecked.value;
			}

			/* いったんクリア */
			element.remove();
		});

	return selectedImage;
};

/**
 * 記事を解析して画像情報を抜粋する
 *
 * @param elements - HTML 要素
 */
const messageImage = (
	elements: Readonly<{
		preview: HTMLTemplateElement; // 本文プレビューを表示する要素
		image: HTMLTemplateElement; // 選択画像を表示する要素
	}>,
): void => {
	const { preview: $previewTemplate, image: $selectImageTemplate } = elements;

	const selectedImage = pre($selectImageTemplate);

	const $preview = $previewTemplate.nextElementSibling;
	if ($preview === null) {
		return;
	}

	/* 本文内のテキストから画像情報を抜き出す */
	const imageFileNames = [...$preview.querySelectorAll<HTMLImageElement>('img[src^="/entry/image/thumb/"]')].map((image) => {
		const { pathname } = new URL(image.src);
		return pathname.substring(pathname.lastIndexOf('/') + 1, pathname.lastIndexOf('@')); // path/to/foo.jpg@d=640x480;q=60.avif → foo.jpg を抜き出す
	});
	const youtubeImageUrls = [...$preview.querySelectorAll<HTMLAnchorElement>('a[href^="https://www.youtube.com/watch?v="]')].map(
		(anchor) => `https://i1.ytimg.com/vi/${new URL(anchor.href).searchParams.get('v') ?? ''}/hqdefault.jpg`,
	);
	const amazonImageUrls = [...$preview.querySelectorAll<HTMLImageElement>('img[src^="https://m.media-amazon.com/images/"]')].map((image) => {
		const paapiItemImageUrlParser = new PaapiItemImageUrlParser(new URL(image.src));
		paapiItemImageUrlParser.removeSize();
		return paapiItemImageUrlParser.toString();
	});

	const images = new Set<string>([...imageFileNames, ...youtubeImageUrls, ...amazonImageUrls]); // 抽出した画像情報

	const originalImage = $selectImageTemplate.dataset['selected']; // 既存記事でもともと指定されていた画像（ファイル名 or 外部サービス URL）

	/* 画像を選択するラジオボタンを表示する */
	const fragment = document.createDocumentFragment();
	images.forEach((image) => {
		const $templateClone = $selectImageTemplate.content.cloneNode(true) as HTMLElement;
		const $radio = $templateClone.querySelector<HTMLInputElement>('input[type="radio"]');
		if ($radio !== null) {
			$radio.value = image;
			$radio.checked = image === selectedImage || image === originalImage;
		}

		const $image = $templateClone.querySelector('img');
		if ($image !== null) {
			if (image.startsWith('https://')) {
				$image.src = image;
			} else {
				$image.src = `/entry/image/thumb/${image}@d=1280x960;q=30.avif`;
			}
			$image.alt = image;
			$image.title = image;
		}

		fragment.appendChild($templateClone);
	});
	$selectImageTemplate.parentNode?.appendChild(fragment);
};
export default messageImage;
