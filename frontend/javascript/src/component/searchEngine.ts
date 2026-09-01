export default ($target: Element | null): void => {
	if ($target === null) {
		return;
	}

	if (!($target instanceof HTMLSelectElement)) {
		throw new TypeError('Element must be a `HTMLSelectElement`');
	}

	const { storageKey } = $target.dataset;
	if (storageKey === undefined) {
		throw new TypeError('The `data-storage-key` attribute is not set');
	}

	document.addEventListener(
		'DOMContentLoaded',
		() => {
			let storageValue: string | undefined;
			try {
				storageValue = localStorage.getItem(storageKey) ?? undefined;
			} catch {}
			if (storageValue === undefined) {
				return;
			}

			$target.value = storageValue;
		},
		{ passive: true },
	);
	$target.addEventListener(
		'change',
		(ev: Event) => {
			const { value } = ev.target as HTMLSelectElement;

			try {
				localStorage.setItem(storageKey, value);
			} catch {}
		},
		{ passive: true },
	);
};
