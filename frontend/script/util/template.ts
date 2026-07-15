export const clear = ($template: HTMLTemplateElement): void => {
	const $parent = $template.parentElement;
	if ($parent !== null) {
		$parent.hidden = true;
	}

	Array.from($template.parentNode?.children ?? [])
		.filter((element) => element !== $template)
		.forEach((element) => {
			element.remove();
		});
};

export const update = ($template: HTMLTemplateElement, $templateContent: HTMLElement): void => {
	const fragment = document.createDocumentFragment();
	fragment.appendChild($templateContent);

	$template.parentNode?.appendChild(fragment);

	const $parent = $template.parentElement;
	if ($parent !== null) {
		$parent.hidden = false;
	}
};
