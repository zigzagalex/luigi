package invoice

import (
	"bytes"
	"fmt"
	"strings"
	"time"

	"github.com/phpdave11/gofpdf"
)

// LineItem is one row on the invoice (active rental line).
type LineItem struct {
	Description string
	Quantity    int32
	UnitCents   int64
	LineCents   int64
}

// Document is the data needed to render a reservation rental invoice PDF.
type Document struct {
	InvoiceNumber string
	IssuedAt      time.Time

	SellerName  string
	SellerLines []string

	CustomerName  string
	CustomerLines []string

	ReservationID int64
	PeriodStart   string
	PeriodEnd     string

	Currency   string
	Items      []LineItem
	TotalCents int64
}

func money(cents int64, currency string) string {
	s := fmt.Sprintf("%.2f", float64(cents)/100.0)
	currency = strings.TrimSpace(currency)
	if currency == "" {
		return s
	}
	return currency + " " + s
}

func truncate(s string, max int) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return ""
	}
	r := []rune(s)
	if len(r) <= max {
		return s
	}
	return string(r[:max-1]) + "…"
}

// BuildPDF renders a simple A4 invoice and returns PDF bytes.
func BuildPDF(d Document) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(18, 18, 18)
	pdf.SetAutoPageBreak(true, 20)
	pdf.AddPage()

	pdf.SetFont("Helvetica", "B", 16)
	pdf.Cell(0, 9, "Invoice")
	pdf.Ln(10)

	pdf.SetFont("Helvetica", "", 9)
	pdf.Cell(0, 5, fmt.Sprintf("Invoice no. %s", strings.TrimSpace(d.InvoiceNumber)))
	pdf.Ln(5)
	pdf.Cell(0, 5, fmt.Sprintf("Issued: %s", d.IssuedAt.UTC().Format("2006-01-02")))
	pdf.Ln(8)

	// From / Bill to
	pdf.SetFont("Helvetica", "B", 10)
	pdf.Cell(90, 5, "From (store)")
	pdf.Cell(0, 5, "Bill to")
	pdf.Ln(6)
	pdf.SetFont("Helvetica", "", 9)

	fromY := pdf.GetY()
	pdf.SetXY(18, fromY)
	sellerBlock := strings.TrimSpace(d.SellerName)
	if len(d.SellerLines) > 0 {
		sellerBlock += "\n" + strings.Join(d.SellerLines, "\n")
	}
	pdf.MultiCell(85, 4.5, sellerBlock, "", "L", false)

	billY := fromY
	pdf.SetXY(108, billY)
	customerBlock := strings.TrimSpace(d.CustomerName)
	if len(d.CustomerLines) > 0 {
		customerBlock += "\n" + strings.Join(d.CustomerLines, "\n")
	}
	pdf.MultiCell(0, 4.5, customerBlock, "", "L", false)

	if pdf.GetY() < fromY+28 {
		pdf.SetY(fromY + 28)
	}

	pdf.Ln(4)
	pdf.SetFont("Helvetica", "", 9)
	pdf.Cell(0, 5, fmt.Sprintf("Reservation #%d", d.ReservationID))
	pdf.Ln(5)
	pdf.Cell(0, 5, fmt.Sprintf("Rental period: %s → %s", d.PeriodStart, d.PeriodEnd))
	pdf.Ln(9)

	// Table
	pdf.SetFont("Helvetica", "B", 9)
	pdf.Cell(92, 6, "Description")
	pdf.Cell(18, 6, "Qty")
	pdf.Cell(32, 6, "Unit")
	pdf.Cell(0, 6, "Amount")
	pdf.Ln(7)
	pdf.SetFont("Helvetica", "", 9)
	for _, it := range d.Items {
		desc := strings.TrimSpace(it.Description)
		if desc == "" {
			desc = "Item"
		}
		desc = truncate(desc, 120)
		line := money(it.LineCents, d.Currency)
		unit := money(it.UnitCents, d.Currency)
		pdf.Cell(92, 5, truncate(desc, 70))
		pdf.Cell(18, 5, fmt.Sprintf("%d", it.Quantity))
		pdf.Cell(32, 5, unit)
		pdf.Cell(0, 5, line)
		pdf.Ln(5)
	}

	pdf.Ln(4)
	pdf.SetFont("Helvetica", "B", 10)
	pdf.Cell(142, 6, "Total")
	pdf.Cell(0, 6, money(d.TotalCents, d.Currency))
	pdf.Ln(10)

	pdf.SetFont("Helvetica", "", 8)
	pdf.SetTextColor(80, 80, 80)
	pdf.MultiCell(0, 4, "This document is a rental invoice issued by the pickup store for the reservation above.", "", "L", false)

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
