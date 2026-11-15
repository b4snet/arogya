import ReactMarkdown from 'react-markdown';

interface MarkdownContentProps {
  content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <article className="space-y-3 text-sm leading-relaxed text-[var(--arogya-text-secondary)] [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-[var(--arogya-text-primary)] [&_h3]:mt-5 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-[var(--arogya-text-primary)] [&_h4]:mt-4 [&_h4]:font-semibold [&_h4]:text-[var(--arogya-text-primary)] [&_li]:ml-5 [&_li]:list-disc [&_ol_li]:list-decimal [&_p]:my-2 [&_strong]:font-semibold [&_strong]:text-[var(--arogya-text-primary)] [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_td]:border [&_td]:border-[var(--arogya-border)] [&_td]:p-2 [&_th]:border [&_th]:border-[var(--arogya-border)] [&_th]:p-2 [&_th]:text-left [&_th]:text-[var(--arogya-text-primary)] [&_a]:text-[var(--arogya-info)] [&_a]:underline">
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h2>{children}</h2>,
          h2: ({ children }) => <h3>{children}</h3>,
          h3: ({ children }) => <h4>{children}</h4>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
