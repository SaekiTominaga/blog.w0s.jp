declare namespace BlogDb {
	export interface TopicData {
		id: number;
		title: string;
		description: string | null;
		message: string;
		image_internal: string | null;
		image_external: string | null;
		insert_date: Date;
		last_update: Date | null;
		public: boolean;
	}

	export interface CategoryMaster {
		id: string;
		name: string;
		catgroup: string;
		sort: number;
		sidebar_amazon: string | null;
		book: string | null;
	}

	export interface AmazonData {
		asin: string;
		url: string;
		title: string;
		binding: string | null;
		product_group: string | null;
		date: Date | null;
		image_url: string | null;
		image_width: number | null;
		image_height: number | null;
		last_update: Date;
	}

	export interface TweetData {
		id: string;
		name: string;
		username: string;
		text: string;
		created_at: Date;
	}
}
