package images

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"path/filepath"

	"github.com/google/uuid"

	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	"github.com/zigzagalex/luigi/api/internal/storage"
	u "github.com/zigzagalex/luigi/api/internal/utils"
)

type imageQuerier interface {
	CreateProductVariantImage(ctx context.Context, arg *db.CreateProductVariantImageParams) (db.ProductVariantImage, error)
	ListImagesByVariantID(ctx context.Context, productVariantID int64) ([]db.ProductVariantImage, error)
	GetPrimaryImageByVariantID(ctx context.Context, productVariantID int64) (db.ProductVariantImage, error)
	GetProductVariantImage(ctx context.Context, id int64) (db.ProductVariantImage, error)
	DeleteProductVariantImage(ctx context.Context, id int64) error
}

type Service struct {
	q            imageQuerier
	storage      storage.Client
	mediaBaseURL string
}

func NewService(q db.Querier, storage storage.Client, mediaBaseURL string) *Service {
	return &Service{
		q:            q,
		storage:      storage,
		mediaBaseURL: mediaBaseURL,
	}
}

// DTO = Data Transfer Object: clean JSON shape for the API,
type ImageDTO struct {
	ID        int64   `json:"id"`
	URL       string  `json:"url"`
	IsPrimary bool    `json:"is_primary"`
	SortOrder int32   `json:"sort_order"`
	AltText   *string `json:"alt_text,omitempty"`
}

var ErrNotFound = sql.ErrNoRows

func (s *Service) UploadVariantImage(
	ctx context.Context,
	variantID int64,
	file io.Reader,
	filename string,
	contentType string,
) (ImageDTO, error) {
	key := s.objectKeyForVariant(variantID, filename)

	if err := s.storage.Upload(ctx, key, file, contentType); err != nil {
		return ImageDTO{}, err
	}

	// figure out order + primary
	existing, err := s.q.ListImagesByVariantID(ctx, variantID)
	if err != nil {
		return ImageDTO{}, err
	}

	sortOrder := int32(len(existing))
	isPrimary := len(existing) == 0

	created, err := s.q.CreateProductVariantImage(ctx, &db.CreateProductVariantImageParams{
		ProductVariantID: variantID,
		ObjectKey:        key,
		SortOrder:        sortOrder,
		IsPrimary:        isPrimary,
		AltText:          u.ToNullString(nil), // no alt text on upload yet
		WidthPx:          sql.NullInt32{},
		HeightPx:         sql.NullInt32{},
	})
	if err != nil {
		return ImageDTO{}, err
	}

	return s.toDTO(created), nil
}

func (s *Service) ListVariantImages(ctx context.Context, variantID int64) ([]ImageDTO, error) {
	imgs, err := s.q.ListImagesByVariantID(ctx, variantID)
	if err != nil {
		return nil, err
	}

	out := make([]ImageDTO, 0, len(imgs))
	for _, img := range imgs {
		out = append(out, s.toDTO(img))
	}
	return out, nil
}

func (s *Service) DeleteVariantImage(ctx context.Context, imageID int64) error {
	img, err := s.q.GetProductVariantImage(ctx, imageID)
	if err != nil {
		return err
	}

	if err := s.storage.Delete(ctx, img.ObjectKey); err != nil {
		return err
	}

	return s.q.DeleteProductVariantImage(ctx, imageID)
}

func (s *Service) GetPrimaryImageURL(ctx context.Context, variantID int64) (string, error) {
	img, err := s.q.GetPrimaryImageByVariantID(ctx, variantID)
	if err != nil {
		return "", err
	}
	return s.publicURL(img.ObjectKey), nil
}

// internal helpers

func (s *Service) objectKeyForVariant(variantID int64, filename string) string {
	id := uuid.New().String()
	ext := filepath.Ext(filename)
	if ext == "" {
		ext = ".jpg"
	}
	return fmt.Sprintf("product-variants/%d/%s_orig%s", variantID, id, ext)
}

func (s *Service) publicURL(key string) string {
	return fmt.Sprintf("%s/%s", s.mediaBaseURL, key)
}

func (s *Service) toDTO(img db.ProductVariantImage) ImageDTO {
	var alt *string
	if img.AltText.Valid {
		v := img.AltText.String
		alt = &v
	}

	return ImageDTO{
		ID:        img.ID,
		URL:       s.publicURL(img.ObjectKey),
		IsPrimary: img.IsPrimary,
		SortOrder: img.SortOrder,
		AltText:   alt,
	}
}
