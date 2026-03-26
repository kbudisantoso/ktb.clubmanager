'use client';

import { useParams } from 'next/navigation';
import { useQueryStates, parseAsStringLiteral, parseAsString } from 'nuqs';
import { PageHeader } from '@/components/layout/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FeeCategoryList } from '@/components/fees/fee-category-list';
import { BillingRunPanel } from '@/components/fees/billing-run-panel';
import { FeeChargeList } from '@/components/fees/fee-charge-list';

const TAB_VALUES = ['kategorien', 'erhebung', 'forderungen'] as const;

/**
 * Client component orchestrating the fees management page.
 * Tab state is persisted in the URL via nuqs (?tab=kategorien|erhebung|forderungen).
 * Supports memberId URL parameter for pre-filtering the Forderungen tab.
 */
export function FeesClient() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [{ tab, memberId }, setParams] = useQueryStates(
    {
      tab: parseAsStringLiteral(TAB_VALUES).withDefault('kategorien'),
      memberId: parseAsString.withDefault(''),
    },
    { shallow: true }
  );

  return (
    <div>
      <PageHeader
        title="Beitraege"
        description="Beitragskategorien, Erhebungslaeufe und Forderungen verwalten"
      />

      <div className="container mx-auto px-4 pb-6">
        <Tabs
          value={tab}
          onValueChange={(value) => setParams({ tab: value as (typeof TAB_VALUES)[number] })}
        >
          <TabsList>
            <TabsTrigger value="kategorien">Kategorien</TabsTrigger>
            <TabsTrigger value="erhebung">Erhebung</TabsTrigger>
            <TabsTrigger value="forderungen">Forderungen</TabsTrigger>
          </TabsList>

          <div className="pt-8">
            <TabsContent value="kategorien" className="mt-0">
              <FeeCategoryList />
            </TabsContent>

            <TabsContent value="erhebung" className="mt-0">
              <BillingRunPanel slug={slug} onComplete={() => setParams({ tab: 'forderungen' })} />
            </TabsContent>

            <TabsContent value="forderungen" className="mt-0">
              <FeeChargeList
                slug={slug}
                memberId={memberId || undefined}
                onSwitchToErhebung={() => setParams({ tab: 'erhebung' })}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
