"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error: string | null };

function num(formData: FormData, key: string): number {
  return Number(formData.get(key));
}

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function createVehicle(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const assignedTo = str(formData, "assigned_to") || user.id;

  const { error } = await supabase.from("vehicles").insert({
    make: str(formData, "make"),
    model: str(formData, "model"),
    year: num(formData, "year"),
    price: num(formData, "price"),
    cost: formData.get("cost") ? num(formData, "cost") : null,
    vin: str(formData, "vin") || null,
    status: "available",
    assigned_to: assignedTo,
  });

  if (error) return { error: error.message };

  revalidatePath("/vehicles");
  revalidatePath("/");
  return { error: null };
}

export async function updateVehicle(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("vehicles")
    .update({
      make: str(formData, "make"),
      model: str(formData, "model"),
      year: num(formData, "year"),
      price: num(formData, "price"),
      cost: formData.get("cost") ? num(formData, "cost") : null,
      vin: str(formData, "vin") || null,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/vehicles");
  revalidatePath("/");
  return { error: null };
}

export async function deleteVehicle(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("vehicles").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/vehicles");
  revalidatePath("/");
  return { error: null };
}

export async function markVehicleSold(
  vehicleId: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.from("sales").insert({
    vehicle_id: vehicleId,
    salesperson_id: user.id,
    customer_name: str(formData, "customer_name"),
    sale_price: num(formData, "sale_price"),
  });
  // The vehicles row flips to status = 'sold' automatically via the
  // on_sale_created trigger (see migrations/0001_schema.sql) — no need to
  // update it separately here, and no window for the two to disagree.

  if (error) return { error: error.message };

  revalidatePath("/vehicles");
  revalidatePath("/sales");
  revalidatePath("/");
  return { error: null };
}
