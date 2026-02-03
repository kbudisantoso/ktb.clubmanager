'use client';

import { useState } from 'react';
import { Check, X, UserPlus, Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  useClubAccessRequestsQuery,
  useApproveAccessRequestMutation,
  useRejectAccessRequestMutation,
  type ClubAccessRequest,
  type RejectionReason,
} from '@/hooks/use-clubs';

interface AccessRequestsCardProps {
  slug: string;
}

const REJECTION_REASONS: { value: RejectionReason; label: string }[] = [
  { value: 'UNIDENTIFIED', label: 'Nicht zuordnen' },
  { value: 'WRONG_CLUB', label: 'Falscher Verein' },
  { value: 'BOARD_ONLY', label: 'Nur Vorstand' },
  { value: 'CONTACT_DIRECTLY', label: 'Direkt kontaktieren' },
  { value: 'OTHER', label: 'Sonstiges' },
];

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  return email[0].toUpperCase();
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function AccessRequestsCard({ slug }: AccessRequestsCardProps) {
  const { toast } = useToast();
  const { data: requests = [], isLoading } = useClubAccessRequestsQuery(slug);
  const approveMutation = useApproveAccessRequestMutation();
  const rejectMutation = useRejectAccessRequestMutation();

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ClubAccessRequest | null>(null);
  const [rejectReason, setRejectReason] = useState<RejectionReason>('UNIDENTIFIED');
  const [rejectNote, setRejectNote] = useState('');

  // Don't render if no pending requests
  if (!isLoading && requests.length === 0) {
    return null;
  }

  async function handleApprove(request: ClubAccessRequest) {
    try {
      await approveMutation.mutateAsync({
        requestId: request.id,
        roles: ['MEMBER'], // Default to MEMBER role
      });
      toast({
        title: 'Anfrage genehmigt',
        description: `${request.user.name || request.user.email} wurde als Mitglied hinzugefügt.`,
      });
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        variant: 'destructive',
      });
    }
  }

  function openRejectDialog(request: ClubAccessRequest) {
    setSelectedRequest(request);
    setRejectReason('UNIDENTIFIED');
    setRejectNote('');
    setRejectDialogOpen(true);
  }

  async function handleReject() {
    if (!selectedRequest) return;

    // Require note for OTHER reason
    if (rejectReason === 'OTHER' && !rejectNote.trim()) {
      toast({
        title: 'Fehler',
        description: 'Bitte gib einen Grund an',
        variant: 'destructive',
      });
      return;
    }

    try {
      await rejectMutation.mutateAsync({
        requestId: selectedRequest.id,
        reason: rejectReason,
        note: rejectNote.trim() || undefined,
      });
      setRejectDialogOpen(false);
      toast({
        title: 'Anfrage abgelehnt',
        description: `Die Anfrage von ${selectedRequest.user.name || selectedRequest.user.email} wurde abgelehnt.`,
      });
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        variant: 'destructive',
      });
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <CardTitle>Beitrittsanfragen</CardTitle>
            {requests.length > 0 && (
              <span className="ml-auto bg-primary text-primary-foreground text-xs font-medium px-2 py-0.5 rounded-full">
                {requests.length}
              </span>
            )}
          </div>
          <CardDescription>
            Neue Mitglieder, die dem Verein beitreten möchten
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={request.user.image || undefined} />
                    <AvatarFallback>
                      {getInitials(request.user.name, request.user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {request.user.name || request.user.email}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {request.user.name ? request.user.email : formatDate(request.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openRejectDialog(request)}
                      disabled={rejectMutation.isPending || approveMutation.isPending}
                      title="Ablehnen"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="default"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleApprove(request)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      title="Genehmigen"
                    >
                      {approveMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anfrage ablehnen</DialogTitle>
            <DialogDescription>
              Die Anfrage von{' '}
              <span className="font-medium">
                {selectedRequest?.user.name || selectedRequest?.user.email}
              </span>{' '}
              wird abgelehnt.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Grund</Label>
              <Select
                value={rejectReason}
                onValueChange={(v) => setRejectReason(v as RejectionReason)}
              >
                <SelectTrigger id="reason">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REJECTION_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">
                Anmerkung {rejectReason === 'OTHER' && '*'}
              </Label>
              <Textarea
                id="note"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Optionale Anmerkung..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={rejectMutation.isPending}
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Ablehnen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
