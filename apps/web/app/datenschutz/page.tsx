import ReactMarkdown from 'react-markdown';
import { getMarkdownContent } from '@/lib/markdown';
import { PublicPageLayout } from '@/components/layout/public-page-layout';

export const metadata = {
  title: 'Datenschutzerklärung | ClubManager',
  description: 'Datenschutzerklärung und Informationen zur Datenverarbeitung',
};

export default async function DatenschutzPage() {
  const content = await getMarkdownContent('datenschutz.md');

  return (
    <PublicPageLayout>
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <ReactMarkdown>{content}</ReactMarkdown>
      </article>
    </PublicPageLayout>
  );
}
