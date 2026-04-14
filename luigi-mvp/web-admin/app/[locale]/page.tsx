import { redirect } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }> | { locale: string };
}) {
  const { locale } = await Promise.resolve(params);
  redirect(`/${locale}/users`);
}
