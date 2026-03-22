import { fetchApi } from "./fetchAPI";

export type CategoryTreeNode = {
  id: number;
  shop_id: number;
  parent_id?: number | null;
  slug: string;
  name: string;
  description?: string | null;
  sort_order: number;
  is_active: boolean;
  children?: CategoryTreeNode[];
};

export async function fetchCategoryTree(
  shopId: number,
): Promise<CategoryTreeNode[]> {
  const res = await fetchApi(`/v1/categories/tree?shop_id=${shopId}`);
  if (!res.ok) {
    throw new Error(`category tree failed: ${res.status}`);
  }
  const data = (await res.json()) as CategoryTreeNode[];
  return Array.isArray(data) ? data : [];
}

export function indexCategoriesById(
  tree: CategoryTreeNode[],
): Map<number, CategoryTreeNode> {
  const m = new Map<number, CategoryTreeNode>();
  const walk = (nodes: CategoryTreeNode[]) => {
    for (const n of nodes) {
      m.set(n.id, n);
      if (n.children?.length) walk(n.children);
    }
  };
  walk(tree);
  return m;
}

export function findCategoryBySlug(
  tree: CategoryTreeNode[],
  slug: string,
): CategoryTreeNode | null {
  for (const n of tree) {
    if (n.slug === slug) return n;
    if (n.children?.length) {
      const found = findCategoryBySlug(n.children, slug);
      if (found) return found;
    }
  }
  return null;
}

export function categoryBreadcrumbs(
  byId: Map<number, CategoryTreeNode>,
  node: CategoryTreeNode,
): { slug: string; name: string }[] {
  const crumbs: { slug: string; name: string }[] = [];
  let cur: CategoryTreeNode | undefined = node;
  const seen = new Set<number>();
  while (cur) {
    if (seen.has(cur.id)) break;
    seen.add(cur.id);
    crumbs.push({ slug: cur.slug, name: cur.name });
    const pid = cur.parent_id;
    if (pid == null) break;
    cur = byId.get(pid);
  }
  return crumbs.reverse();
}

export function sortedActiveChildren(node: CategoryTreeNode): CategoryTreeNode[] {
  return (node.children ?? [])
    .filter((c) => c.is_active !== false)
    .sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.name.localeCompare(b.name);
    });
}

export function sortedActiveRootCategories(
  tree: CategoryTreeNode[],
): CategoryTreeNode[] {
  return [...tree]
    .filter((c) => c.is_active !== false)
    .sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.name.localeCompare(b.name);
    });
}
