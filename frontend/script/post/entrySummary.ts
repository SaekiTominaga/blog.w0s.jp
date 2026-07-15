import type { EntriesSummary as ApiResponseEntriesSummary, EntrySummaryData as ApiResponseEntrySummaryData } from '../../../@types/api';
import { clear as templateClear, update as updateTemplate } from '../util/template.ts';

/**
 * 本文のプレビューを実施
 *
 * @param $template - 本文プレビューを表示する要素
 * @param datas - 本文の HTML
 */
const display = ($template: HTMLTemplateElement, datas: readonly (ApiResponseEntrySummaryData | string)[]): void => {
	templateClear($template);

	datas.forEach((data) => {
		const $templateContent = $template.content.cloneNode(true) as HTMLElement;

		if (typeof data === 'string') {
			const $li = $templateContent.querySelector('li');
			$li?.setHTMLUnsafe(data);
		} else {
			const { id, title, registed } = data;

			if (title === undefined || registed === undefined) {
				const $li = $templateContent.querySelector('li');
				$li?.setHTMLUnsafe(`<strong>記事 ID ${String(id)} は存在しないか非公開</strong>`);
			} else {
				const $anchor = $templateContent.querySelector<HTMLAnchorElement>('.js-anchor');
				if ($anchor !== null) {
					$anchor.href = `/entry/${String(id)}`;
					$anchor.textContent = title;
				}

				const $registed = $templateContent.querySelector('.js-registed');
				if ($registed !== null) {
					const registedDate = new Date(registed);
					$registed.textContent = `${String(registedDate.getFullYear())}年${String(registedDate.getMonth() + 1)}月${String(registedDate.getDate())}日`;
				}
			}
		}

		updateTemplate($template, $templateContent);
	});
};

const exec = async ($ctrl: HTMLInputElement, $output: HTMLTemplateElement): Promise<void> => {
	const entryIds = $ctrl.value.split(',').filter((entryId) => entryId !== '');
	if (entryIds.length === 0) {
		templateClear($output);
		return;
	}

	const urlSearchParams = new URLSearchParams();
	entryIds.forEach((entryId) => {
		urlSearchParams.append('id', entryId);
	});

	const response = await fetch(`/api/summary?${urlSearchParams.toString()}`);

	const responseJson = (await response.json()) as ApiResponseEntriesSummary;

	if ('error' in responseJson) {
		display($output, [`<strong>${String(response.status)} ${response.statusText}: ${responseJson.error.message}</strong>`]);
	}
	if ('data' in responseJson) {
		display($output, responseJson.data);
	}
};

/**
 * 記事の概要情報を取得して表示する
 *
 * @param $ctrls - 記事 ID の入力欄
 * @param options - オプション
 * @param options.load - ページロード時の処理を行うかどうか
 */
const entrySummary = async (
	$ctrls: NodeListOf<Element>,
	options: {
		load: boolean;
	},
): Promise<void> => {
	await Promise.all(
		Array.from($ctrls).map(async ($ctrl) => {
			if (!($ctrl instanceof HTMLInputElement)) {
				throw new Error('Element must be a `HTMLInputElement`');
			}

			const outputId = $ctrl.dataset['output'];
			if (outputId === undefined) {
				throw new Error('The `data-output` attribute is not set');
			}
			const $output = document.getElementById(outputId);
			if ($output === null) {
				throw new Error(`Element \`#${outputId}\` not found`);
			}
			if (!($output instanceof HTMLTemplateElement)) {
				throw new Error(`Element \`#${outputId}\` must be a \`HTMLTemplateElement\``);
			}

			if (options.load) {
				await exec($ctrl, $output);
			}
			$ctrl.addEventListener(
				'change',
				() => {
					exec($ctrl, $output).catch((e: unknown) => {
						throw e;
					});
				},
				{ passive: true },
			);
		}),
	);
};
export default entrySummary;
