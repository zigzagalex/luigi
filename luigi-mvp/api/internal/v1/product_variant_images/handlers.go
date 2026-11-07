package productvariantimagesv1

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	"github.com/zigzagalex/luigi/api/internal/httpx"
	"github.com/zigzagalex/luigi/api/internal/images"
	"github.com/zigzagalex/luigi/api/internal/storage"
)

type ProductVariantImageHandler struct {
	svc *images.Service
}

func NewProductVariantImageHandler(svc *images.Service) *ProductVariantImageHandler {
	return &ProductVariantImageHandler{svc: svc}
}

func RegisterRoutesPublic(r chi.Router, q *db.Queries, store storage.Client, mediaBaseURL string) {
	svc := images.NewService(q, store, mediaBaseURL)
	h := NewProductVariantImageHandler(svc)

	r.Get("/product_variants/{variantID}/images", h.List)
}

func RegisterRoutesPrivate(r chi.Router, q *db.Queries, store storage.Client, mediaBaseURL string) {
	svc := images.NewService(q, store, mediaBaseURL)
	h := NewProductVariantImageHandler(svc)

	r.Post("/product_variants/{variantID}/images", h.Upload)
	r.Delete("/product_variants/{variantID}/images/{imageID}", h.Delete)
}

// POST /v1/product_variants/{variantID}/images
func (h *ProductVariantImageHandler) Upload(w http.ResponseWriter, r *http.Request) {
	variantIDStr := chi.URLParam(r, "variantID")
	variantID, err := strconv.ParseInt(variantIDStr, 10, 64)
	if err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid variant id", map[string]any{
			"variant_id": variantIDStr,
		})
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 20<<20)

	file, header, err := r.FormFile("file")
	if err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			httpx.Fail(w, http.StatusRequestEntityTooLarge, "file too large (max 10MB)", nil)
			return
		}
		httpx.Fail(w, http.StatusBadRequest, "missing file", nil)
		return
	}
	defer file.Close()

	img, err := h.svc.UploadVariantImage(r.Context(), variantID, file, header.Filename)
	if err != nil {
		if errors.Is(err, images.ErrUnsupportedFormat) {
			httpx.Fail(w, http.StatusBadRequest, "unsupported_image_format", nil)
			return
		}
		httpx.ServerError(w, "upload_image_failed", err)
		return
	}

	httpx.JSON(w, http.StatusCreated, img)
}

// GET /v1/product_variants/{variantID}/images
func (h *ProductVariantImageHandler) List(w http.ResponseWriter, r *http.Request) {
	variantIDStr := chi.URLParam(r, "variantID")
	variantID, err := strconv.ParseInt(variantIDStr, 10, 64)
	if err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid variant id", map[string]any{
			"variant_id": variantIDStr,
		})
		return
	}

	imgs, err := h.svc.ListVariantImages(r.Context(), variantID)
	if err != nil {
		httpx.ServerError(w, "list_images_failed", err)
		return
	}

	httpx.JSON(w, http.StatusOK, imgs)
}

// DELETE /v1/product_variants/{variantID}/images/{imageID}
func (h *ProductVariantImageHandler) Delete(w http.ResponseWriter, r *http.Request) {
	imageIDStr := chi.URLParam(r, "imageID")
	imageID, err := strconv.ParseInt(imageIDStr, 10, 64)
	if err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid image id", map[string]any{
			"image_id": imageIDStr,
		})
		return
	}

	if err := h.svc.DeleteVariantImage(r.Context(), imageID); err != nil {
		if errors.Is(err, images.ErrNotFound) {
			httpx.Fail(w, http.StatusNotFound, "image not found", map[string]any{
				"image_id": imageID,
			})
			return
		}
		httpx.ServerError(w, "delete_image_failed", err)
		return
	}

	httpx.JSON(w, http.StatusNoContent, nil)
}
