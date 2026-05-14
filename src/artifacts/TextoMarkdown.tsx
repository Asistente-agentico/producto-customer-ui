import Markdown from 'react-markdown';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a ?? []), ['target'], ['rel']],
  },
};

type Props = {
  text: string;
};

/**
 * Markdown sanitizado (sección 14.3 del spec). Nunca renderiza HTML
 * crudo; los enlaces fuerzan target=_blank rel=noopener noreferrer.
 */
export default function TextoMarkdown({ text }: Props) {
  return (
    <div className="prose prose-invert max-w-none prose-sm">
      <Markdown
        rehypePlugins={[[rehypeSanitize, schema]]}
        components={{
          a: ({ href, children, ...rest }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
              {children}
            </a>
          ),
        }}
      >
        {text}
      </Markdown>
    </div>
  );
}
