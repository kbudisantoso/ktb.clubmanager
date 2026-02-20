import type { Metadata } from 'next';
import DeletedClubsClient from './_client';

export const metadata: Metadata = {
  title: 'Gelöschte Vereine — Verwaltungszentrale',
};

export default function DeletedClubsPage() {
  return <DeletedClubsClient />;
}
