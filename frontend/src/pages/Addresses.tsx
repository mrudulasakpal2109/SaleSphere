import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMe } from "@/hooks/useAuth";
import { apiErrorMessage, digitsOnly } from "@/lib/format";
import type { Address, AddressInput } from "@/types";

const emptyForm: AddressInput = {
  label: "",
  full_name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postal_code: "",
  is_default: false,
};

export default function Addresses() {
  const qc = useQueryClient();
  const { data: user } = useMe();
  const { data: addresses, isLoading } = useQuery({
    queryKey: ["addresses"],
    queryFn: () => apiGet<Address[]>("/addresses"),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressInput>(emptyForm);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["addresses"] });

  const save = useMutation({
    mutationFn: (body: AddressInput) =>
      editingId ? apiPatch<Address>(`/addresses/${editingId}`, body) : apiPost<Address>("/addresses", body),
    onSuccess: async () => {
      await invalidate();
      setDialogOpen(false);
      toast.success(editingId ? "Address updated." : "Address saved.");
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not save this address.")),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete<void>(`/addresses/${id}`),
    onSuccess: async () => {
      await invalidate();
      toast.success("Address removed.");
    },
    onError: () => toast.error("Could not remove this address."),
  });

  const openEdit = (a: Address) => {
    setEditingId(a.id);
    setForm({
      label: a.label ?? "",
      full_name: a.full_name,
      phone: a.phone,
      line1: a.line1,
      line2: a.line2 ?? "",
      city: a.city,
      state: a.state,
      postal_code: a.postal_code,
      is_default: a.is_default,
    });
    setDialogOpen(true);
  };

  const submit = () => {
    if (form.full_name.trim().length < 2) return toast.error("Please enter the recipient's name.");
    if (!/^\d{10}$/.test(form.phone)) return toast.error("Phone must be a 10-digit number.");
    if (form.line1.trim().length < 4) return toast.error("Please enter the street address.");
    if (form.city.trim().length < 2) return toast.error("Please enter the city.");
    if (form.state.trim().length < 2) return toast.error("Please enter the state.");
    if (!/^\d{6}$/.test(form.postal_code)) return toast.error("PIN code must be 6 digits.");
    save.mutate({
      ...form,
      label: form.label?.trim() || null,
      full_name: form.full_name.trim(),
      line1: form.line1.trim(),
      line2: form.line2?.trim() || null,
      city: form.city.trim(),
      state: form.state.trim(),
    });
  };

  if (!user) return null;

  return (
    <div data-testid="account-addresses">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-medium">Saved Addresses</h2>
          <p className="mt-1 text-sm text-muted-foreground">Used to prefill checkout — the default address is selected first.</p>
        </div>
        <Button
          data-testid="address-add-button"
          onClick={() => {
            setEditingId(null);
            setForm(emptyForm);
            setDialogOpen(true);
          }}
        >
          <Plus size={15} /> Add Address
        </Button>
      </div>

      {isLoading ? (
        <div className="mt-6 h-32 animate-pulse bg-muted" />
      ) : !addresses || addresses.length === 0 ? (
        <div className="mt-6 border border-dashed border-border bg-card p-10 text-center" data-testid="addresses-empty-state">
          <MapPin size={20} className="mx-auto text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No saved addresses yet. Add one to speed up checkout.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <div key={a.id} className="border border-border bg-card p-5" data-testid={`address-card-${a.id}`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {a.label ?? "Address"}
                  {a.is_default && (
                    <span className="ml-2 inline-flex items-center gap-1 bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <Star size={9} className="fill-gold text-gold" /> Default
                    </span>
                  )}
                </p>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon-xs" aria-label={`Edit address ${a.label ?? ""}`} data-testid={`address-edit-${a.id}`} onClick={() => openEdit(a)}>
                    <Pencil size={14} />
                  </Button>
                  <Button variant="ghost" size="icon-xs" aria-label={`Delete address ${a.label ?? ""}`} data-testid={`address-delete-${a.id}`} onClick={() => remove.mutate(a.id)}>
                    <Trash2 size={14} className="text-destructive" />
                  </Button>
                </div>
              </div>
              <address className="mt-2 text-sm not-italic leading-relaxed text-muted-foreground">
                {a.full_name} · {a.phone}
                <br />
                {a.line1}
                {a.line2 ? `, ${a.line2}` : ""}
                <br />
                {a.city}, {a.state} {a.postal_code}
              </address>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">{editingId ? "Edit Address" : "Add Address"}</DialogTitle>
            <DialogDescription>All fields help delivery reach the right doorstep.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="addr-label">Label (optional)</Label>
              <Input id="addr-label" value={form.label ?? ""} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="Home / Office" className="mt-1.5" data-testid="address-form-label-input" />
            </div>
            <div>
              <Label htmlFor="addr-name">Recipient name</Label>
              <Input id="addr-name" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} className="mt-1.5" data-testid="address-form-name-input" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="addr-phone">Phone (10 digits)</Label>
              <Input id="addr-phone" value={form.phone} inputMode="numeric" onChange={(e) => setForm((f) => ({ ...f, phone: digitsOnly(e.target.value) }))} className="mt-1.5" data-testid="address-form-phone-input" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="addr-line1">Address line 1</Label>
              <Input id="addr-line1" value={form.line1} onChange={(e) => setForm((f) => ({ ...f, line1: e.target.value }))} className="mt-1.5" data-testid="address-form-line1-input" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="addr-line2">Address line 2 (optional)</Label>
              <Input id="addr-line2" value={form.line2 ?? ""} onChange={(e) => setForm((f) => ({ ...f, line2: e.target.value }))} className="mt-1.5" data-testid="address-form-line2-input" />
            </div>
            <div>
              <Label htmlFor="addr-city">City</Label>
              <Input id="addr-city" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className="mt-1.5" data-testid="address-form-city-input" />
            </div>
            <div>
              <Label htmlFor="addr-state">State</Label>
              <Input id="addr-state" value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} className="mt-1.5" data-testid="address-form-state-input" />
            </div>
            <div>
              <Label htmlFor="addr-pin">PIN code</Label>
              <Input id="addr-pin" value={form.postal_code} inputMode="numeric" maxLength={6} onChange={(e) => setForm((f) => ({ ...f, postal_code: digitsOnly(e.target.value) }))} className="mt-1.5" data-testid="address-form-pin-input" />
            </div>
            <label className="flex items-end gap-2.5 pb-1 text-sm">
              <Checkbox checked={form.is_default} onCheckedChange={(c) => setForm((f) => ({ ...f, is_default: c === true }))} />
              Set as default
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="address-form-cancel-button">
              Cancel
            </Button>
            <Button onClick={submit} disabled={save.isPending} data-testid="address-form-save-button" className="btn-invert hover:bg-sale">
              {save.isPending ? "Saving…" : "Save Address"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
