import util from 'node:util';
import zlib from 'node:zlib';

/**
 * Compress a UTF-8 text with Brotli
 *
 * @param text - Text data to be compressed
 *
 * @returns Compressed data
 */
export const brotliCompressText = async (text: string): Promise<Buffer> => {
	const brotliCompress = util.promisify(zlib.brotliCompress);

	return brotliCompress(text, {
		params: {
			[zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
			[zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
			[zlib.constants.BROTLI_PARAM_SIZE_HINT]: text.length,
		}, // https://nodejs.org/api/zlib.html#compressor-options
	});
};
