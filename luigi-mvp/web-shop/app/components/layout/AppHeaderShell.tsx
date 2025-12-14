// app/components/layout/AppHeaderShell.tsx
import AppHeader from "./AppHeader";
import {
  fetchCategoryOptions,
  fetchStoreOptions,
} from "@/../utils/fetchAPI";

const DEFAULT_SHOP_ID = 1;

export default async function AppHeaderShell() {
  const [categoryOptions, storeOptions] = await Promise.all([
    fetchCategoryOptions(DEFAULT_SHOP_ID),
    fetchStoreOptions(DEFAULT_SHOP_ID),
  ]);

  return (
    <AppHeader
      categories={categoryOptions}
      stores={storeOptions}
    />
  );
}
