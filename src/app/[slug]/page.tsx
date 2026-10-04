import { notFound } from "next/navigation";
import { getSignerBySlug } from "@/data/signers";
import { readStore } from "@/lib/store";
import { SignPageClient } from "@/components/SignPageClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function SignerPage({ params }: Props) {
  const { slug } = await params;
  const signer = getSignerBySlug(slug);
  if (!signer) notFound();

  const store = await readStore();
  const record = store.signers[signer.slug];

  return (
    <SignPageClient
      name={signer.name}
      slug={signer.slug}
      initialStatus={record?.status ?? "pending"}
    />
  );
}
