"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { SiteChrome, useAuthGate } from "./SiteChrome";
import { AuthFlowModal } from "./AuthFlowModal";

type Raid = {
  id: string;
  type: string;
  title: string;
  reward_xp: number;
  active: boolean;
  link_url: string | null;
  sort_order: number;
  completions: number;
  created_at: string;
};

export function AdminShell() {
  const { authed, onAuthed, onLoggedOut } = useAuthGate();
  const [authOpen, setAuthOpen] = useState(false);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [raids, setRaids] = useState<Raid[]>([]);
  const [bonus, setBonus] = useState(100);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    type: "custom_raid",
    title: "",
    reward_xp: 1000,
    link_url: "",
  });

  const gate = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/admin/status");
      const json = await res.json();
      if (!json.ok) {
        setAllowed(false);
        setError(json.error || "Forbidden");
        return;
      }
      setAllowed(true);
    } catch {
      setAllowed(false);
      setError("Failed to check admin");
    }
  }, []);

  const load = useCallback(async () => {
    const [tRes, sRes] = await Promise.all([
      fetch("/api/admin/tasks"),
      fetch("/api/admin/settings"),
    ]);
    const tJson = await tRes.json();
    const sJson = await sRes.json();
    if (tJson.ok) setRaids(tJson.data.tasks as Raid[]);
    if (sJson.ok) setBonus(Number(sJson.data.snapshot_pool_bonus_sol));
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const me = await fetch("/api/me");
        if (me.ok) {
          onAuthed();
          return;
        }
      } catch {
        /* ignore */
      }
      setAllowed(null);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!authed) {
      setAllowed(null);
      return;
    }
    void gate().then(() => {
      void load();
    });
  }, [authed, gate, load]);

  const createRaid = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          title: form.title,
          reward_xp: Number(form.reward_xp),
          link_url: form.link_url || null,
          active: true,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Create failed");
      setForm((f) => ({ ...f, title: "", link_url: "" }));
      setMsg(`Created raid ${json.data.id}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  const softDelete = async (id: string) => {
    if (!confirm("Soft-delete this raid? Completions stay tied to this UUID.")) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/tasks/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Delete failed");
      setMsg("Raid soft-deleted (history kept)");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (r: Raid) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/tasks/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !r.active }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Update failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const saveBonus = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot_pool_bonus_sol: Number(bonus) }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Save failed");
      setMsg(`Pool bonus set to ${json.data.snapshot_pool_bonus_sol} SOL`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const resetProgress = async () => {
    if (
      !confirm(
        "RESET all XP, completions, referrals, and Redis leaderboard? Users & raid defs stay.",
      )
    ) {
      return;
    }
    const typed = prompt('Type RESET_ALL_PROGRESS to confirm');
    if (typed !== "RESET_ALL_PROGRESS") return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "RESET_ALL_PROGRESS" }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Reset failed");
      setMsg("Progress wiped. Fresh XP + leaderboard.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SiteChrome active="board" onAuthed={onAuthed} onLoggedOut={onLoggedOut}>
      <main className="page board-page admin-page">
        <header className="board-hero board-hero-compact">
          <div>
            <p className="board-kicker">Creator only</p>
            <h1 className="board-title">Admin</h1>
            <p className="board-hero-lead">
              Raids, pool bonus, and test reset. Wallet must be{" "}
              <code className="mono">{BRAND.creatorWallet.slice(0, 4)}…</code>
            </p>
          </div>
          <Link className="btn btn-pill btn-ghost-light" href="/board">
            ← Board
          </Link>
        </header>

        {!authed && (
          <section className="board-card">
            <p className="muted">Connect + sign with the creator wallet.</p>
            <button
              type="button"
              className="btn btn-pill btn-buy"
              onClick={() => setAuthOpen(true)}
            >
              Connect wallet
            </button>
          </section>
        )}

        {authed && allowed === false && (
          <section className="board-card">
            <p className="error">
              {error || "This wallet is not the creator admin."}
            </p>
          </section>
        )}

        {authed && allowed && (
          <>
            {error && <p className="error">{error}</p>}
            {msg && <p className="muted small">{msg}</p>}

            <section className="board-card">
              <h2 className="board-card-title">Snapshot pool bonus</h2>
              <p className="board-card-desc">
                Added to on-chain creator fees for Ready for next snapshot.
              </p>
              <div className="admin-row">
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={bonus}
                  onChange={(e) => setBonus(Number(e.target.value))}
                  className="admin-input"
                />
                <span className="muted">SOL</span>
                <button
                  type="button"
                  className="btn btn-pill btn-buy"
                  disabled={busy}
                  onClick={() => void saveBonus()}
                >
                  Save bonus
                </button>
              </div>
            </section>

            <section className="board-card">
              <h2 className="board-card-title">Add raid</h2>
              <p className="board-card-desc">
                Each create = new UUID. Soft-deleted raids never reuse IDs.
              </p>
              <div className="admin-form">
                <label>
                  Type (snake_case)
                  <input
                    className="admin-input"
                    value={form.type}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, type: e.target.value }))
                    }
                  />
                </label>
                <label>
                  Title
                  <input
                    className="admin-input"
                    value={form.title}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, title: e.target.value }))
                    }
                  />
                </label>
                <label>
                  XP
                  <input
                    type="number"
                    className="admin-input"
                    value={form.reward_xp}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        reward_xp: Number(e.target.value),
                      }))
                    }
                  />
                </label>
                <label>
                  Link URL (optional)
                  <input
                    className="admin-input"
                    placeholder="https://…"
                    value={form.link_url}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, link_url: e.target.value }))
                    }
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-pill btn-buy"
                  disabled={busy || !form.title}
                  onClick={() => void createRaid()}
                >
                  Create raid
                </button>
              </div>
            </section>

            <section className="board-card">
              <h2 className="board-card-title">Raids</h2>
              <ul className="board-list">
                {raids.map((r) => (
                  <li key={r.id} className="board-list-row admin-raid-row">
                    <div className="board-list-main">
                      <strong>{r.title}</strong>
                      <span className="muted small mono">{r.id.slice(0, 8)}…</span>
                      <span className="badge">+{r.reward_xp} XP</span>
                      <span className="muted small">
                        {r.active ? "Live" : "Off"} · {r.completions} claims
                      </span>
                      {r.link_url ? (
                        <span className="muted small">{r.link_url}</span>
                      ) : null}
                    </div>
                    <div className="admin-raid-actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={busy}
                        onClick={() => void toggleActive(r)}
                      >
                        {r.active ? "Hide" : "Show"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={busy}
                        onClick={() => void softDelete(r.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
                {raids.length === 0 && (
                  <li className="muted small">No raids yet.</li>
                )}
              </ul>
            </section>

            <section className="board-card admin-danger">
              <h2 className="board-card-title">Reset progress (test)</h2>
              <p className="board-card-desc">
                Clears XP, raid completions, referrals, wallet balances, Redis
                leaderboard. Keeps users + raid definitions + bonus setting.
              </p>
              <button
                type="button"
                className="btn btn-pill"
                disabled={busy}
                onClick={() => void resetProgress()}
              >
                Reset DB + Redis progress
              </button>
            </section>
          </>
        )}
      </main>

      <AuthFlowModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthed={() => {
          setAuthOpen(false);
          onAuthed();
        }}
      />
    </SiteChrome>
  );
}
