import BlogDao from '../src/dao/BlogDao';
import MessageParser from '../src/util/MessageParser';

describe('正常系', () => {
	test('p', () => {
		const messageParser = new MessageParser(1, new BlogDao());
		expect(
			messageParser.toHtml(`
hoge
`)
		).toBe('<div class="p-topic-main" itemprop="articleBody"><p class="p-topic-text">hoge</p></div>');
	});
});
