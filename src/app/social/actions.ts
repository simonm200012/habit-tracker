"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

function randomCode(len = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // omit confusing chars
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/* ---------- public profile ---------- */

export async function savePublicProfile(formData: FormData) {
  const { supabase, user } = await authed();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{2,30}$/.test(slug)) {
    throw new Error("Slug must be 3–31 chars, lowercase letters/numbers/-/_");
  }

  const row = {
    user_id: user.id,
    slug,
    display_name: String(formData.get("display_name") ?? "").trim() || null,
    bio: String(formData.get("bio") ?? "").trim().slice(0, 280),
    is_public: formData.get("is_public") === "on",
    show_streaks: formData.get("show_streaks") === "on",
    show_achievements: formData.get("show_achievements") === "on",
    updated_at: new Date().toISOString(),
  };
  await supabase.from("public_profiles").upsert(row, { onConflict: "user_id" });
  revalidatePath("/social");
  revalidatePath(`/u/${slug}`);
}

export async function deletePublicProfile() {
  const { supabase, user } = await authed();
  await supabase.from("public_profiles").delete().eq("user_id", user.id);
  revalidatePath("/social");
}

/* ---------- partners ---------- */

export async function createPartnerInvite() {
  const { supabase, user } = await authed();
  // Try a few times in case of collision
  for (let i = 0; i < 5; i++) {
    const code = randomCode(8);
    const { error } = await supabase.from("partner_invites").insert({
      code,
      from_user: user.id,
    });
    if (!error) {
      revalidatePath("/social");
      return code;
    }
  }
  throw new Error("Could not generate invite code");
}

export async function acceptPartnerInvite(code: string) {
  const { supabase, user } = await authed();
  const cleanCode = code.trim().toUpperCase();

  const { data: invite } = await supabase
    .from("partner_invites")
    .select("from_user, redeemed_by, expires_at")
    .eq("code", cleanCode)
    .maybeSingle();

  if (!invite) throw new Error("Invite not found");
  if (invite.from_user === user.id) throw new Error("That's your own invite");
  if (invite.redeemed_by) throw new Error("Invite already used");
  if (new Date(invite.expires_at) < new Date()) throw new Error("Invite expired");

  const [a, b] = [invite.from_user, user.id].sort();
  const { error: pErr } = await supabase
    .from("partnerships")
    .insert({ user_a: a, user_b: b });
  if (pErr && !pErr.message.includes("duplicate")) throw pErr;

  await supabase
    .from("partner_invites")
    .update({ redeemed_by: user.id })
    .eq("code", cleanCode);

  revalidatePath("/social");
}

export async function removePartner(otherUserId: string) {
  const { supabase, user } = await authed();
  const [a, b] = [user.id, otherUserId].sort();
  await supabase.from("partnerships").delete().eq("user_a", a).eq("user_b", b);
  revalidatePath("/social");
}

/* ---------- challenges ---------- */

export async function createChallenge(formData: FormData): Promise<void> {
  const { supabase, user } = await authed();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name required");
  const category = String(formData.get("category") ?? "Health");
  const description = String(formData.get("description") ?? "").trim().slice(0, 280);
  const days = Math.max(1, Math.min(180, Number(formData.get("days") ?? 30)));
  const starts = new Date();
  const ends = new Date();
  ends.setDate(starts.getDate() + days - 1);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const invite_code = randomCode(8);

  const { data: created, error } = await supabase
    .from("challenges")
    .insert({
      name,
      description,
      category,
      starts_on: iso(starts),
      ends_on: iso(ends),
      creator_id: user.id,
      invite_code,
    })
    .select("id")
    .single();
  if (error || !created) throw error ?? new Error("Could not create challenge");

  await supabase
    .from("challenge_members")
    .insert({ challenge_id: created.id, user_id: user.id });

  revalidatePath("/social");
  redirect(`/challenges/${created.id}`);
}

export async function joinChallenge(code: string): Promise<void> {
  const { supabase, user } = await authed();
  const cleanCode = code.trim().toUpperCase();
  const { data: ch } = await supabase
    .from("challenges")
    .select("id")
    .eq("invite_code", cleanCode)
    .maybeSingle();
  if (!ch) throw new Error("Challenge not found");

  const { error } = await supabase
    .from("challenge_members")
    .insert({ challenge_id: ch.id, user_id: user.id });
  if (error && !error.message.includes("duplicate")) throw error;

  revalidatePath("/social");
  redirect(`/challenges/${ch.id}`);
}

export async function leaveChallenge(challengeId: string) {
  const { supabase, user } = await authed();
  await supabase
    .from("challenge_members")
    .delete()
    .eq("challenge_id", challengeId)
    .eq("user_id", user.id);
  revalidatePath("/social");
  redirect("/social");
}

export async function deleteChallenge(challengeId: string) {
  const { supabase, user } = await authed();
  // RLS enforces creator-only delete, but double-check
  await supabase
    .from("challenges")
    .delete()
    .eq("id", challengeId)
    .eq("creator_id", user.id);
  revalidatePath("/social");
  redirect("/social");
}
