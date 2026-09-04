import nodemailer from 'nodemailer';
import winston from 'winston';
import TransportStream from 'winston-transport';
import { env } from '@w0s/env-value-type';

const development = process.env['NODE_ENV'] !== 'production';

class EmailTransport extends TransportStream {
	readonly #transporter: nodemailer.Transporter;

	constructor(options: TransportStream.TransportStreamOptions) {
		super(options);

		this.#transporter = nodemailer.createTransport({
			port: env('MAIL_PORT', 'number'),
			host: env('MAIL_SMTP'),
			auth: {
				user: env('MAIL_USER'),
				pass: env('MAIL_PASSWORD'),
			},
		});
	}

	override async log(info: winston.LogEntry, next: () => void): Promise<void> {
		this.emit('logged', info);

		// @ts-expect-error: ts(2538)
		const text = info[Symbol.for('message')] as string;

		await this.#transporter.sendMail({
			from: env('MAIL_FROM'),
			to: env('LOGGER_MAIL_TO'),
			subject: env('LOGGER_MAIL_TITLE'),
			text: text,
		});

		next();
	}
}

export const getLogger = (name: string): winston.Logger => {
	const logger = winston.createLogger(
		development
			? {
					level: 'silly',
					format: winston.format.combine(
						winston.format.colorize(),
						winston.format.label({ label: name }),
						winston.format.printf(({ level, label, message }) => `[${level}] ${String(label)} - ${String(message)}`),
					),
					transports: [new winston.transports.Console()],
				}
			: {
					level: 'info',
					format: winston.format.combine(
						winston.format.label({ label: name }),
						winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
						winston.format.printf(
							({ timestamp, level, label, message }) => `${String(timestamp)} [${level.toUpperCase()}] ${String(label)} - ${String(message)}`,
						),
					),
					transports: [
						new winston.transports.File({
							filename: `${env('ROOT')}/${env('LOGGER_FILE_HONO')}`,
						}),
						new EmailTransport({
							level: 'error',
						}),
					],
				},
	);

	return logger;
};
