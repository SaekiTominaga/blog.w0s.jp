import formBeforeUnloadConfirm from '@w0s/form-before-unload-confirm';
import formSubmitOverlay from '@w0s/form-submit-overlay';
import { escape } from '@w0s/html-escape';
import inputFilePreview from '@w0s/input-file-preview';
import { convert } from '@w0s/string-convert';
import type { MediaUploadData as ApiMediaUploadData, Post as ApiPost, PostData as ApiPostData } from '../../@types/api.d.ts';
import messageImage from './post/messageImage.ts';
import messageTitle from './post/messageTitle.ts';
import preview from './post/preview.ts';
import reportJsError from './util/reportJsError.ts';
import trustedTypes from './util/trustedTypes.ts';
import { clear as templateClear, update as updateTemplate } from './util/template.ts';

/* JS エラーレポート */
reportJsError();

/* Trusted Types */
trustedTypes();

/* 入力値の変換 */
document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('.js-convert-trim').forEach(($formCtrl) => {
	$formCtrl.addEventListener(
		'change',
		() => {
			$formCtrl.value = convert($formCtrl.value, {
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
						HTMLButtonElement | HTMLFieldSetElement | HTMLInputElement | HTMLOptGroupElement | HTMLSelectElement | HTMLTextAreaElement
				).disabled = !element.checked;
			});
		},
		{ passive: true },
	);
});

/**
 * 本文に関する処理
 *
 * @param elementsSelector - 要素のセレクター
 * @param elementsSelector.titleCtrl - タイトルの入力コントロール
 * @param elementsSelector.messageCtrl - 本文の入力コントロール
 * @param elementsSelector.markdownMessages - Markdown 変換結果のメッセージを表示する要素
 * @param elementsSelector.preview - 本文プレビューを表示する要素
 * @param elementsSelector.selectImage - 記事画像
 */
const messageCtrl = async (elementsSelector: { titleCtrl: string; messageCtrl: string; markdownMessages: string; preview: string; selectImage: string }) => {
	const $titleCtrl = document.querySelector(elementsSelector.titleCtrl);
	if ($titleCtrl === null || !($titleCtrl instanceof HTMLInputElement)) {
		throw new Error(`\`${elementsSelector.titleCtrl}\` is not HTMLInputElement`);
	}

	const $messageCtrl = document.querySelector(elementsSelector.messageCtrl);
	if ($messageCtrl === null || !($messageCtrl instanceof HTMLTextAreaElement)) {
		throw new Error(`\`${elementsSelector.messageCtrl}\` is not HTMLTextAreaElement`);
	}

	const $markdownMessages = document.querySelector(elementsSelector.markdownMessages);
	if ($markdownMessages === null || !($markdownMessages instanceof HTMLTemplateElement)) {
		throw new Error(`\`${elementsSelector.markdownMessages}\` is not HTMLTemplateElement`);
	}

	const $messagePreview = document.querySelector(elementsSelector.preview);
	if ($messagePreview === null || !($messagePreview instanceof HTMLTemplateElement)) {
		throw new Error(`\`${elementsSelector.preview}\` is not HTMLTemplateElement`);
	}

	const $selectImage = document.querySelector(elementsSelector.selectImage);
	if ($selectImage === null || !($selectImage instanceof HTMLTemplateElement)) {
		throw new Error(`\`${elementsSelector.selectImage}\` is not HTMLTemplateElement`);
	}

	const exec = async (): Promise<void> => {
		messageTitle({
			title: $titleCtrl,
			message: $messageCtrl,
		});

		messageImage({
			preview: $messagePreview,
			image: $selectImage,
		});

		await preview({
			ctrl: $messageCtrl,
			messages: $markdownMessages,
			preview: $messagePreview,
		});
	};

	await exec();
	$messageCtrl.addEventListener(
		'change',
		() => {
			exec().catch((e: unknown) => {
				throw e;
			});
		},
		{ passive: true },
	);
};

await messageCtrl({
	titleCtrl: '#fc-title',
	messageCtrl: '#fc-message',
	markdownMessages: '#js-markdown-messages',
	preview: '#js-preview',
	selectImage: '#js-select-image',
});

/**
 * JavaScript からのフォーム送信
 *
 * @param endpoint - エンドポイント
 * @param elementsSelector - 要素のセレクター
 * @param elementsSelector.form - 送信フォーム
 * @param elementsSelector.result - 実行結果を表示する要素
 * @param callbacks - コールバック関数
 * @param callbacks.successMessage - 正常時のメッセージを返す関数
 */
const formSubmitHook = <T extends ApiPostData>(
	endpoint: string,
	elementsSelector: {
		form: string;
		result: string;
	},
	callbacks?: {
		successMessage?: (response: Readonly<T>) => string;
	},
): void => {
	const submitterStatus = ($submitter: HTMLElement | null, status?: 'loading'): void => {
		if ($submitter !== null) {
			$submitter.dataset['status'] = status ?? '';
		}
	};

	const error = ($template: HTMLTemplateElement, message: string): void => {
		const templateFragment = $template.content.cloneNode(true) as HTMLElement;

		const $success = templateFragment.querySelector<HTMLElement>('.js-success');
		if ($success !== null) {
			$success.hidden = true;
		}

		const $message = templateFragment.querySelector<HTMLElement>('.js-message');
		if ($message !== null) {
			$message.textContent = message;
		}

		updateTemplate($template, templateFragment);
	};

	const $form = document.querySelector(elementsSelector.form); // 送信フォーム
	if (!($form instanceof HTMLFormElement)) {
		throw new Error(`\`${elementsSelector.form}\` is not HTMLFormElement`);
	}

	const $result = document.querySelector(elementsSelector.result); // 実行結果を表示する要素
	if (!($result instanceof HTMLTemplateElement)) {
		throw new Error(`\`${elementsSelector.result}\` is not HTMLTemplateElement`);
	}

	$form.addEventListener('submit', (ev: SubmitEvent) => {
		ev.preventDefault();

		const $target = ev.target as HTMLFormElement;
		const $submitter = ev.submitter;

		/* submit イベントを発生させた要素のステータスを変更 */
		submitterStatus($submitter, 'loading');

		/* いったんクリア */
		templateClear($result);

		fetch(endpoint, {
			method: $target.method,
			body: new FormData($target),
		})
			.then(async (response) => {
				if (!response.ok) {
					error($result, `${String(response.status)} ${response.statusText}`.trim());
					return;
				}

				const responseJson = (await response.json()) as ApiPost;

				if ('error' in responseJson) {
					error($result, response.statusText);
					return;
				}

				responseJson.forEach((result) => {
					const templateFragment = $result.content.cloneNode(true) as HTMLElement;

					const $success = templateFragment.querySelector<HTMLElement>('.js-success');
					if ($success !== null) {
						$success.hidden = !result.success;
					}

					const $error = templateFragment.querySelector<HTMLElement>('.js-error');
					if ($error !== null) {
						$error.hidden = result.success;
					}

					const $message = templateFragment.querySelector<HTMLElement>('.js-message');
					$message?.setHTMLUnsafe(callbacks?.successMessage !== undefined ? callbacks.successMessage(result as Readonly<T>) : result.message);

					updateTemplate($result, templateFragment);
				});
			})
			.catch((err: unknown) => {
				throw err;
			})
			.finally(() => {
				/* submit イベントを発生させた要素のステータスをリセットする */
				submitterStatus($submitter);
			});
	});
};

/* メディア登録 */
formSubmitHook(
	'/api/media',
	{
		form: '#js-media-form',
		result: '#js-media-result',
	},
	{
		successMessage: (result: Readonly<ApiMediaUploadData>): string =>
			`${escape(result.message)}: <code>${escape(result.filename)}</code>（サムネイル生成 ${escape(String(result.thumbnails?.length ?? 0))} 件）`,
	},
);

/* キャッシュクリア */
formSubmitHook('/api/clear', {
	form: '#js-clear-form',
	result: '#js-clear-result',
});
