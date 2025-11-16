import { fetchApi } from "@/utils/fetchAPI";

type Variant = {
  id: number;
  product_id: number;
  label: string;
  attributes: any;
  is_active: boolean;
};

type VariantImage = {
  id: number;
  url: string;
  is_primary: boolean;
  sort_order: number;
  alt_text?: string | null;
};

async function fetchVariants(productId: string): Promise<Variant[]> {
  const res = await fetchApi(`/v1/product_variants?product_id=${productId}`);
  if (!res.ok) {
    throw new Error(`Failed to load variants: ${res.status}`);
  }
  return res.json();
}

async function fetchImages(variantId: number): Promise<VariantImage[]> {
  const res = await fetchApi(`/v1/product_variants/${variantId}/images`);
  if (!res.ok) {
    throw new Error(`Failed to load images for variant ${variantId}: ${res.status}`);
  }
  return res.json();
}

export default async function ProductPage({
  params,
}: {
  params: { productId: string };
}) {
  const { productId } = params;

  // 1) Load all variants belonging to this product
  const variants = await fetchVariants(productId);

  // 2) For each variant, load its images in parallel
  const imagesPerVariant = await Promise.all(
    variants.map((v) => fetchImages(v.id))
  );

  const variantsWithImages = variants.map((variant, idx) => ({
    variant,
    images: imagesPerVariant[idx],
  }));

  return (
    <div>
      <h2>Produkt {productId}</h2>

      {variantsWithImages.length === 0 && (
        <p>Keine Varianten für dieses Produkt gefunden.</p>
      )}

      {variantsWithImages.map(({ variant, images }) => (
        <section
          key={variant.id}
          style={{
            marginBottom: 32,
            padding: 16,
            background: "white",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
          }}
        >
          <h3 style={{ marginTop: 0 }}>
            Variante #{variant.id} – {variant.label}
          </h3>

          {/* Show attributes so you see what variant you're looking at */}
          {variant.attributes && (
            <pre
              style={{
                background: "#f9fafb",
                padding: 8,
                borderRadius: 4,
                fontSize: 12,
                overflowX: "auto",
              }}
            >
              {JSON.stringify(variant.attributes, null, 2)}
            </pre>
          )}

          {images.length === 0 ? (
            <p>Keine Bilder für diese Variante.</p>
          ) : (
            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 12,
                flexWrap: "wrap",
              }}
            >
              {images.map((img) => (
                <figure
                  key={img.id}
                  style={{
                    margin: 0,
                    textAlign: "center",
                  }}
                >
                  {/* This src is your embedded URL from the API */}
                  <img
                    src={img.url}
                    alt={img.alt_text || ""}
                    style={{
                      maxWidth: 200,
                      maxHeight: 200,
                      objectFit: "cover",
                      borderRadius: 8,
                      border: img.is_primary
                        ? "2px solid #2563eb"
                        : "1px solid #e5e7eb",
                    }}
                  />
                  {img.is_primary && (
                    <figcaption
                      style={{
                        fontSize: 12,
                        color: "#2563eb",
                        marginTop: 4,
                      }}
                    >
                      Primärbild
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
