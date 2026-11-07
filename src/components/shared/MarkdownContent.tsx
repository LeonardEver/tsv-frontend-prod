/**
 * Content rendering boundary (frontend spec §22).
 *
 * The ONLY way API content becomes DOM. react-markdown WITHOUT
 * rehype-raw: raw HTML embedded in content is never parsed into elements.
 * Links/images pass the scheme allowlist at render time (defense in
 * depth on top of backend import-time sanitization), and external links
 * always carry rel="noopener noreferrer".
 *
 * There is NO dangerouslySetInnerHTML anywhere in this project
 * (lint-enforced by react/no-danger).
 */
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { safeUrl } from "@/lib/validate/url-scheme";
import { remarkCallouts } from "./remark-callouts";

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose-invert max-w-none space-y-3 text-text-primary">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkCallouts]}
        components={{
          a: ({ href, children, ...props }) => {
            const safe = safeUrl(href);
            if (!safe) return <span>{children}</span>;
            const external = /^https?:/i.test(safe);
            return (
              <a
                href={safe}
                className="text-info-water underline underline-offset-2 hover:text-text-primary"
                rel="noopener noreferrer"
                {...(external ? { target: "_blank" } : {})}
                {...props}
              >
                {children}
              </a>
            );
          },
          img: ({ src, alt, ...props }) => {
            const safe = safeUrl(src);
            if (!safe) return null;
            return (
              <img
                src={safe}
                alt={alt ?? ""}
                loading="lazy"
                decoding="async"
                className="rounded-md"
                {...props}
              />
            );
          },
          h2: ({ children }) => (
            <h2 className="mt-6 text-xl font-bold">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-4 text-lg font-semibold">{children}</h3>
          ),
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc space-y-1 pl-6">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-1 pl-6">{children}</ol>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-accent-ember pl-3 text-text-secondary">
              {children}
            </blockquote>
          ),
          code: ({ children, className }) =>
            className ? (
              <code className="block overflow-x-auto rounded-md bg-bg-elevated p-3 text-sm">
                {children}
              </code>
            ) : (
              <code className="rounded bg-bg-elevated px-1 py-0.5 text-sm">{children}</code>
            ),
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border-default bg-bg-elevated px-3 py-2 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border-default px-3 py-2">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
