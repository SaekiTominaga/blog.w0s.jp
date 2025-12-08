import formBeforeUnloadConfirm from '@w0s/form-before-unload-confirm';
import formSubmitOverlay from '@w0s/form-submit-overlay';
import inputFilePreview from '@w0s/input-file-preview';
import { convert } from '@w0s/string-convert';
import type { Clear } from '../../@types/api.d.ts';
import Preview from './unique/Preview.ts';
import MessageImage from './unique/MessageImage.ts';

/* 入力値の変換 */
document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('.js-convert-trim').forEach((formCtrlElement) => {
	formCtrlElement.addEventListener(
		'change',
		() => {
			formCtrlElement.value = convert(formCtrlElement.value, {
				trim: true,
			});
		},
		{ passive: true },
	);
});

/* ファイルアップロードでプレビュー画像を表示 */
inputFilePreview(document.querySelectorAll('.js-input-file-preview'));

/* フォーム入力中にページが閉じられようとしたら確認メッセージを表示 */
formBeforeUnloadConfirm(document.querySelectorAll('.js-form-beforeunload-confirm'));

/* 送信ボタン2度押し防止 */
formSubmitOverlay(document.querySelectorAll('.js-submit-overlay'));

/* 本文プレビュー */
{
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
}

/* DSG キャッシュクリア */
{
	const buttonElement = document.getElementById('clear-button') as HTMLButtonElement | null; // 実行ボタン
	const resultElement = document.getElementById('clear-result') as HTMLTemplateElement | null; // 実行結果を表示する要素

	if (resultElement !== null) {
		buttonElement?.addEventListener('click', async () => {
			const response = await fetch('/api/clear', {
				method: 'POST',
			});

			/* いったんクリア */
			Array.from(resultElement.parentNode?.children ?? []).forEach((element) => {
				if (element === resultElement) {
					return;
				}

				element.remove();
			});

			const hiddenElement = resultElement.closest<HTMLElement>('[hidden]');
			if (hiddenElement !== null) {
				hiddenElement.hidden = false;
			}

			if (response.ok) {
				const responseJson = (await response.json()) as Clear;

				const fragment = document.createDocumentFragment();
				responseJson.forEach((result) => {
					const clone = resultElement.content.cloneNode(true) as HTMLElement;

					const successElement = clone.querySelector<HTMLElement>('.js-success');
					const errorEessage = clone.querySelector<HTMLElement>('.js-error');
					if (successElement !== null) {
						successElement.hidden = !result.success;
					}
					if (errorEessage !== null) {
						errorEessage.hidden = result.success;
					}

					const message = (result.success ? successElement : errorEessage)?.querySelector<HTMLElement>('.js-message');
					if (message !== null && message !== undefined) {
						message.textContent = result.message;
					}

					fragment.appendChild(clone);
				});
				resultElement.parentNode?.appendChild(fragment);
			}
		});
	}
}
