import formBeforeUnloadConfirm from '@w0s/form-before-unload-confirm';
import formSubmitOverlay from '@w0s/form-submit-overlay';
import inputFilePreview from '@w0s/input-file-preview';
import StringConvert from '@w0s/string-convert';
import Preview from './unique/Preview.js';
import MessageImage from './unique/MessageImage.js';

/* 入力値の変換 */
for (const formCtrlElement of document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('.js-convert-trim')) {
	formCtrlElement.addEventListener(
		'change',
		() => {
			formCtrlElement.value = StringConvert.convert(formCtrlElement.value, {
				trim: true,
			});
		},
		{ passive: true },
	);
}

/* ファイルアップロードでプレビュー画像を表示 */
inputFilePreview(document.querySelectorAll('.js-input-file-preview'));

/* フォーム入力中にページが閉じられようとしたら確認メッセージを表示 */
formBeforeUnloadConfirm(document.querySelectorAll('.js-form-beforeunload-confirm'));

/* 送信ボタン2度押し防止 */
formSubmitOverlay(document.querySelectorAll('.js-submit-overlay'));

/* 本文プレビュー */
const messageCtrlElement = document.getElementById('fc-message') as HTMLTextAreaElement | null; // 本文の入力コントロール
const markdownMessagesElement = document.getElementById('markdown-messages') as HTMLTemplateElement | null; // Markdown 変換結果のメッセージを表示する要素
const messagePreviewElement = document.getElementById('message-preview') as HTMLTemplateElement | null; // 本文プレビューを表示する要素
const selectImageElement = document.getElementById('select-image') as HTMLTemplateElement | null;

if (messageCtrlElement !== null && markdownMessagesElement !== null && messagePreviewElement !== null && selectImageElement !== null) {
	const preview = new Preview({
		ctrl: messageCtrlElement,
		messages: markdownMessagesElement,
		preview: messagePreviewElement,
	});

	const messageImage = new MessageImage({
		preview: messagePreviewElement,
		image: selectImageElement,
	});

	const exec = async (): Promise<void> => {
		await preview.exec();
		messageImage.exec();
	};

	await exec();
	messageCtrlElement.addEventListener(
		'change',
		() => {
			exec().catch((e: unknown) => {
				throw e;
			});
		},
		{ passive: true },
	);
}
