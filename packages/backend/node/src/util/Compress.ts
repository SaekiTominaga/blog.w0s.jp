import zlib from 'zlib';

/**
 * Compression functionality
 */
export default class Compress {
	/**
	 * Compress a UTF-8 text with BrotliCompress.
	 *
	 * @param string - Text data to be compressed
	 *
	 * @returns Compressed data
	 */
	static brotliText(string: string): Buffer {
		return zlib.brotliCompressSync(string, {
			params: {
				[zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
				[zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
				[zlib.constants.BROTLI_PARAM_SIZE_HINT]: string.length,
			}, // https://nodejs.org/api/zlib.html#compressor-options
		});
	}
}
