import formBeforeUnloadConfirm from '@w0s/form-before-unload-confirm';
import formSubmitOverlay from '@w0s/form-submit-overlay';
import inputFilePreview from '@w0s/input-file-preview';
import { convert } from '@w0s/string-convert';
import type { MediaUpload as ApiResponseMediaUpload, Clear as ApiResponseClear } from '../../@types/api.d.ts';
import messageImage from './unique/messageImage.ts';
import preview from './unique/preview.ts';
import reportJsError from './util/reportJsError.ts';
import trustedTypes from './util/trustedTypes.ts';

/* JS エラーレポート */
reportJsError();

/* Trusted Types */
trustedTypes();

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

/* disabled 制御 */
document.querySelectorAll<HTMLInputElement>('.js-disabled-control').forEach((element) => {
	const targetIds = element.dataset['targets']?.split(' ');

	element.addEventListener(
		'change',
		() => {
			targetIds?.forEach((targetId) => {
				(
					document.getElementById(targetId) as
						| HTMLButtonElement
						| HTMLFieldSetElement
						| HTMLInputElement
						| HTMLOptGroupElement
						| HTMLSelectElement
						| HTMLTextAreaElement
				).disabled = !element.checked;
			});
		},
		{ passive: true },
	);
});

/* 本文プレビュー */
{
	const messageCtrlElement = document.getElementById('fc-message') as HTMLTextAreaElement | null; // 本文の入力コントロール
	const markdownMessagesElement = document.getElementById('markdown-messages') as HTMLTemplateElement | null; // Markdown 変換結果のメッセージを表示する要素
	const messagePreviewElement = document.getElementById('message-preview') as HTMLTemplateElement | null; // 本文プレビューを表示する要素
	const selectImageElement = document.getElementById('select-image') as HTMLTemplateElement | null;

	if (messageCtrlElement !== null && markdownMessagesElement !== null && messagePreviewElement !== null && selectImageElement !== null) {
		const exec = async (): Promise<void> => {
			await preview({
				ctrl: messageCtrlElement,
				messages: markdownMessagesElement,
				preview: messagePreviewElement,
			});
			messageImage({
				preview: messagePreviewElement,
				image: selectImageElement,
			});
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

/* メディア登録 */
{
	const formElement = document.getElementById('media-form') as HTMLFormElement | null; // 送信フォーム
	const resultElement = document.getElementById('media-result') as HTMLTemplateElement | null; // 実行結果を表示する要素

	if (resultElement !== null) {
		formElement?.addEventListener('submit', (ev: SubmitEvent) => {
			ev.preventDefault();

			const { elements } = ev.target as HTMLFormElement;

			const filesElement = elements.namedItem('files');
			const overwriteElement = elements.namedItem('overwrite');

			const files = filesElement instanceof HTMLInputElement ? filesElement.files : null;
			const overwrite = overwriteElement instanceof HTMLInputElement && overwriteElement.checked;

			const formData = new FormData();
			if (files !== null) {
				Array.from(files).forEach((file) => {
					formData.append('files', file);
				});
			}
			if (overwrite) {
				formData.append('overwrite', 'on');
			}

			fetch('/api/media', {
				method: 'POST',
				body: formData,
			})
				.then(async (response) => {
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

					const responseJson = (await response.json()) as ApiResponseMediaUpload;

					const fragment = document.createDocumentFragment();
					if ('error' in responseJson) {
						const clone = resultElement.content.cloneNode(true) as HTMLElement;

						const successElement = clone.querySelector<HTMLElement>('.js-success');
						if (successElement !== null) {
							successElement.hidden = true;
						}

						const errorElement = clone.querySelector<HTMLElement>('.js-error');
						if (errorElement !== null) {
							const messageElement = errorElement.querySelector<HTMLElement>('.js-message');
							if (messageElement !== null) {
								messageElement.textContent = responseJson.error.message;
							}
						}

						fragment.appendChild(clone);
					}
					if ('results' in responseJson) {
						responseJson.results.forEach((result) => {
							const clone = resultElement.content.cloneNode(true) as HTMLElement;

							const successElement = clone.querySelector<HTMLElement>('.js-success');
							if (successElement !== null) {
								successElement.hidden = !result.success;
							}

							const errorElement = clone.querySelector<HTMLElement>('.js-error');
							if (errorElement !== null) {
								errorElement.hidden = result.success;
							}

							const messageElement = (result.success ? successElement : errorElement)?.querySelector<HTMLElement>('.js-message');
							messageElement?.setHTMLUnsafe(
								`${result.message}: <code>${result.filename}</code> ${result.thumbnails !== undefined ? `（サムネイル生成 ${String(result.thumbnails.length)} 件）` : ''}`,
							);

							fragment.appendChild(clone);
						});
					}
					resultElement.parentNode?.appendChild(fragment);
				})
				.catch((e: unknown) => {
					throw e;
				});
		});
	}
}

/* DSG キャッシュクリア */
{
	const buttonElement = document.getElementById('clear-button') as HTMLButtonElement | null; // 実行ボタン
	const resultElement = document.getElementById('clear-result') as HTMLTemplateElement | null; // 実行結果を表示する要素

	if (resultElement !== null) {
		buttonElement?.addEventListener(
			'click',
			() => {
				fetch('/api/clear', {
					method: 'POST',
				})
					.then(async (response) => {
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

						const responseJson = (await response.json()) as ApiResponseClear;

						const fragment = document.createDocumentFragment();
						if ('error' in responseJson) {
							const clone = resultElement.content.cloneNode(true) as HTMLElement;

							const successElement = clone.querySelector<HTMLElement>('.js-success');
							if (successElement !== null) {
								successElement.hidden = true;
							}

							const errorElement = clone.querySelector<HTMLElement>('.js-error');
							if (errorElement !== null) {
								const messageElement = errorElement.querySelector<HTMLElement>('.js-message');
								if (messageElement !== null) {
									messageElement.textContent = responseJson.error.message;
								}
							}

							fragment.appendChild(clone);
						}
						if ('processes' in responseJson) {
							responseJson.processes.forEach((result) => {
								const clone = resultElement.content.cloneNode(true) as HTMLElement;

								const successElement = clone.querySelector<HTMLElement>('.js-success');
								if (successElement !== null) {
									successElement.hidden = !result.success;
								}

								const errorElement = clone.querySelector<HTMLElement>('.js-error');
								if (errorElement !== null) {
									errorElement.hidden = result.success;
								}

								const messageElement = (result.success ? successElement : errorElement)?.querySelector<HTMLElement>('.js-message');
								if (messageElement !== null && messageElement !== undefined) {
									messageElement.textContent = result.message;
								}

								fragment.appendChild(clone);
							});
						}
						resultElement.parentNode?.appendChild(fragment);
					})
					.catch((e: unknown) => {
						throw e;
					});
			},
			{ passive: true },
		);
	}
}
