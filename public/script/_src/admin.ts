import ButtonConfirm from '@saekitominaga/customelements-button-confirm';
import FormBeforeUnloadConfirm from '@saekitominaga/htmlformelement-before-unload-confirm';
import InputFilePreview from '@saekitominaga/customelements-input-file-preview';
import Preview from './unique/Preview';
import StringConvert from '@saekitominaga/string-convert';
import MessageImage from './unique/MessageImage';

if (document.querySelector('button[is="w0s-confirm-button"]') !== null) {
	/* ボタン押下時に確認メッセージを表示 */
	customElements.define('w0s-confirm-button', ButtonConfirm, {
		extends: 'button',
	});
}

if (document.querySelector('input[is="w0s-input-file-preview"]') !== null) {
	/* ファイルアップロードでプレビュー画像を表示 */
	customElements.define('w0s-input-file-preview', InputFilePreview, {
		extends: 'input',
	});
}

/* 入力値の変換 */
for (const formCtrlElement of <NodeListOf<HTMLInputElement | HTMLTextAreaElement>>document.querySelectorAll('.js-convert-trim')) {
	formCtrlElement.addEventListener(
		'change',
		() => {
			formCtrlElement.value = StringConvert.convert(formCtrlElement.value, {
				trim: true,
			});
		},
		{ passive: true }
	);
}

/* フォーム入力中にページが閉じられようとしたら確認メッセージを表示 */
for (const beforeunloadConfirmElement of <NodeListOf<HTMLFormElement>>document.querySelectorAll('.js-form-beforeunload-confirm')) {
	const formBeforeUnloadConfirm = new FormBeforeUnloadConfirm(beforeunloadConfirmElement);
	formBeforeUnloadConfirm.init();
}

/* 本文プレビュー */
const messageCtrlElement = <HTMLTextAreaElement | null>document.getElementById('fc-message'); // 本文の入力コントロール
const messagePreviewElement = document.getElementById('message-preview'); // 本文プレビューを表示する要素
const selectImageElement = <HTMLTemplateElement | null>document.getElementById('select-image');
const selectImageErrorElement = <HTMLTemplateElement | null>document.getElementById('select-image-error');
if (messageCtrlElement !== null && selectImageElement !== null && selectImageErrorElement !== null && messagePreviewElement !== null) {
	const messageImage = new MessageImage(messageCtrlElement, selectImageElement, selectImageErrorElement);
	const preview = new Preview(messageCtrlElement, messagePreviewElement);

	(async () => {
		await messageImage.exec();
		await preview.exec();
	})();

	messageCtrlElement.addEventListener(
		'change',
		async () => {
			await messageImage.exec();
			await preview.exec();
		},
		{ passive: true }
	);
}
