import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMe, useUpdateProfile } from "@/hooks/useAuth";
import { apiErrorMessage, digitsOnly } from "@/lib/format";

// Account details: name + phone are editable; email is the account identifier.
export default function Profile() {
  const { data: user } = useMe();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const update = useUpdateProfile();

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone ?? "");
    }
  }, [user]);

  return (
    <div className="border border-border bg-card p-6 sm:p-8" data-testid="account-profile">
      <h2 className="font-heading text-2xl font-medium">Account Details</h2>
      <p className="mt-1 text-sm text-muted-foreground">Update your personal information.</p>

      <div className="mt-6 grid max-w-md grid-cols-1 gap-4">
        <div>
          <Label htmlFor="profile-name">Full name</Label>
          <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" data-testid="profile-name-input" />
        </div>
        <div>
          <Label htmlFor="profile-email">Email (sign-in ID)</Label>
          <Input id="profile-email" value={user?.email ?? ""} disabled className="mt-1.5 opacity-70" data-testid="profile-email-input" />
        </div>
        <div>
          <Label htmlFor="profile-phone">Mobile (10 digits)</Label>
          <Input
            id="profile-phone"
            value={phone}
            onChange={(e) => setPhone(digitsOnly(e.target.value))}
            className="mt-1.5"
            data-testid="profile-phone-input"
            placeholder="9876543210"
          />
        </div>
        <div>
          <Button
            className="btn-invert hover:bg-sale"
            disabled={update.isPending || !user}
            data-testid="profile-save-button"
            onClick={async () => {
              if (name.trim().length < 2) {
                toast.error("Name must be at least 2 characters.");
                return;
              }
              if (phone && !/^\d{10}$/.test(phone)) {
                toast.error("Mobile number must be 10 digits.");
                return;
              }
              try {
                await update.mutateAsync({ name: name.trim(), phone: phone || null });
                toast.success("Profile updated.");
              } catch (err) {
                toast.error(apiErrorMessage(err, "Could not update profile."));
              }
            }}
          >
            {update.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
