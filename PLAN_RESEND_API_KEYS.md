# Plan: Resend API Keys

Goal: get the minimum Resend credentials needed to send emails from the banking app.

## What we need

- `RESEND_API_KEY`
- `EMAIL_FROM`

Optional:

- `RESEND_API_URL`
  Default: `https://api.resend.com/emails`

## Steps

1. Create or log into a Resend account.

2. Go to the API keys section.

3. Create a new API key for backend/server use.

4. Copy the key and store it as:

```env
RESEND_API_KEY=re_xxxxxxxxx
```

5. Choose a sender address.

For early testing, use a Resend-provided sender if available.
If using your own domain later, verify the domain in Resend first.

6. Store the sender as:

```env
EMAIL_FROM=Retail Banking <onboarding@mail.rustfinance.com>
```

## Local env example

```env
RESEND_API_KEY=re_xxxxxxxxx
EMAIL_FROM=Retail Banking <onboarding@mail.rustfinance.com>
RESEND_API_URL=https://api.resend.com/emails
```

## Done when

- The API key exists
- The sender email is chosen
- Both values are available in local env or deployment secrets

## Notes

- Do not expose `RESEND_API_KEY` in frontend code.
- This key must stay backend-only.
