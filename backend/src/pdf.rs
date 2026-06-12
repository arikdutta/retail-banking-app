use std::sync::OnceLock;

use chrono::{Datelike, Duration, NaiveDate, Utc};
use typst::diag::{FileError, FileResult};
use typst::foundations::{Bytes, Datetime};
use typst::syntax::{FileId, Source, VirtualPath};
use typst::text::{Font, FontBook};
use typst::utils::LazyHash;
use typst::Library;

use crate::domain::transactions::model::Transaction;

static FONTS: OnceLock<(LazyHash<FontBook>, Vec<Font>)> = OnceLock::new();

fn fonts() -> &'static (LazyHash<FontBook>, Vec<Font>) {
    FONTS.get_or_init(|| {
        let mut book = FontBook::new();
        let mut fonts = Vec::new();
        for data in typst_assets::fonts() {
            let buffer = Bytes::new(data);
            for font in Font::iter(buffer) {
                book.push(font.info().clone());
                fonts.push(font);
            }
        }
        (LazyHash::new(book), fonts)
    })
}

struct StatementWorld {
    library: LazyHash<Library>,
    source:  Source,
}

impl StatementWorld {
    fn new(source: String) -> Self {
        let id = FileId::new(None, VirtualPath::new("/statement.typ"));
        Self { library: LazyHash::new(Library::default()), source: Source::new(id, source) }
    }
}

impl typst::World for StatementWorld {
    fn library(&self) -> &LazyHash<Library> { &self.library }
    fn book(&self)    -> &LazyHash<FontBook> { &fonts().0 }
    fn main(&self)    -> FileId              { self.source.id() }

    fn source(&self, id: FileId) -> FileResult<Source> {
        if id == self.source.id() {
            Ok(self.source.clone())
        } else {
            Err(FileError::NotFound(id.vpath().as_rootless_path().into()))
        }
    }

    fn file(&self, id: FileId) -> FileResult<Bytes> {
        Err(FileError::NotFound(id.vpath().as_rootless_path().into()))
    }

    fn font(&self, index: usize) -> Option<Font> {
        fonts().1.get(index).cloned()
    }

    fn today(&self, offset: Option<i64>) -> Option<Datetime> {
        let now = Utc::now();
        let dt  = offset.map_or(now, |h| now + Duration::hours(h));
        Datetime::from_ymd(dt.year(), dt.month() as u8, dt.day() as u8)
    }
}

pub async fn generate_statement_pdf(
    transactions: &[Transaction],
    user_email: &str,
    from: NaiveDate,
    to: NaiveDate,
) -> Result<Vec<u8>, String> {
    let source = build_source(transactions, user_email, from, to);
    tokio::task::spawn_blocking(move || compile_typst(source))
        .await
        .map_err(|e| e.to_string())?
}

pub fn compile_typst(source: String) -> Result<Vec<u8>, String> {
    let world  = StatementWorld::new(source);
    let result = typst::compile(&world);
    for w in &result.warnings {
        tracing::warn!(msg = %w.message, "typst warning");
    }
    let doc = result.output.map_err(|errs| {
        let msg = errs.iter().map(|e| e.message.to_string()).collect::<Vec<_>>().join("; ");
        tracing::error!(msg, "typst compile error");
        msg
    })?;
    typst_pdf::pdf(&doc, &typst_pdf::PdfOptions::default())
        .map_err(|errs| errs.iter().map(|e| e.message.to_string()).collect::<Vec<_>>().join("; "))
}

fn esc(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 8);
    for ch in s.chars() {
        match ch {
            '#' | '@' | '*' | '_' | '$' | '\\' | '`' => { out.push('\\'); out.push(ch); }
            '<' => out.push_str("\\<"),
            '>' => out.push_str("\\>"),
            _   => out.push(ch),
        }
    }
    out
}

pub fn build_source(
    transactions: &[Transaction],
    user_email: &str,
    from: NaiveDate,
    to: NaiveDate,
) -> String {
    let rows: String = transactions
        .iter()
        .map(|t| {
            let date   = t.created_at.format("%b %d, %Y").to_string();
            let desc   = esc(&t.description);
            let cat    = esc(&t.category);
            let sign   = if t.amount >= rust_decimal::Decimal::ZERO { "+" } else { "" };
            let amount = format!("{}{}", sign, t.amount);
            let status = esc(&t.status);
            format!("  [{}], [{}], [{}], [{}], [{}],\n", date, desc, cat, amount, status)
        })
        .collect();

    let navy = "#1E3A5F";
    let gray = "#666666";
    let border = "#E0E0E0";
    let header_bg = "#EEF2FF";

    format!(
        r#"#set page(paper: "a4", margin: (x: 2.2cm, y: 2.5cm))
#set text(size: 10pt, fill: rgb("{text_color}"))
#set par(leading: 0.6em)

#align(center)[
  #text(size: 22pt, weight: "bold", fill: rgb("{navy}"))[Transaction Statement]
]
#v(0.4em)
#align(center)[
  #text(size: 9pt, fill: rgb("{gray}"))[Account: {email}]
  #linebreak()
  #text(size: 9pt, fill: rgb("{gray}"))[Period: {from} — {to}]
]
#v(0.8em)
#line(length: 100%, stroke: 0.5pt + rgb("{border}"))
#v(0.8em)

#table(
  columns: (6em, 1fr, 5em, 5em, 5em),
  inset: (x: 7pt, y: 5pt),
  stroke: 0.4pt + rgb("{border}"),
  fill: (col, row) => if row == 0 {{ rgb("{header_bg}") }} else {{ white }},
  table.header(
    [*Date*], [*Description*], [*Category*], [*Amount*], [*Status*],
  ),
{rows})

#v(0.8em)
#text(size: 8pt, fill: rgb("{gray}"))[Generated on {generated}]
"#,
        text_color = "#222222",
        navy       = navy,
        gray       = gray,
        border     = border,
        header_bg  = header_bg,
        email      = esc(user_email),
        from       = from.format("%b %d, %Y"),
        to         = to.format("%b %d, %Y"),
        rows       = rows,
        generated  = Utc::now().format("%B %d, %Y"),
    )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;
    use rust_decimal::Decimal;
    use std::str::FromStr;
    use uuid::Uuid;

    use crate::domain::transactions::model::Transaction;

    fn make_date(y: i32, m: u32, d: u32) -> NaiveDate {
        NaiveDate::from_ymd_opt(y, m, d).unwrap()
    }

    fn make_tx(description: &str, category: &str, amount: &str, status: &str) -> Transaction {
        Transaction {
            unid:         Uuid::new_v4(),
            account_unid: Uuid::new_v4(),
            description:  description.into(),
            category:     category.into(),
            amount:       Decimal::from_str(amount).unwrap(),
            currency:     "USD".into(),
            status:       status.into(),
            created_at:   Utc.with_ymd_and_hms(2024, 3, 15, 10, 0, 0).unwrap(),
        }
    }

    // ── build_source ─────────────────────────────────────────────────────────

    #[test]
    fn source_contains_email_and_period() {
        let source = build_source(&[], "alice@example.com", make_date(2024, 1, 1), make_date(2024, 3, 31));
        assert!(source.contains("alice@example.com") || source.contains("alice\\@example.com"),
            "email must appear in source");
        assert!(source.contains("Jan 01, 2024") || source.contains("Jan 1, 2024"));
    }

    #[test]
    fn source_contains_transaction_row() {
        let txs = vec![make_tx("Netflix subscription", "Entertainment", "-14.99", "completed")];
        let source = build_source(&txs, "user@test.com", make_date(2024, 3, 1), make_date(2024, 3, 31));
        assert!(source.contains("Netflix subscription"));
        assert!(source.contains("Entertainment"));
        assert!(source.contains("-14.99"));
        assert!(source.contains("completed"));
    }

    #[test]
    fn source_prefixes_positive_amount_with_plus() {
        let txs = vec![make_tx("Salary", "Income", "3200.00", "completed")];
        let source = build_source(&txs, "u@u.com", make_date(2024, 1, 1), make_date(2024, 1, 31));
        assert!(source.contains("+3200.00"), "positive amounts get '+' prefix");
    }

    #[test]
    fn source_escapes_special_chars_in_description() {
        let txs = vec![make_tx("Acme #1 — $100 deal", "Shopping", "-100.00", "completed")];
        let source = build_source(&txs, "u@u.com", make_date(2024, 1, 1), make_date(2024, 1, 31));
        assert!(!source.contains("Acme #1"), "unescaped # must not appear");
        assert!(source.contains("\\#"), "# must be escaped");
        assert!(source.contains("\\$"), "$ must be escaped");
    }

    #[test]
    fn source_empty_transactions_still_compiles() {
        let source = build_source(&[], "u@u.com", make_date(2024, 1, 1), make_date(2024, 1, 31));
        assert!(source.contains("Transaction Statement"));
    }

    // ── compile_typst (integration) ──────────────────────────────────────────

    #[test]
    fn compile_empty_produces_valid_pdf() {
        let source = build_source(&[], "test@example.com", make_date(2024, 1, 1), make_date(2024, 3, 31));
        let bytes = compile_typst(source).expect("typst compile failed");
        assert!(bytes.starts_with(b"%PDF"), "output must be a PDF");
        assert!(bytes.len() > 1024, "PDF suspiciously small");
    }

    #[test]
    fn compile_with_transactions_produces_valid_pdf() {
        let txs = vec![
            make_tx("Netflix",      "Entertainment", "-14.99",  "completed"),
            make_tx("Salary",       "Income",        "+3200.00","completed"),
            make_tx("Uber Eats",    "Food",          "-32.50",  "pending"),
            make_tx("Bank charge",  "Fees",          "-5.00",   "failed"),
        ];
        let source = build_source(&txs, "alice@bank.com", make_date(2024, 3, 1), make_date(2024, 3, 31));
        let bytes = compile_typst(source).expect("typst compile failed");
        assert!(bytes.starts_with(b"%PDF"));
    }

    #[test]
    fn compile_with_special_chars_in_fields() {
        let txs = vec![make_tx(
            "L'Atelier & Co. <ref #42> $$$",
            "Shopping @home",
            "-99.99",
            "completed",
        )];
        let source = build_source(&txs, "user+test@example.com", make_date(2024, 1, 1), make_date(2024, 1, 31));
        compile_typst(source).expect("special chars must not break Typst");
    }

    #[test]
    fn compile_with_many_rows_produces_valid_pdf() {
        let txs: Vec<Transaction> = (1..=30)
            .map(|i| make_tx(&format!("Transaction {i}"), "General", &format!("-{}.00", i * 10), "completed"))
            .collect();
        let source = build_source(&txs, "user@bank.com", make_date(2024, 1, 1), make_date(2024, 12, 31));
        let bytes = compile_typst(source).expect("multi-row compile failed");
        assert!(bytes.starts_with(b"%PDF"));
    }
}
