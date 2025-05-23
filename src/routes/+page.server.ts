import type { Actions, ServerLoad } from '@sveltejs/kit';
import { RECAPTCHA_SECRET, RESEND_API_KEY } from '$env/static/private';
import { env } from '$env/dynamic/private';
import { statusScheme, validate, type Log } from './validator';
import { log } from './logger';
import { verifyCaptcha } from './captchaVerifier';
import { sendEmail } from './emailSender';
import { sendSlackNotification } from './slackNotifier';

export const load: ServerLoad = async ({ locals }) => {
	const { session } = locals;
	if (session.data.csrfToken === undefined) {
		await session.setData({ csrfToken: crypto.randomUUID() });
		await session.save();
	}

	return { csrfToken: session.data.csrfToken };
};

export const actions = {
	// default: async ({ locals, request, platform }) => {
	default: async ({ request, platform }) => {
		// const { session } = locals;

		// リクエストボディをオブジェクトに
		const rawRequestBody: Record<string, FormDataEntryValue> = {};
		(await request.formData()).forEach((value, key) => {
			rawRequestBody[key] = value;
		});

		// バリデーション
		const validationResult = validate(rawRequestBody);
		if (!validationResult.success) return { success: false, message: 'Invalid request' };
		const validatedRequestBody = validationResult.data;

		// id採番、送信日時取得
		const logData: Log = {
			id: crypto.randomUUID(),
			status: statusScheme.parse('received'),
			sentAt: new Date().toISOString(),
			...validationResult.data
		};

		// csrfトークンを検証
		// iframe内ではCookieが使えない？ため、暫定的にcsrfトークンの検証は行わない
		// if (session.data.csrfToken !== validatedRequestBody.csrfToken) {
		// 	logData.status = statusScheme.parse('invalid csrf');
		// 	await log(platform?.env.DB, logData);
		// 	return { success: false, message: 'Invalid csrf token' };
		// }

		// reCAPTCHAトークンを検証
		const captchaResult = await verifyCaptcha(
			validatedRequestBody.reCaptchaToken,
			RECAPTCHA_SECRET
		);
		if (!captchaResult) {
			logData.status = statusScheme.parse('invalid captcha');
			await log(platform?.env.DB, logData);
			return { success: false, message: 'Invalid captcha token' };
		}

		// メール送信
		await sendEmail(validatedRequestBody, RESEND_API_KEY);

		// Slack通知
		if (env.SLACK_WEBHOOK_URL) {
			const slackNotificationSuccess = await sendSlackNotification(validatedRequestBody);

			// Slack通知が失敗した場合のログ
			if (slackNotificationSuccess === false) {
				console.error('Slack通知の送信に失敗しました。環境変数の設定を確認してください。');
			}
		}

		// データベースにログ
		logData.status = statusScheme.parse('have sent email');
		await log(platform?.env.DB, logData);

		return { success: true };
	}
} satisfies Actions;
