import { redirect } from "next/navigation";

export default async function ReservationsPage({
  params,
}: {
  params: Promise<{ locale: string }> | { locale: string };
}) {
  const { locale } = await Promise.resolve(params);
  redirect(`/${locale}/users/reservations/prepare`);
}
