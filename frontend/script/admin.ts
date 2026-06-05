import formBeforeUnloadConfirm from '@w0s/form-before-unload-confirm';
import formSubmitOverlay from '@w0s/form-submit-overlay';
import { escape } from '@w0s/html-escape';
import inputFilePreview from '@w0s/input-file-preview';
import { convert } from '@w0s/string-convert';
import type { MediaUploadData as ApiMediaUploadData, Post as ApiPost, PostData as ApiPostData } from '../../@types/api.d.ts';
import messageImage from './unique/messageImage.ts';
import preview from './unique/preview.ts';
import reportJsError from './util/reportJsError.ts';
import trustedTypes from './util/trustedTypes.ts';
import { clear as templateClear, update as updateTemplate } from './util/template.ts';

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

/**
 * フォーム送信
 *
 * @param options -
 * @param options.formSelector - 送信フォームのセレクター
 * @param options.resultSelector - 実行結果を表示する要素のセレクター
 * @param options.endpoint - エンドポイント
 * @param options.successMessageCallback - 正常時のメッセージを返す関数
 */
const formSubmitHook = <T extends ApiPostData>(options: {
	formSelector: string;
	resultSelector: string;
	endpoint: string;
	successMessageCallback?: (response: Readonly<T>) => string;
}): void => {
	const submitterStatus = (submitterElement: HTMLElement | null, status?: 'loading'): void => {
		if (submitterElement !== null) {
			submitterElement.dataset['status'] = status ?? '';
		}
	};

	const error = (template: HTMLTemplateElement, message: string): void => {
		const templateFragment = template.content.cloneNode(true) as HTMLElement;

		const successElement = templateFragment.querySelector<HTMLElement>('.js-success');
		if (successElement !== null) {
			successElement.hidden = true;
		}

		const messageElement = templateFragment.querySelector<HTMLElement>('.js-message');
		if (messageElement !== null) {
			messageElement.textContent = message;
		}

		updateTemplate(template, templateFragment);
	};

	const formElement = document.querySelector(options.formSelector); // 送信フォーム
	if (!(formElement instanceof HTMLFormElement)) {
		throw new Error(`\`${options.formSelector}\` is not HTMLFormElement`);
	}

	const resultTemplate = document.querySelector(options.resultSelector); // 実行結果を表示する要素
	if (!(resultTemplate instanceof HTMLTemplateElement)) {
		throw new Error(`\`${options.resultSelector}\` is not HTMLTemplateElement`);
	}

	formElement.addEventListener('submit', (ev: SubmitEvent) => {
		ev.preventDefault();

		const targetElement = ev.target as HTMLFormElement;
		const submitterElement = ev.submitter;

		/* submit イベントを発生させた要素のステータスを変更 */
		submitterStatus(submitterElement, 'loading');

		/* いったんクリア */
		templateClear(resultTemplate);

		fetch(options.endpoint, {
			method: targetElement.method,
			body: new FormData(targetElement),
		})
			.then(async (response) => {
				if (!response.ok) {
					error(resultTemplate, `${String(response.status)} ${response.statusText}`.trim());
					return;
				}

				const responseJson = (await response.json()) as ApiPost;

				if ('error' in responseJson) {
					error(resultTemplate, response.statusText);
					return;
				}

				responseJson.forEach((result) => {
					const templateFragment = resultTemplate.content.cloneNode(true) as HTMLElement;

					const successElement = templateFragment.querySelector<HTMLElement>('.js-success');
					if (successElement !== null) {
						successElement.hidden = !result.success;
					}

					const errorElement = templateFragment.querySelector<HTMLElement>('.js-error');
					if (errorElement !== null) {
						errorElement.hidden = result.success;
					}

					const messageElement = templateFragment.querySelector<HTMLElement>('.js-message');
					messageElement?.setHTMLUnsafe(options.successMessageCallback?.(result as Readonly<T>) ?? result.message);

					updateTemplate(resultTemplate, templateFragment);
				});
			})
			.catch((err: unknown) => {
				throw err;
			})
			.finally(() => {
				/* submit イベントを発生させた要素のステータスをリセットする */
				submitterStatus(submitterElement);
			});
	});
};

/* メディア登録 */
formSubmitHook({
	formSelector: '#media-form',
	resultSelector: '#media-result',
	endpoint: '/api/media',
	successMessageCallback: (result: Readonly<ApiMediaUploadData>): string =>
		`${escape(result.message)}: <code>${escape(result.filename)}</code>（サムネイル生成 ${escape(String(result.thumbnails?.length ?? 0))} 件）`,
});

/* キャッシュクリア */
formSubmitHook({
	formSelector: '#clear-form',
	resultSelector: '#clear-result',
	endpoint: '/api/clear',
});
