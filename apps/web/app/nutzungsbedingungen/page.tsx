import ReactMarkdown from 'react-markdown';
import { getMarkdownContent } from '@/lib/markdown';
import { PublicPageLayout } from '@/components/layout/public-page-layout';

export const metadata = {
  title: 'Nutzungsbedingungen | ClubManager',
  description: 'Nutzungsbedingungen und Allgemeine Geschäftsbedingungen',
};

export default async function NutzungsbedingungenPage() {
  const content = await getMarkdownContent('nutzungsbedingungen.md');

  return (
    <PublicPageLayout>
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <ReactMarkdown>{content}</ReactMarkdown>
      </article>
    </PublicPageLayout>
  );
}
