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
const markdownMessagesElement = <HTMLTemplateElement | null>document.getElementById('markdown-messages'); // Markdown 変換結果のメッセージを表示する要素
const messagePreviewElement = <HTMLTemplateElement | null>document.getElementById('message-preview'); // 本文プレビューを表示する要素
const selectImageElement = <HTMLTemplateElement | null>document.getElementById('select-image');
const selectImageErrorElement = <HTMLTemplateElement | null>document.getElementById('select-image-error');
if (
	messageCtrlElement !== null &&
	markdownMessagesElement !== null &&
	messagePreviewElement !== null &&
	selectImageElement !== null &&
	selectImageErrorElement !== null
) {
	const preview = new Preview({
		ctrl: messageCtrlElement,
		messages: markdownMessagesElement,
		preview: messagePreviewElement,
	});
	const messageImage = new MessageImage({
		ctrl: messageCtrlElement,
		image: selectImageElement,
		error: selectImageErrorElement,
	});

	const exec = async (): Promise<void> => {
		await Promise.all([preview.exec(), messageImage.exec()]);
	};

	exec();

	messageCtrlElement.addEventListener('change', exec, { passive: true });
}