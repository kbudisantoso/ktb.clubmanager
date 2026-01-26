import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

export default function ComponentsDemo() {
  return (
    <div className="container mx-auto py-10 space-y-12">
      <h1 className="font-display text-3xl font-bold">Component Library</h1>
      <p className="text-muted-foreground">
        ktb.clubmanager UI components built with shadcn/ui and Tailwind CSS v4.
      </p>

      {/* Button Variants */}
      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold">Buttons</h2>
        <div className="flex flex-wrap gap-4">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
        <div className="flex flex-wrap gap-4">
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      {/* Input with Label */}
      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold">Form Elements</h2>
        <div className="grid gap-4 max-w-sm">
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input id="email" type="email" placeholder="name@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              type="password"
              placeholder="Passwort eingeben"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="disabled">Deaktiviert</Label>
            <Input id="disabled" disabled placeholder="Deaktiviertes Feld" />
          </div>
        </div>
      </section>

      {/* Card */}
      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold">Cards</h2>
        <div className="grid gap-4 md:grid-cols-2 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Mitglieder</CardTitle>
              <CardDescription>Vereinsmitglieder verwalten</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Mitgliederdaten einsehen, bearbeiten und Haushalte gruppieren.
              </p>
            </CardContent>
            <CardFooter>
              <Button>Mitglieder anzeigen</Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Finanzen</CardTitle>
              <CardDescription>Buchhaltung auf einen Blick</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Einnahmen und Ausgaben verfolgen, Berichte erstellen.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline">Berichte anzeigen</Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Table */}
      <section className="space-y-4">
        <h2 className="font-display text-2xl font-semibold">Tables</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>E-Mail</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Beitrag</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Max Mustermann</TableCell>
              <TableCell>max@example.com</TableCell>
              <TableCell>Aktiv</TableCell>
              <TableCell className="text-right tabular-nums">
                120,00 EUR
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Erika Musterfrau</TableCell>
              <TableCell>erika@example.com</TableCell>
              <TableCell>Aktiv</TableCell>
              <TableCell className="text-right tabular-nums">
                120,00 EUR
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Hans Schmidt</TableCell>
              <TableCell>hans@example.com</TableCell>
              <TableCell>Inaktiv</TableCell>
              <TableCell className="text-right tabular-nums">
                0,00 EUR
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
