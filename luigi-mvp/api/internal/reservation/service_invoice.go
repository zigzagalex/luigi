package reservation

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	"github.com/zigzagalex/luigi/api/internal/invoice"
)

// ErrInvoiceNotAvailable is returned when the reservation status does not allow invoicing yet.
var ErrInvoiceNotAvailable = errors.New("invoice not available for this reservation status")

func invoiceEligibleStatus(status string) bool {
	switch status {
	case "in_use", "returned", "serviced", "closed":
		return true
	default:
		return false
	}
}

func nsString(ns sql.NullString) string {
	if !ns.Valid {
		return ""
	}
	return strings.TrimSpace(ns.String)
}

func buildInvoiceDoc(r db.Reservation, items []ReservationItemView, store db.Store, cust *db.Customer) invoice.Document {
	invNo := fmt.Sprintf("%d-%d", r.ShopID, r.ID)

	sellerLines := []string{}
	if a := nsString(store.Address1); a != "" {
		sellerLines = append(sellerLines, a)
	}
	if a2 := nsString(store.Address2); a2 != "" {
		sellerLines = append(sellerLines, a2)
	}
	pc := nsString(store.PostalCode)
	city := nsString(store.City)
	if pc != "" || city != "" {
		sellerLines = append(sellerLines, strings.TrimSpace(pc+" "+city))
	}
	if c := nsString(store.Country); c != "" {
		sellerLines = append(sellerLines, c)
	}

	custName := ""
	custLines := []string{}
	if cust != nil {
		custName = strings.TrimSpace(nsString(cust.FirstName) + " " + nsString(cust.LastName))
		if e := nsString(cust.Email); e != "" {
			custLines = append(custLines, e)
		}
		if ph := nsString(cust.Phone); ph != "" {
			custLines = append(custLines, ph)
		}
		if a := nsString(cust.Address1); a != "" {
			custLines = append(custLines, a)
		}
		if a2 := nsString(cust.Address2); a2 != "" {
			custLines = append(custLines, a2)
		}
		pc2 := nsString(cust.PostalCode)
		c2 := nsString(cust.City)
		if pc2 != "" || c2 != "" {
			custLines = append(custLines, strings.TrimSpace(pc2+" "+c2))
		}
		if strings.TrimSpace(cust.Country) != "" {
			custLines = append(custLines, strings.TrimSpace(cust.Country))
		}
	} else {
		custName = nsString(r.PickupPersonName)
		if custName == "" {
			custName = "Customer"
		}
		if e := nsString(r.PickupPersonEmail); e != "" {
			custLines = append(custLines, e)
		}
		if ph := nsString(r.PickupPersonPhone); ph != "" {
			custLines = append(custLines, ph)
		}
	}

	lineItems := make([]invoice.LineItem, 0, len(items))
	for _, v := range items {
		desc := strings.TrimSpace(v.ProductName)
		vt := strings.TrimSpace(v.VariantText)
		if vt != "" {
			if desc != "" {
				desc = desc + " — " + vt
			} else {
				desc = vt
			}
		}
		if desc == "" {
			desc = "Rental item"
		}
		q := v.ReservationItem.Quantity
		unit := v.ReservationItem.UnitPriceCents
		lineItems = append(lineItems, invoice.LineItem{
			Description: desc,
			Quantity:    q,
			UnitCents:   unit,
			LineCents:   unit * int64(q),
		})
	}

	start := r.StartAt.UTC().Format("2006-01-02")
	end := r.EndAt.UTC().Format("2006-01-02")

	return invoice.Document{
		InvoiceNumber: invNo,
		IssuedAt:      time.Now().UTC(),
		SellerName:    store.Name,
		SellerLines:   sellerLines,
		CustomerName:  custName,
		CustomerLines: custLines,
		ReservationID: r.ID,
		PeriodStart:   start,
		PeriodEnd:     end,
		Currency:      r.Currency,
		Items:         lineItems,
		TotalCents:    int64(r.TotalPriceCents),
	}
}

// InvoicePDFBytes builds a PDF invoice for a reservation.
// If forCustomerID is set, the reservation must belong to that customer (customer-facing API).
// If forCustomerID is nil, only shop ID is enforced (admin API must authorize separately).
func (s *Service) InvoicePDFBytes(ctx context.Context, shopID, reservationID int64, locale string, forCustomerID *int64) ([]byte, error) {
	var r db.Reservation
	var err error
	if forCustomerID != nil {
		r, err = s.q.GetMyReservation(ctx, &db.GetMyReservationParams{
			ReservationID: reservationID,
			ShopID:        shopID,
			CustomerID:    *forCustomerID,
		})
	} else {
		r, err = s.q.GetReservationByShop(ctx, &db.GetReservationByShopParams{
			ReservationID: reservationID,
			ShopID:        shopID,
		})
	}
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrReservationNotFound
		}
		return nil, err
	}
	if !invoiceEligibleStatus(r.Status) {
		return nil, ErrInvoiceNotAvailable
	}

	rows, err := s.q.ListReservationItemsByReservationIDs(ctx, []int64{r.ID})
	if err != nil {
		return nil, err
	}
	active := make([]db.ReservationItem, 0, len(rows))
	for _, it := range rows {
		if it.IsActive {
			active = append(active, it)
		}
	}
	views, err := s.buildReservationItemViews(ctx, active, locale)
	if err != nil {
		return nil, err
	}

	store, err := s.q.GetStoreById(ctx, r.StoreID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, err
		}
		return nil, err
	}

	var cust *db.Customer
	if r.CustomerID.Valid && r.CustomerID.Int64 > 0 {
		c, err := s.q.GetCustomerByID(ctx, r.CustomerID.Int64)
		if err != nil {
			if !errors.Is(err, sql.ErrNoRows) {
				return nil, err
			}
		} else {
			cust = &c
		}
	}

	doc := buildInvoiceDoc(r, views, store, cust)
	return invoice.BuildPDF(doc)
}
