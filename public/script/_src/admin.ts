import ButtonConfirm from '@saekitominaga/customelements-button-confirm';
import FormBeforeUnloadConfirm from '@saekitominaga/htmlformelement-before-unload-confirm';
import FormSubmitOverlay from '@saekitominaga/htmlformelement-submit-overlay';
import InputFilePreview from '@saekitominaga/customelements-input-file-preview';
import StringConvert from '@saekitominaga/string-convert';
import Preview from './unique/Preview.js';
import MessageImage from './unique/MessageImage.js';

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
for (const formCtrlElement of document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('.js-convert-trim')) {
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
for (const beforeunloadConfirmElement of document.querySelectorAll<HTMLFormElement>('.js-form-beforeunload-confirm')) {
	const formBeforeUnloadConfirm = new FormBeforeUnloadConfirm(beforeunloadConfirmElement);
	formBeforeUnloadConfirm.init();
}

/* 送信ボタン2度押し防止 */
for (const formElement of document.querySelectorAll<HTMLFormElement>('.js-submit-overlay')) {
	new FormSubmitOverlay(formElement).init();
}

/* 本文プレビュー */
const messageCtrlElement = <HTMLTextAreaElement | null>document.getElementById('fc-message'); // 本文の入力コントロール
const messagePreviewElement = document.getElementById('message-preview'); // 本文プレビューを表示する要素
const selectImageElement = <HTMLTemplateElement | null>document.getElementById('select-image');
const selectImageErrorElement = <HTMLTemplateElement | null>document.getElementById('select-image-error');
if (messageCtrlElement !== null && selectImageElement !== null && selectImageErrorElement !== null && messagePreviewElement !== null) {
	const messageImage = new MessageImage(messageCtrlElement, selectImageElement, selectImageErrorElement);
	const preview = new Preview(messageCtrlElement, messagePreviewElement);

	await messageImage.exec();
	await preview.exec();

	messageCtrlElement.addEventListener(
		'change',
		async () => {
			await messageImage.exec();
			await preview.exec();
		},
		{ passive: true }
	);
}
