package availability

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
)

// We depend only on the subset of db.Querier we actually use.
type availabilityQuerier interface {
	SearchAvailableVariants(ctx context.Context, arg *db.SearchAvailableVariantsParams) ([]db.SearchAvailableVariantsRow, error)
	CountAvailableInventoryForRange(ctx context.Context, arg *db.CountAvailableInventoryForRangeParams) (int32, error)
	GetPriceCategoryForVariant(ctx context.Context, variantID int64) (string, error)
	GetPricePoint(ctx context.Context, arg *db.GetPricePointParams) (db.PricePoint, error)
}

type Service struct {
	q availabilityQuerier
}

func NewService(q availabilityQuerier) *Service {
	return &Service{q: q}
}

type SearchInput struct {
	ShopID      *int64
	StoreID     *int64
	ProductIDs  []int64
	CategoryIDs []int64
	StartDate   time.Time // date-only
	EndDate     time.Time // date-only (checkout date; exclusive)
	Quantity    int32
}

type VariantAvailability struct {
	ProductVariantID  int64   `json:"product_variant_id"`
	Size              *string `json:"size,omitempty"`
	AvailableQuantity int32   `json:"available_quantity"`
}

type SearchResult struct {
	ProductID     int64                 `json:"product_id"`
	ShopID        int64                 `json:"shop_id"`
	StoreIDs      []int64               `json:"store_ids"`
	MinPriceCents int32                 `json:"min_price_cents"`
	Currency      string                `json:"currency"`
	Variants      []VariantAvailability `json:"variants"`
}

type CalendarInput struct {
	ProductVariantID int64
	StoreID          int64
	FromDate         time.Time // date-only (inclusive)
	ToDate           time.Time // date-only (exclusive)
}

type CalendarDay struct {
	Date              string `json:"date"`               // YYYY-MM-DD
	AvailableQuantity int32  `json:"available_quantity"` // 0 = fully booked
}

type QuoteInput struct {
	ProductVariantID int64
	StoreID          int64
	StartAt          time.Time
	EndAt            time.Time
	Quantity         int32
}

type QuoteResult struct {
	OK              bool    `json:"ok"`
	Reason          *string `json:"reason,omitempty"`
	DayCount        int32   `json:"day_count"`
	PriceTotalCents int32   `json:"price_total_cents"`
	Currency        string  `json:"currency"`
}

const day = 24 * time.Hour

func normalizeDate(t time.Time) time.Time {
	if t.IsZero() {
		return t
	}
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
}

func calcDayCount(start, end time.Time) int32 {
	if !end.After(start) {
		return 1
	}
	dur := end.Sub(start).Hours() / 24.0
	days := int32(dur)
	if dur-float64(days) > 0 {
		days++
	}
	if days <= 0 {
		days = 1
	}
	return days
}

func ptr[T any](v T) *T { return &v }

// Search checks availability for many products / variants and returns product cards
// with the minimum price for the requested date-range and quantity.
func (s *Service) Search(ctx context.Context, in SearchInput) ([]SearchResult, error) {
	if in.Quantity <= 0 {
		return nil, fmt.Errorf("quantity must be > 0")
	}

	start := normalizeDate(in.StartDate)
	end := normalizeDate(in.EndDate)
	if end.IsZero() || !end.After(start) {
		end = start.Add(day)
	}

	dayCount := calcDayCount(start, end)

	rows, err := s.q.SearchAvailableVariants(ctx, &db.SearchAvailableVariantsParams{
		ShopID:      sql.NullInt64{Int64: derefInt64(in.ShopID), Valid: in.ShopID != nil},
		StoreID:     sql.NullInt64{Int64: derefInt64(in.StoreID), Valid: in.StoreID != nil},
		ProductIds:  in.ProductIDs,
		CategoryIds: in.CategoryIDs,
		StartAt:     start,
		EndAt:       end,
		Quantity:    in.Quantity,
	})
	if err != nil {
		return nil, err
	}

	if len(rows) == 0 {
		return []SearchResult{}, nil
	}

	// Aggregate per product
	type variantAgg struct {
		variantID  int64
		totalAvail int64
		// size left nil for now → can be enriched later if needed
	}
	type productAgg struct {
		productID int64
		shopID    int64
		storeSet  map[int64]struct{}
		minPrice  *int32
		variants  map[int64]*variantAgg
	}

	products := make(map[int64]*productAgg)

	for _, r := range rows {
		pAgg, ok := products[r.ProductID]
		if !ok {
			pAgg = &productAgg{
				productID: r.ProductID,
				shopID:    r.ShopID,
				storeSet:  make(map[int64]struct{}),
				minPrice:  nil,
				variants:  make(map[int64]*variantAgg),
			}
			products[r.ProductID] = pAgg
		}

		// collect store ids
		pAgg.storeSet[r.StoreID] = struct{}{}

		// aggregate variant availability across stores
		vAgg, ok := pAgg.variants[r.ProductVariantID]
		if !ok {
			vAgg = &variantAgg{
				variantID:  r.ProductVariantID,
				totalAvail: 0,
			}
			pAgg.variants[r.ProductVariantID] = vAgg
		}
		vAgg.totalAvail += r.AvailableQuantity

		// compute price for this variant (for the *requested* dayCount and quantity)
		priceCategory, err := s.q.GetPriceCategoryForVariant(ctx, r.ProductVariantID)
		if err != nil {
			return nil, err
		}

		pp, err := s.q.GetPricePoint(ctx, &db.GetPricePointParams{
			PriceCategory: priceCategory,
			DayCount:      dayCount,
		})
		if err != nil {
			// If no exact price exists for that dayCount, you could implement
			// fallback logic here. For now: bubble up.
			return nil, err
		}

		totalPrice := pp.PriceTotalCents * in.Quantity

		if pAgg.minPrice == nil || totalPrice < *pAgg.minPrice {
			pAgg.minPrice = &totalPrice
		}
	}

	// Convert to DTO
	out := make([]SearchResult, 0, len(products))
	for _, p := range products {
		storeIDs := make([]int64, 0, len(p.storeSet))
		for id := range p.storeSet {
			storeIDs = append(storeIDs, id)
		}

		variants := make([]VariantAvailability, 0, len(p.variants))
		for _, v := range p.variants {
			// size is omitted for now; can be enriched later if necessary
			variants = append(variants, VariantAvailability{
				ProductVariantID:  v.variantID,
				Size:              nil,
				AvailableQuantity: int32(v.totalAvail),
			})
		}

		minPrice := int32(0)
		if p.minPrice != nil {
			minPrice = *p.minPrice
		}

		out = append(out, SearchResult{
			ProductID:     p.productID,
			ShopID:        p.shopID,
			StoreIDs:      storeIDs,
			MinPriceCents: minPrice,
			Currency:      "CHF",
			Variants:      variants,
		})
	}

	return out, nil
}

// Calendar returns per-day availability for a single variant+store between FromDate and ToDate.
func (s *Service) Calendar(ctx context.Context, in CalendarInput) ([]CalendarDay, error) {
	if in.ProductVariantID <= 0 || in.StoreID <= 0 {
		return nil, fmt.Errorf("product_variant_id and store_id must be > 0")
	}

	from := normalizeDate(in.FromDate)
	to := normalizeDate(in.ToDate)
	if to.IsZero() || !to.After(from) {
		to = from.Add(7 * day) // sensible default window
	}

	var days []CalendarDay

	for d := from; d.Before(to); d = d.Add(day) {
		start := d
		end := d.Add(day)

		count, err := s.q.CountAvailableInventoryForRange(ctx, &db.CountAvailableInventoryForRangeParams{
			ProductVariantID: in.ProductVariantID,
			StoreID:          in.StoreID,
			StartAt:          start,
			EndAt:            end,
		})
		if err != nil {
			return nil, err
		}

		avail := count
		if avail < 0 {
			avail = 0
		}

		days = append(days, CalendarDay{
			Date:              d.Format("2006-01-02"),
			AvailableQuantity: avail,
		})
	}

	return days, nil
}

// Quote checks whether a specific request is bookable and returns price.
func (s *Service) Quote(ctx context.Context, in QuoteInput) (QuoteResult, error) {
	// basic validation
	if in.ProductVariantID <= 0 || in.StoreID <= 0 {
		return QuoteResult{}, fmt.Errorf("product_variant_id and store_id must be > 0")
	}
	if in.Quantity <= 0 {
		return QuoteResult{}, fmt.Errorf("quantity must be > 0")
	}
	if !in.EndAt.After(in.StartAt) {
		return QuoteResult{
			OK:       false,
			Reason:   ptr("end_at must be after start_at"),
			DayCount: 0,
			// still return currency so UI doesn't freak out
			Currency: "CHF",
		}, nil
	}

	dayCount := calcDayCount(in.StartAt, in.EndAt)

	// Check availability
	available, err := s.q.CountAvailableInventoryForRange(ctx, &db.CountAvailableInventoryForRangeParams{
		ProductVariantID: in.ProductVariantID,
		StoreID:          in.StoreID,
		StartAt:          in.StartAt,
		EndAt:            in.EndAt,
	})
	if err != nil {
		return QuoteResult{}, err
	}

	if available < in.Quantity {
		reason := fmt.Sprintf("only %d units available for that range", available)
		return QuoteResult{
			OK:              false,
			Reason:          &reason,
			DayCount:        dayCount,
			PriceTotalCents: 0,
			Currency:        "CHF",
		}, nil
	}

	// Resolve price
	priceCategory, err := s.q.GetPriceCategoryForVariant(ctx, in.ProductVariantID)
	if err != nil {
		return QuoteResult{}, err
	}

	pp, err := s.q.GetPricePoint(ctx, &db.GetPricePointParams{
		PriceCategory: priceCategory,
		DayCount:      dayCount,
	})
	if err != nil {
		// Could add fallback to closest tier here; for now, hard fail.
		return QuoteResult{}, err
	}

	total := pp.PriceTotalCents * in.Quantity

	return QuoteResult{
		OK:              true,
		Reason:          nil,
		DayCount:        dayCount,
		PriceTotalCents: total,
		Currency:        "CHF",
	}, nil
}

func derefInt64(p *int64) int64 {
	if p == nil {
		return 0
	}
	return *p
}
