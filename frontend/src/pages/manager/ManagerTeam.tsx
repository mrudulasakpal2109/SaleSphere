import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiGet } from "@/lib/api";
import { apiErrorMessage, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAddManager } from "@/hooks/useManager";
import { PageTitle } from "@/pages/manager/ManagerOverview";
import type { Manager, ManagerRole } from "@/managerTypes";

export default function ManagerTeam() {
  const me = useOutletContext<Manager>();
  const { data: team } = useQuery({ queryKey: ["manager", "team"], queryFn: () => apiGet<Manager[]>("/manager/team") });
  const add = useAddManager();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "manager" as ManagerRole });

  return (
    <div className="space-y-6" data-testid="manager-team-page">
      <PageTitle overline="Access control" title="Team" />
      <div className="overflow-x-auto border border-border bg-card">
        <table className="w-full text-sm" data-testid="team-table">
          <thead><tr className="border-b border-foreground text-left text-xs uppercase tracking-wider text-muted-foreground"><th className="p-3">Name</th><th>Email</th><th>Role</th><th className="p-3">Added</th></tr></thead>
          <tbody>
            {team?.map((m) => (
              <tr key={m.id} className="border-b border-border" data-testid={`team-row-${m.email}`}>
                <td className="p-3 font-medium">{m.name}{m.id === me.id && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}</td>
                <td>{m.email}</td>
                <td className="capitalize">{m.role}</td>
                <td className="p-3 text-muted-foreground">{formatDate(m.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {me.role === "admin" ? (
        <form
          className="max-w-xl border border-border bg-card p-5"
          data-testid="team-add-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (form.name.trim().length < 2) return toast.error("Enter the manager's name.");
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return toast.error("Enter a valid email.");
            if (form.password.length < 8) return toast.error("Password must be at least 8 characters.");
            add.mutate({ ...form, name: form.name.trim(), email: form.email.trim() }, {
              onSuccess: (m) => {
                toast.success(`${m.name} can now sign in to the dashboard.`);
                setForm({ name: "", email: "", password: "", role: "manager" });
              },
              onError: (err) => toast.error(apiErrorMessage(err, "Could not add manager.")),
            });
          }}
        >
          <h2 className="font-heading text-xl font-medium">Add a manager</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><Label htmlFor="tm-name">Name</Label><Input id="tm-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5" data-testid="team-name-input" /></div>
            <div><Label htmlFor="tm-email">Email</Label><Input id="tm-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5" data-testid="team-email-input" /></div>
            <div><Label htmlFor="tm-pw">Temporary password (min 8)</Label><Input id="tm-pw" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1.5" data-testid="team-password-input" /></div>
            <div>
              <Label htmlFor="tm-role">Role</Label>
              <select id="tm-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as ManagerRole })} className="mt-1.5 h-9 w-full border border-input bg-background px-2 text-sm" data-testid="team-role-select">
                <option value="manager">Manager (view dashboard)</option>
                <option value="admin">Admin (can add managers)</option>
              </select>
            </div>
          </div>
          <Button type="submit" className="mt-5 hover:bg-sale" disabled={add.isPending} data-testid="team-add-button">{add.isPending ? "Adding…" : "Add manager"}</Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">Only admins can add managers.</p>
      )}
    </div>
  );
}
