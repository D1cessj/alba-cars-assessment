"use client";

import { Fragment, useState, useTransition } from "react";
import type { Profile, Vehicle } from "@/lib/database.types";
import {
  createVehicle,
  deleteVehicle,
  markVehicleSold,
  updateVehicle,
} from "./actions";

const STATUS_STYLES: Record<Vehicle["status"], string> = {
  available: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  sold: "bg-slate-100 text-slate-500 border-slate-200",
};

function currency(n: number) {
  return `AED ${Math.round(n).toLocaleString()}`;
}

type Props = {
  initialVehicles: Vehicle[];
  loadError: string | null;
  profiles: Profile[];
  currentUserId: string;
  isAdmin: boolean;
};

export function VehiclesClient({
  initialVehicles,
  loadError,
  profiles,
  currentUserId,
  isAdmin,
}: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sellingId, setSellingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function profileName(id: string | null) {
    if (!id) return "Unassigned";
    if (id === currentUserId) return "You";
    return profiles.find((p) => p.id === id)?.full_name ?? "Unknown";
  }

  function runAction(action: () => Promise<{ error: string | null }>) {
    setFormError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setFormError(result.error);
      } else {
        setIsAdding(false);
        setEditingId(null);
        setSellingId(null);
      }
    });
  }

  if (loadError) {
    return (
      <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        Couldn&apos;t load inventory: {loadError}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Inventory</h1>
          <p className="text-sm text-slate-500">
            {isAdmin ? "All vehicles" : "Vehicles assigned to you"} —{" "}
            {initialVehicles.length} listing{initialVehicles.length === 1 ? "" : "s"}.
          </p>
        </div>
        <button
          onClick={() => {
            setIsAdding((v) => !v);
            setEditingId(null);
            setFormError(null);
          }}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
        >
          {isAdding ? "Cancel" : "+ Add vehicle"}
        </button>
      </div>

      {formError && (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {formError}
        </p>
      )}

      {isAdding && (
        <VehicleForm
          isAdmin={isAdmin}
          profiles={profiles}
          isPending={isPending}
          onCancel={() => setIsAdding(false)}
          onSubmit={(formData) => runAction(() => createVehicle(formData))}
        />
      )}

      {initialVehicles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          No vehicles yet. Add your first listing to get started.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Assigned to</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {initialVehicles.map((vehicle) => (
                <Fragment key={vehicle.id}>
                  <tr className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </p>
                      {vehicle.vin && (
                        <p className="text-xs text-slate-400">{vehicle.vin}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{currency(vehicle.price)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[vehicle.status]}`}
                      >
                        {vehicle.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {profileName(vehicle.assigned_to)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {vehicle.status !== "sold" && (
                          <button
                            onClick={() => {
                              setSellingId((v) => (v === vehicle.id ? null : vehicle.id));
                              setEditingId(null);
                              setFormError(null);
                            }}
                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            Mark sold
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingId((v) => (v === vehicle.id ? null : vehicle.id));
                            setSellingId(null);
                            setIsAdding(false);
                            setFormError(null);
                          }}
                          className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete ${vehicle.make} ${vehicle.model}?`)) {
                              runAction(() => deleteVehicle(vehicle.id));
                            }
                          }}
                          className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editingId === vehicle.id && (
                    <tr>
                      <td colSpan={5} className="bg-slate-50 px-4 py-4">
                        <VehicleForm
                          isAdmin={isAdmin}
                          profiles={profiles}
                          vehicle={vehicle}
                          isPending={isPending}
                          onCancel={() => setEditingId(null)}
                          onSubmit={(formData) =>
                            runAction(() => updateVehicle(vehicle.id, formData))
                          }
                        />
                      </td>
                    </tr>
                  )}
                  {sellingId === vehicle.id && (
                    <tr>
                      <td colSpan={5} className="bg-slate-50 px-4 py-4">
                        <SaleForm
                          suggestedPrice={vehicle.price}
                          isPending={isPending}
                          onCancel={() => setSellingId(null)}
                          onSubmit={(formData) =>
                            runAction(() => markVehicleSold(vehicle.id, formData))
                          }
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function VehicleForm({
  vehicle,
  isAdmin,
  profiles,
  isPending,
  onSubmit,
  onCancel,
}: {
  vehicle?: Vehicle;
  isAdmin: boolean;
  profiles: Profile[];
  isPending: boolean;
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
}) {
  return (
    <form
      action={onSubmit}
      className="animate-fade-in-up grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-4"
    >
      <Field label="Make" name="make" defaultValue={vehicle?.make} required />
      <Field label="Model" name="model" defaultValue={vehicle?.model} required />
      <Field
        label="Year"
        name="year"
        type="number"
        defaultValue={vehicle?.year}
        required
      />
      <Field label="VIN (optional)" name="vin" defaultValue={vehicle?.vin ?? ""} />
      <Field
        label="Price (AED)"
        name="price"
        type="number"
        step="0.01"
        defaultValue={vehicle?.price}
        required
      />
      <Field
        label="Cost (optional)"
        name="cost"
        type="number"
        step="0.01"
        defaultValue={vehicle?.cost ?? ""}
      />
      {isAdmin && !vehicle && (
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-600">
            Assign to
          </label>
          <select
            name="assigned_to"
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="col-span-2 flex items-end gap-2 sm:col-span-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {isPending ? "Saving…" : vehicle ? "Save changes" : "Add vehicle"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function SaleForm({
  suggestedPrice,
  isPending,
  onSubmit,
  onCancel,
}: {
  suggestedPrice: number;
  isPending: boolean;
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
}) {
  return (
    <form
      action={onSubmit}
      className="animate-fade-in-up flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4"
    >
      <Field label="Customer name" name="customer_name" required />
      <Field
        label="Sale price (AED)"
        name="sale_price"
        type="number"
        step="0.01"
        defaultValue={suggestedPrice}
        required
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
      >
        {isPending ? "Recording…" : "Confirm sale"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
      >
        Cancel
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  step,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number;
  required?: boolean;
  step?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
      <input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        required={required}
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
    </div>
  );
}
