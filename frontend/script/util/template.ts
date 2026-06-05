export const clear = (template: HTMLTemplateElement): void => {
	Array.from(template.parentNode?.children ?? [])
		.filter((element) => element !== template)
		.forEach((element) => {
			element.remove();
		});
};

export const update = (template: HTMLTemplateElement, templateFragment: HTMLElement): void => {
	const fragment = document.createDocumentFragment();
	fragment.appendChild(templateFragment);

	template.parentNode?.appendChild(fragment);
};
