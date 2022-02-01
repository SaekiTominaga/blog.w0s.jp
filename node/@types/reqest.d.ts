declare namespace BlogRequest {
	export interface List {
		page: number;
	}

	export interface Post {
		id: number | null;
		title: string | null;
		description: string | null;
		message: string | null;
		category: string[] | null;
		image: string | null;
		relation: string | null;
		public: boolean;
		timestamp: boolean;
		social: boolean;
		social_tag: string | null;
		media_overwrite: boolean;
		action_add: boolean;
		action_revise: boolean;
		action_revise_preview: boolean;
		action_media: boolean;
	}

	export interface Amazon {
		asin: string | null;
		action_delete: boolean;
	}
}
