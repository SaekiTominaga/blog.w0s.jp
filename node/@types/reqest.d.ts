declare namespace BlogRequest {
	export interface List {
		page: number;
	}

	export interface Amazon {
		asin: string | null;
		action_delete: boolean;
	}
}
