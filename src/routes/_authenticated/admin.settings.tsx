import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { PageHead } from "@/components/admin/ui";
import { HangerLoader } from "@/components/site/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { grantRole, listTeam, revokeRole } from "@/lib/team.functions";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/admin/settings")({ component: Settings });

const ROLE_LABEL = {
  admin: "Owner (everything)",
  team: "Team (catalog, leads, orders)",
  finance: "Finance view",
} as const;

function Settings() {
  const { isAdmin } = useAuth();
  const list = useServerFn(listTeam);
  const grant = useServerFn(grantRole);
  const revoke = useServerFn(revokeRole);
  const team = useQuery({ enabled: isAdmin, queryKey: ["team"], queryFn: () => list() });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "team" | "finance">("team");

  if (!isAdmin) return <p className="text-muted-foreground">Only the owner can manage the team.</p>;

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const r = await grant({ data: { email, role } });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("Access granted");
      setEmail("");
      team.refetch();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="max-w-2xl">
      <PageHead
        title="Team & permissions"
        sub="Teammates sign up on the site first, then you grant access here."
      />
      <form onSubmit={add} className="flex flex-wrap gap-2 rounded-2xl border bg-card p-4">
        <Input
          required
          type="email"
          placeholder="teammate@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-w-56 flex-1"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as typeof role)}
          className="h-10 rounded-md border bg-background px-2 text-sm"
        >
          {Object.entries(ROLE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <Button>Grant</Button>
      </form>
      <div className="mt-4 rounded-2xl border bg-card">
        {team.isLoading ? (
          <HangerLoader />
        ) : (
          team.data?.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between border-t p-3 text-sm first:border-0"
            >
              <span>
                <b>{r.email}</b>{" "}
                <span className="text-muted-foreground">
                  · {ROLE_LABEL[r.role as keyof typeof ROLE_LABEL]}
                </span>
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  try {
                    await revoke({ data: { id: r.id } });
                    team.refetch();
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
              >
                Remove
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
