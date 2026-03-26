'use client';

import { useQueryStates, parseAsStringLiteral } from 'nuqs';
import { PageHeader } from '@/components/layout/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { FeeCategoryList } from '@/components/fees/fee-category-list';

const TAB_VALUES = ['kategorien', 'erhebung', 'forderungen'] as const;

/**
 * Client component orchestrating the fees management page.
 * Tab state is persisted in the URL via nuqs (?tab=kategorien|erhebung|forderungen).
 */
export function FeesClient() {
  const [{ tab }, setParams] = useQueryStates(
    {
      tab: parseAsStringLiteral(TAB_VALUES).withDefault('kategorien'),
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
        <Tabs value={tab} onValueChange={(value) => setParams({ tab: value as (typeof TAB_VALUES)[number] })}>
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
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground">Wird in Kuerze verfuegbar</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="forderungen" className="mt-0">
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground">Wird in Kuerze verfuegbar</p>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
