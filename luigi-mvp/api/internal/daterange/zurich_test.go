package daterange

import (
	"testing"
	"time"
)

func TestParseInclusiveZurich_FourDays(t *testing.T) {
	startAt, endExclusive, err := ParseInclusiveZurich("2026-10-12", "2026-10-15")
	if err != nil {
		t.Fatal(err)
	}

	if got := DayCount(startAt, endExclusive); got != 4 {
		t.Fatalf("day count = %d, want 4", got)
	}

	wantEndUTC := time.Date(2026, 10, 15, 22, 0, 0, 0, time.UTC)
	if !endExclusive.UTC().Equal(wantEndUTC) {
		t.Fatalf("endExclusive UTC = %s, want %s", endExclusive.UTC(), wantEndUTC)
	}

	if got := InclusiveEndDate(endExclusive); got != "2026-10-15" {
		t.Fatalf("InclusiveEndDate = %s, want 2026-10-15", got)
	}
}

func TestParseInclusiveZurich_OneDay(t *testing.T) {
	startAt, endExclusive, err := ParseInclusiveZurich("2026-10-12", "2026-10-12")
	if err != nil {
		t.Fatal(err)
	}
	if got := DayCount(startAt, endExclusive); got != 1 {
		t.Fatalf("day count = %d, want 1", got)
	}
}
