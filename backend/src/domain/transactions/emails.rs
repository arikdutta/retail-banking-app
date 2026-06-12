use chrono::NaiveDate;

pub fn build_statement_email_html(from: NaiveDate, to: NaiveDate) -> String {
    format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#fff;border-radius:16px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
        <tr><td>
          <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827">Your transaction statement is ready</p>
          <p style="margin:0 0 24px;font-size:14px;color:#6b7280">
            Attached is your PDF statement for <strong>{from}</strong> to <strong>{to}</strong>.
          </p>
          <p style="margin:0;font-size:13px;color:#4b5563">
            You can also download the same file from the Transactions page in the app.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"#,
        from = from.format("%B %d, %Y"),
        to = to.format("%B %d, %Y"),
    )
}
