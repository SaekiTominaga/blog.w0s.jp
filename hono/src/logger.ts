import nodemailer from 'nodemailer';
import pino, { type Logger } from 'pino';
import { env } from '@w0s/env-value-type';

const development = process.env['NODE_ENV'] !== 'production';

const sendErrorMail = async (message: string): Promise<void> => {
	const transporter = nodemailer.createTransport({
		port: env('MAIL_PORT', 'number'),
		host: env('MAIL_SMTP'),
		auth: {
			user: env('MAIL_USER'),
			pass: env('MAIL_PASSWORD'),
		},
	});

	await transporter.sendMail({
		from: env('MAIL_FROM'),
		to: env('LOGGER_MAIL_TO'),
		subject: env('LOGGER_MAIL_TITLE'),
		text: message,
	});
};

export const getLogger = (name: string): Logger => {
	const logger = pino({
		name: name,
		level: development ? 'trace' : 'info',
		transport: {
			targets: development
				? [
						{
							/* 標準出力 */
							target: 'pino-pretty',
							options: {
								colorize: true,
								translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
								ignore: 'pid,hostname',
								destination: 1,
							},
						},
					]
				: [
						{
							/* ファイル書き込み */
							target: 'pino-pretty',
							options: {
								colorize: false,
								translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
								ignore: 'pid,hostname',
								destination: `${env('ROOT')}/${env('LOGGER_FILE_HONO')}`,
								mkdir: true,
							},
						},
					],
		},
		hooks: {
			logMethod(args, method, level) {
				if (!development && level >= 50 /* https://getpino.io/#/docs/api?id=logger-level */) {
					/* メール送信 */
					const message = args
						.map((arg) => {
							if (arg instanceof Error) {
								return arg.stack;
							}

							if (arg !== null && typeof arg === 'object') {
								return `{ ${Object.entries(arg)
									.map(([key, value]) => `${key}: ${String(value)}`)
									.join(', ')} }`;
							}

							return arg;
						})
						.join(' ');

					sendErrorMail(message).catch(console.error);
				}
				method.apply(this, args);
			},
		},
	});

	return logger;
};
