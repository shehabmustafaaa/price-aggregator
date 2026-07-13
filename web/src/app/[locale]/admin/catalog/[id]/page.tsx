import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getAdminUser } from "@/lib/auth/admin";
import { getProductByIdAdmin } from "@/lib/catalog/products";
import AdminGate from "@/components/AdminGate";
import { Link } from "@/i18n/navigation";
import EditForm from "./EditForm";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!(await getAdminUser())) return <AdminGate />;

  const product = await getProductByIdAdmin(Number(id));
  if (!product) notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Edit #{product.id}</h1>
        <Link href="/admin/catalog" className="text-sm text-gray-400 underline">
          ← Back to catalog
        </Link>
      </div>
      <EditForm
        product={{
          id: product.id,
          nameEn: product.nameEn,
          nameAr: product.nameAr,
          slug: product.slug,
          brandName: product.brand?.name ?? "",
          descriptionEn: product.descriptionEn ?? "",
          descriptionAr: product.descriptionAr ?? "",
          specsJson: JSON.stringify(product.specs ?? {}, null, 0),
          imagesText: (product.images ?? []).join("\n"),
        }}
        viewHref={`/${locale}/p/${product.slug}`}
      />
    </div>
  );
}
