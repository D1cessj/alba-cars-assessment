import { createClient } from "@/lib/supabase/server";
import type { Profile, Vehicle } from "@/lib/database.types";
import { VehiclesClient } from "./VehiclesClient";

export default async function VehiclesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single<Profile>();

  const { data: vehicles, error } = await supabase
    .from("vehicles")
    .select("*")
    .order("listed_at", { ascending: false })
    .returns<Vehicle[]>();

  // Admins get the full salesperson list so they can assign a car to
  // someone else; RLS on `profiles` already limits everyone else to just
  // their own row, so this naturally degrades for non-admins.
  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("*")
    .returns<Profile[]>();

  return (
    <VehiclesClient
      initialVehicles={vehicles ?? []}
      loadError={error?.message ?? null}
      profiles={allProfiles ?? []}
      currentUserId={user!.id}
      isAdmin={profile?.role === "admin"}
    />
  );
}
