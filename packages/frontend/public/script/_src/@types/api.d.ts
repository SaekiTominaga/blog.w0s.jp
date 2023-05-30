declare namespace BlogApi {
	export type TweetMedia = {
		media_urls: string[];
	};

	export interface AmazonImage {
		image_urls: string[];
		errors: string[];
	}
}
