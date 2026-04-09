package accessoryvariantimagesv1

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"

	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	"github.com/zigzagalex/luigi/api/internal/httpx"
	"github.com/zigzagalex/luigi/api/internal/images"
	"github.com/zigzagalex/luigi/api/internal/storage"
)

type AccessoryVariantImageHandler struct {
	svc *images.Service
}

func NewAccessoryVariantImageHandler(svc *images.Service) *AccessoryVariantImageHandler {
	return &AccessoryVariantImageHandler{svc: svc}
}

func RegisterRoutes(r chi.Router, q *db.Queries, store storage.Client, mediaBaseURL string) {
	svc := images.NewService(q, store, mediaBaseURL)
	h := NewAccessoryVariantImageHandler(svc)

	r.Post("/accessory_variants/{variantID}/images", h.Upload)
	r.Get("/accessory_variants/{variantID}/images", h.List)
	r.Delete("/accessory_variants/{variantID}/images/{imageID}", h.Delete)
}

// POST /v1/accessory_variants/{variantID}/images
func (h *AccessoryVariantImageHandler) Upload(w http.ResponseWriter, r *http.Request) {
	variantIDStr := chi.URLParam(r, "variantID")
	variantID, err := strconv.ParseInt(variantIDStr, 10, 64)
	if err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid variant id", map[string]any{
			"variant_id": variantIDStr,
		})
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		httpx.Fail(w, http.StatusBadRequest, "missing file", nil)
		return
	}
	defer file.Close()

	contentType := header.Header.Get("Content-Type")
	var objectKeyOverride *string
	if s := strings.TrimSpace(r.FormValue("object_key")); s != "" {
		objectKeyOverride = &s
	}

	img, err := h.svc.UploadAccessoryVariantImage(r.Context(), variantID, file, header.Filename, contentType, objectKeyOverride)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "failed to upload image", err.Error())
		return
	}

	httpx.JSON(w, http.StatusCreated, img)
}

// GET /v1/accessory_variants/{variantID}/images
func (h *AccessoryVariantImageHandler) List(w http.ResponseWriter, r *http.Request) {
	variantIDStr := chi.URLParam(r, "variantID")
	variantID, err := strconv.ParseInt(variantIDStr, 10, 64)
	if err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid variant id", map[string]any{
			"variant_id": variantIDStr,
		})
		return
	}

	imgs, err := h.svc.ListAccessoryVariantImages(r.Context(), variantID)
	if err != nil {
		httpx.Fail(w, http.StatusInternalServerError, "failed to list images", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, imgs)
}

// DELETE /v1/accessory_variants/{variantID}/images/{imageID}
func (h *AccessoryVariantImageHandler) Delete(w http.ResponseWriter, r *http.Request) {
	imageIDStr := chi.URLParam(r, "imageID")
	imageID, err := strconv.ParseInt(imageIDStr, 10, 64)
	if err != nil {
		httpx.Fail(w, http.StatusBadRequest, "invalid image id", map[string]any{
			"image_id": imageIDStr,
		})
		return
	}

	if err := h.svc.DeleteAccessoryVariantImage(r.Context(), imageID); err != nil {
		if errors.Is(err, images.ErrNotFound) {
			httpx.Fail(w, http.StatusNotFound, "image not found", map[string]any{
				"image_id": imageID,
			})
			return
		}
		httpx.Fail(w, http.StatusInternalServerError, "failed to delete image", err.Error())
		return
	}

	httpx.JSON(w, http.StatusNoContent, nil)
}
