import PaapiItemImageUrlParser from '@w0s/paapi-item-image-url-parser';

/**
 * 本処理前に行う処理
 *
 * @param template - 選択画像を表示する要素
 *
 * @returns ラジオボタンで選択された値（画像ファイル名 or 外部サービス URL）
 */
const pre = (template: HTMLTemplateElement): string | undefined => {
	let selectedImage: string | undefined;

	Array.from(template.parentNode?.children ?? [])
		.filter((element) => element !== template)
		.forEach((element) => {
			const radioCheckedElement = element.querySelector<HTMLInputElement>('input[type="radio"]:checked');
			if (radioCheckedElement !== null) {
				selectedImage = radioCheckedElement.value;
			}

			/* いったんクリア */
			element.remove();
		});

	return selectedImage;
};

/**
 * 記事を解析して画像情報を抜粋する
 *
 * @param element - HTML 要素
 */
const messageImage = (
	element: Readonly<{
		preview: HTMLTemplateElement; // 本文プレビューを表示する要素
		image: HTMLTemplateElement; // 選択画像を表示する要素
	}>,
) => {
	const { preview: previewTemplate, image: selectImageTemplate } = element;

	const selectedImage = pre(selectImageTemplate);

	const previewElement = previewTemplate.nextElementSibling;
	if (previewElement === null) {
		return;
	}

	/* 本文内のテキストから画像情報を抜き出す */
	const imageFileNames = [...previewElement.querySelectorAll<HTMLImageElement>('img[src^="https://media.w0s.jp/thumbimage/blog/"]')].map((image) => {
		const { pathname } = new URL(image.src);
		return pathname.substring(pathname.lastIndexOf('/') + 1);
	});
	const youtubeImageUrls = [...previewElement.querySelectorAll<HTMLAnchorElement>('a[href^="https://www.youtube.com/watch?v="]')].map(
		(anchor) => `https://i1.ytimg.com/vi/${new URL(anchor.href).searchParams.get('v') ?? ''}/hqdefault.jpg`,
	);
	const amazonImageUrls = [...previewElement.querySelectorAll<HTMLImageElement>('img[src^="https://m.media-amazon.com/images/"]')].map((image) => {
		const paapiItemImageUrlParser = new PaapiItemImageUrlParser(new URL(image.src));
		paapiItemImageUrlParser.removeSize();
		return paapiItemImageUrlParser.toString();
	});

	const images = new Set<string>([...imageFileNames, ...youtubeImageUrls, ...amazonImageUrls]); // 抽出した画像情報

	const originalImage = selectImageTemplate.dataset['selected']; // 既存記事でもともと指定されていた画像（ファイル名 or 外部サービス URL）

	/* 画像を選択するラジオボタンを表示する */
	const fragment = document.createDocumentFragment();
	images.forEach((image) => {
		const templateClone = selectImageTemplate.content.cloneNode(true) as HTMLElement;
		const radioElement = templateClone.querySelector<HTMLInputElement>('input[type="radio"]');
		if (radioElement !== null) {
			radioElement.value = image;
			radioElement.checked = image === selectedImage || image === originalImage;
		}

		const imageElement = templateClone.querySelector('img');
		if (imageElement !== null) {
			if (image.startsWith('https://')) {
				imageElement.src = image;
			} else {
				imageElement.src = `https://media.w0s.jp/thumbimage/blog/${image}?type=webp;w=360;h=360;quality=30`;
			}
			imageElement.alt = image;
			imageElement.title = image;
		}

		fragment.appendChild(templateClone);
	});
	selectImageTemplate.parentNode?.appendChild(fragment);
};
export default messageImage;
