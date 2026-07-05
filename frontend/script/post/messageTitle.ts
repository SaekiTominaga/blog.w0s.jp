/**
 * 記事を解析してタイトル（`<h1>`）をタイトル入力欄に移設する
 *
 * @param element - HTML 要素
 */
const messageTitle = (
	element: Readonly<{
		title: HTMLInputElement; // タイトルの入力コントロール
		message: HTMLTextAreaElement; // 本文の入力コントロール
	}>,
) => {
	const { title: titleCtrlElement, message: messageCtrlElement } = element;

	const lines = messageCtrlElement.value.trim().split('\n');

	const firstLine = lines.at(0);
	if (firstLine === undefined) {
		return; // 型システム上必要だが実際は到達不能
	}

	const titleMatchGroups = /^# (?<title>.+?)$/v.exec(firstLine)?.groups;
	if (titleMatchGroups === undefined) {
		return;
	}

	const { title } = titleMatchGroups;
	if (title === undefined) {
		return; // 型システム上必要だが実際は到達不能
	}

	const otherTitle = lines.toSpliced(0, 1).join('\n').trim(); // タイトル以外

	titleCtrlElement.value = title;
	messageCtrlElement.value = otherTitle;
};
export default messageTitle;
