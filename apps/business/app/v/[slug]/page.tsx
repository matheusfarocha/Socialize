import { redirect } from "next/navigation";

export default async function BusinessCustomerRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const customerAppUrl = process.env.NEXT_PUBLIC_CUSTOMER_APP_URL?.replace(/\/$/, "");

  if (customerAppUrl) {
    redirect(`${customerAppUrl}/v/${slug}`);
  }

  redirect(`/c/${slug}`);
}
