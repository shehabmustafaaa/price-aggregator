"use client";

import { useActionState } from "react";
import { saveProductAction, type EditState } from "./actions";

interface Props {
  product: {
    id: number;
    nameEn: string;
    nameAr: string;
    slug: string;
    brandName: string;
    descriptionEn: string;
    descriptionAr: string;
    specsJson: string;
    imagesText: string;
  };
  viewHref: string;
}

export default function EditForm({ product, viewHref }: Props) {
  const [state, dispatch] = useActionState<EditState, FormData>(
    saveProductAction,
    undefined,
  );

  const field = "w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm";

  return (
    <form action={dispatch} className="space-y-4 max-w-2xl">
      <input type="hidden" name="id" value={product.id} />

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-xs text-gray-400">Name (EN)</span>
          <input name="nameEn" defaultValue={product.nameEn} className={field} />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-gray-400">Name (AR)</span>
          <input name="nameAr" defaultValue={product.nameAr} className={field} dir="rtl" />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-gray-400">Slug</span>
          <input name="slug" defaultValue={product.slug} className={field} />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-gray-400">Brand</span>
          <input name="brandName" defaultValue={product.brandName} className={field} />
        </label>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-xs text-gray-400">Description (EN)</span>
          <textarea name="descriptionEn" defaultValue={product.descriptionEn} rows={4} className={field} />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-gray-400">Description (AR)</span>
          <textarea name="descriptionAr" defaultValue={product.descriptionAr} rows={4} className={field} dir="rtl" />
        </label>
      </div>

      <label className="space-y-1 block">
        <span className="text-xs text-gray-400">
          Specs (JSON — e.g. {'{'}&quot;ram_gb&quot;:8,&quot;screen_inch&quot;:6.7,&quot;battery_mah&quot;:5000,&quot;has_5g&quot;:true{'}'})
        </span>
        <textarea name="specsJson" defaultValue={product.specsJson} rows={3} className={`${field} font-mono`} />
      </label>

      <label className="space-y-1 block">
        <span className="text-xs text-gray-400">Images (one URL per line)</span>
        <textarea name="imagesText" defaultValue={product.imagesText} rows={3} className={`${field} font-mono`} />
      </label>

      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-400">Saved.</p>}

      <div className="flex items-center gap-3">
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
          Save
        </button>
        <a href={viewHref} target="_blank" className="text-sm text-blue-400 underline">
          View product
        </a>
      </div>
    </form>
  );
}
