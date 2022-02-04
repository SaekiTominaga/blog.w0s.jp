declare namespace BlogDb {
	interface Entry {
		id: number;
		title: string;
		description: string | null;
		message: string;
		image_internal: string | null;
		image_external: string | null;
		created_at: Date;
		updated_at: Date | null;
		public: boolean;
	}

	interface AmazonData {
		asin: string;
		url: string;
		title: string;
		binding: string | null;
		product_group: string | null;
		publication_date: Date | null;
		image_url: string | null;
		image_width: number | null;
		image_height: number | null;
		updated_at: Date;
	}

	interface TweetData {
		id: string;
		name: string;
		username: string;
		text: string;
		created_at: Date;
	}
}
