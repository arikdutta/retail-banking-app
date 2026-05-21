import { Github } from "lucide-react";

const footerLinks = {
  Explore: ["Packages", "Blog"],
  Products: ["Runtime", "Registry", "Edge"],
  "Use cases": [
    "Hosting for WordPress",
    "Free Static Site Hosting",
    "Free Web Hosting",
    "PHP Hosting",
    "Django Hosting",
  ],
  Company: ["About", "Values & Culture", "Pricing"],
};

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-label="Discord"
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
    </svg>
  );
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-label="Twitter/X"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-card mt-auto">
      {/* Main footer content */}
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1fr_repeat(4,auto)]">
          {/* Brand column */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded bg-foreground">
                <svg
                  viewBox="0 0 24 24"
                  className="size-4 fill-background"
                  aria-label="Wasmer logo"
                >
                  <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
                </svg>
              </div>
              <span className="text-sm font-semibold">wasmer</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[160px]">
              Making software universally accessible
            </p>
            <div className="flex items-center gap-3 text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">
                <TwitterIcon className="size-4" />
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                <DiscordIcon className="size-4" />
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                <Github className="size-4" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading} className="flex flex-col gap-3">
              <p className="text-sm font-semibold">{heading}</p>
              <ul className="flex flex-col gap-2">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
          {["Imprint", "Privacy", "Terms", "Report abuse"].map((item) => (
            <a
              key={item}
              href="#"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {item}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
