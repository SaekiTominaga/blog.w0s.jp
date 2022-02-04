declare namespace BlogRequest {
	interface List {
		page: number;
	}

	interface Entry {
		entry_id: number;
	}

	interface Category {
		category_name: string;
	}

	interface Post {
		id: number | null;
		title: string | null;
		description: string | null;
		message: string | null;
		category: Set<string>;
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

	interface Amazon {
		asin: string | null;
		action_delete: boolean;
	}

	interface ApiAmazonImage {
		asin: Set<string>;
	}

	interface ApiPreview {
		markdown: string | null;
	}

	interface ApiTweetMedia {
		id: Set<string>;
	}
}
