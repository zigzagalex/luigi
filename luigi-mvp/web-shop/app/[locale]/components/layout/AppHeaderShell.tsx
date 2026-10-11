// app/components/layout/AppHeaderShell.tsx
import AppHeader from "./AppHeader";
import {
  fetchCategoryOptions,
  fetchStoreOptions,
} from "@/../utils/fetchAPI";
import { SHOP_ID } from "@/lib/shopId";

export default async function AppHeaderShell() {
  const [categoryOptions, storeOptions] = await Promise.all([
    fetchCategoryOptions(SHOP_ID),
    fetchStoreOptions(SHOP_ID),
  ]);

  return <AppHeader categories={categoryOptions} stores={storeOptions} />;
}
