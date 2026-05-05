// Admin UI for issuing and revoking access codes. Owner/admin only — gated
// against useAuth().primaryRole. The new code is shown once in a modal; the
// full code is never persisted on our side, only its 4-char prefix.

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Copy, KeyRound, Loader2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

const ASSIGNABLE_ROLES = ['admin', 'manager', 'technician', 'viewer'];

export default function AccessCodes() {
  const { primaryOrg, primaryRole, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('technician');
  const [issuedCode, setIssuedCode] = useState(null);
  const [pendingRevoke, setPendingRevoke] = useState(null);

  const isAdmin = primaryRole === 'owner' || primaryRole === 'admin';

  const { data: codes, isLoading: codesLoading } = useQuery({
    queryKey: ['access_codes', primaryOrg?.id],
    enabled: Boolean(primaryOrg?.id) && isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('access_codes')
        .select('id, display_name, role, code_prefix, created_at, last_used_at, revoked_at')
        .eq('org_id', primaryOrg.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('create-access-code', {
        body: {
          org_id: primaryOrg.id,
          role,
          display_name: displayName.trim(),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      setIssuedCode(data.code);
      setDisplayName('');
      setRole('technician');
      queryClient.invalidateQueries({ queryKey: ['access_codes', primaryOrg?.id] });
    },
    onError: (err) => toast.error(err.message || 'Failed to create code'),
  });

  const revokeMutation = useMutation({
    mutationFn: async (id) => {
      const { data, error } = await supabase.functions.invoke('revoke-access-code', {
        body: { access_code_id: id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('Access code revoked');
      setPendingRevoke(null);
      queryClient.invalidateQueries({ queryKey: ['access_codes', primaryOrg?.id] });
    },
    onError: (err) => toast.error(err.message || 'Failed to revoke code'),
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-gray-500 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading…
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 p-4 text-sm">
          Access codes can only be managed by org owners and admins.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <KeyRound className="w-6 h-6 text-emerald-600" />
          Access codes
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Issue a unique code for each person on your team. They sign in with that code
          alone — no email, no password.
        </p>
      </div>

      <section className="rounded-2xl border border-gray-200 p-5 bg-white space-y-4">
        <h2 className="font-semibold text-gray-900">Issue a new code</h2>
        <form
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!displayName.trim()) {
              toast.error('Enter a name so you can identify this code later');
              return;
            }
            createMutation.mutate();
          }}
        >
          <div className="md:col-span-1">
            <Label className="text-sm">Name</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Sarah — Field Tech"
              className="rounded-xl mt-1.5"
              required
            />
          </div>
          <div>
            <Label className="text-sm">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="rounded-xl mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl h-10 font-semibold"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Generate code'
              )}
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Issued codes</h2>
        </div>
        {codesLoading ? (
          <div className="p-6 text-sm text-gray-500 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : !codes || codes.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No codes issued yet.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {codes.map((c) => {
              const revoked = Boolean(c.revoked_at);
              return (
                <li
                  key={c.id}
                  className="p-4 flex items-center gap-4 flex-wrap md:flex-nowrap"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 truncate">
                        {c.display_name}
                      </span>
                      <Badge variant="secondary" className="capitalize">
                        {c.role}
                      </Badge>
                      {revoked && (
                        <Badge variant="destructive">Revoked</Badge>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 font-mono">
                      {c.code_prefix}-•••-•••-•••
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 whitespace-nowrap">
                    {c.last_used_at
                      ? `Last used ${format(new Date(c.last_used_at), 'MMM d, yyyy')}`
                      : 'Never used'}
                  </div>
                  {!revoked && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingRevoke(c)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Revoke
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Dialog open={Boolean(issuedCode)} onOpenChange={(o) => !o && setIssuedCode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Code generated</DialogTitle>
            <DialogDescription>
              Copy this code now — for security, we won't show it again. Send it to
              the user through a secure channel.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4 p-4 rounded-xl bg-gray-50 border border-gray-200 text-center">
            <div className="font-mono text-2xl tracking-widest text-gray-900 select-all">
              {issuedCode}
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(issuedCode || '');
                toast.success('Copied to clipboard');
              }}
              className="rounded-xl"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy code
            </Button>
            <Button
              variant="outline"
              onClick={() => setIssuedCode(null)}
              className="rounded-xl"
            >
              I've saved it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(pendingRevoke)}
        onOpenChange={(o) => !o && setPendingRevoke(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this access code?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRevoke?.display_name} will be signed out and lose access
              immediately. This can't be undone — you'll need to issue a new code if
              they need access again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => pendingRevoke && revokeMutation.mutate(pendingRevoke.id)}
            >
              {revokeMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Revoke'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
