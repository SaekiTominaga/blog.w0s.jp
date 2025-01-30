type VISIBILITY = 'public' | 'unlisted' | 'private' | 'direct';

export default {
	template: 'sns/mastodon.ejs',
	visibility: 'public' as VISIBILITY, // https://docs.joinmastodon.org/entities/Status/#visibility
};
