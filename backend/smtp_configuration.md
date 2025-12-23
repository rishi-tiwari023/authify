# SMTP Configuration Guide for Authify

This guide explains how to configure the SMTP settings for the Authify backend to enable email functionality (Welcome emails, Password Resets, Verification emails).

## 1. Locate the Configuration File

Navigate to the `backend` directory of the project. You should see a file named `.env`. If it doesn't exist, copy `.env.example` to `.env`.

```bash
cp .env.example .env
```

## 2. Required Variables

Open the `.env` file and look for the **Email / SMTP** section. You need to configure the following variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `SMTP_HOST` | The hostname of your SMTP provider | `smtp.gmail.com` |
| `SMTP_PORT` | The port to connect to | `587` (TLS) or `465` (SSL) |
| `SMTP_SECURE`| Set to `true` for port 465, `false` for other ports | `false` |
| `SMTP_USER` | Your email address or username | `user@example.com` |
| `SMTP_PASS` | Your email password or app password | `secretpassword` |
| `EMAIL_FROM` | The email address sending the mail | `noreply@myapp.com` |
| `EMAIL_FROM_NAME` | The name displayed as the sender | `Authify Support` |

## 3. Provider Examples

### Option A: Ethereal Email (Recommended for Development)
[Ethereal](https://ethereal.email/) is a fake SMTP service strictly for testing. It catches emails so you can view them online without spamming real users.

1. Go to [ethereal.email](https://ethereal.email) and click "Create Account".
2. Copy the credentials provided.
3. Update your `.env` file:

```ini
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_ethereal_username@ethereal.email
SMTP_PASS=your_ethereal_password
```

### Option B: Gmail (Personal Account)
To use Gmail, you must enable 2-Step Verification and create an **App Password**. You cannot use your regular login password.

1. Go to your [Google Account Security settings](https://myaccount.google.com/security).
2. Enable **2-Step Verification**.
3. Under "Signing in to Google", select **App passwords**.
4. Create a new App Password (select "Mail" and "Other" -> "Authify").
5. Update your `.env` file:

```ini
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_gmail_address@gmail.com
SMTP_PASS=your_16_digit_app_password
```

### Option C: Transactional Email Services (SendGrid, Mailgun, AWS SES)
For production, use a dedicated transactional email service.

**Example for SendGrid:**
```ini
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key_starting_with_SG
```

## 4. Verification

1. Save the `.env` file.
2. Restart your backend server for the changes to take effect.
3. Try signing up a new user or requesting a password reset.
4. Check the backend logs. If configured correctly, you should no longer see the `[EmailService] SMTP not configured` warning.
