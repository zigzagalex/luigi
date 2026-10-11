package daterange

import (
	"errors"
	"strings"
	"time"
)

const DateLayout = "2006-01-02"

// Zurich is the shop calendar timezone for rental day boundaries.
func Zurich() *time.Location {
	loc, err := time.LoadLocation("Europe/Zurich")
	if err != nil {
		return time.FixedZone("CET", 3600)
	}
	return loc
}

// ParseInclusiveZurich converts inclusive YYYY-MM-DD pickup/return dates into a
// half-open [startAt, endExclusive) range in Europe/Zurich.
// Pickup 12 Oct / return 15 Oct → start midnight 12 Oct Zurich, exclusive end midnight 16 Oct Zurich.
func ParseInclusiveZurich(startDate, endDate string) (startAt, endExclusive time.Time, err error) {
	startDate = strings.TrimSpace(startDate)
	endDate = strings.TrimSpace(endDate)
	if startDate == "" || endDate == "" {
		return time.Time{}, time.Time{}, errors.New("start_date and end_date required")
	}

	start, err := time.Parse(DateLayout, startDate)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}
	end, err := time.Parse(DateLayout, endDate)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}

	loc := Zurich()
	startAt = time.Date(start.Year(), start.Month(), start.Day(), 0, 0, 0, 0, loc)
	endInclusive := time.Date(end.Year(), end.Month(), end.Day(), 0, 0, 0, 0, loc)
	if endInclusive.Before(startAt) {
		return time.Time{}, time.Time{}, errors.New("end_date must be on or after start_date")
	}
	endExclusive = endInclusive.AddDate(0, 0, 1)
	return startAt, endExclusive, nil
}

// DayCount returns the number of rental calendar days for a half-open range.
func DayCount(startAt, endExclusive time.Time) int32 {
	if !endExclusive.After(startAt) {
		return 1
	}
	dur := endExclusive.Sub(startAt).Hours() / 24.0
	days := int32(dur)
	if dur-float64(days) > 0 {
		days++
	}
	if days <= 0 {
		days = 1
	}
	return days
}

// InclusiveEndDate returns the last included calendar day (YYYY-MM-DD) for a half-open range.
func InclusiveEndDate(endExclusive time.Time) string {
	loc := Zurich()
	inc := endExclusive.In(loc).AddDate(0, 0, -1)
	return time.Date(inc.Year(), inc.Month(), inc.Day(), 0, 0, 0, 0, loc).Format(DateLayout)
}
