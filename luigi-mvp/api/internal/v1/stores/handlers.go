package storesv1

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	db "github.com/zigzagalex/luigi/api/internal/db/sqlc"
	"github.com/zigzagalex/luigi/api/internal/httpx"
	storesvc "github.com/zigzagalex/luigi/api/internal/stores"
)

func RegisterRoutes(r chi.Router, q db.Querier) {
	svc := storesvc.NewService(q)
	r.Route("/stores", func(r chi.Router) {
		r.Get("/", listHandler(svc))
		r.Post("/", createHandler(svc))
		r.Put("/{storeID}", updateHandler(svc))
		r.Delete("/{storeID}", deleteHandler(svc))
	})
}

type openingTimeInput struct {
	DayOfWeek int16   `json:"day_of_week"`
	OpensAt   *string `json:"opens_at"`
	ClosesAt  *string `json:"closes_at"`
	IsClosed  bool    `json:"is_closed"`
}

type openingTimeResponse struct {
	DayOfWeek int16   `json:"day_of_week"`
	OpensAt   *string `json:"opens_at"`
	ClosesAt  *string `json:"closes_at"`
	IsClosed  bool    `json:"is_closed"`
}

type holidayInput struct {
	StartDate string  `json:"start_date"`
	EndDate   string  `json:"end_date"`
	Note      *string `json:"note"`
}

type holidayResponse struct {
	StartDate string  `json:"start_date"`
	EndDate   string  `json:"end_date"`
	Note      *string `json:"note"`
}

type storeResponse struct {
	db.Store
	OpeningTimes []openingTimeResponse `json:"opening_times"`
	Holidays     []holidayResponse     `json:"holidays"`
}

func listHandler(svc *storesvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))

		var shopIDPtr *int64
		if s := r.URL.Query().Get("shop_id"); s != "" {
			if id, err := strconv.ParseInt(s, 10, 64); err == nil && id > 0 {
				shopIDPtr = &id
			}
		}

		items, err := svc.List(r.Context(), storesvc.ListInput{
			ShopID: shopIDPtr,
			Limit:  int32(limit),
			Offset: int32(offset),
		})
		if err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "list_stores_failed", err.Error())
			return
		}

		out := make([]storeResponse, 0, len(items))
		for _, item := range items {
			openingTimes, err := svc.ListOpeningTimes(r.Context(), item.ID)
			if err != nil {
				httpx.Fail(w, http.StatusInternalServerError, "list_store_opening_times_failed", err.Error())
				return
			}
			holidays, err := svc.ListHolidays(r.Context(), item.ID)
			if err != nil {
				httpx.Fail(w, http.StatusInternalServerError, "list_store_holidays_failed", err.Error())
				return
			}
			out = append(out, storeResponse{
				Store:        item,
				OpeningTimes: toOpeningTimeResponses(openingTimes),
				Holidays:     toHolidayResponses(holidays),
			})
		}
		httpx.JSON(w, http.StatusOK, out)
	}
}

type createReq struct {
	ShopID       int64              `json:"shop_id"`
	Name         string             `json:"name"`
	Address1     *string            `json:"address1"`
	Address2     *string            `json:"address2"`
	PostalCode   *string            `json:"postal_code"`
	City         *string            `json:"city"`
	Country      *string            `json:"country"`
	Timezone     *string            `json:"timezone"`
	IsActive     *bool              `json:"is_active"`
	OpeningTimes []openingTimeInput `json:"opening_times"`
	Holidays     []holidayInput     `json:"holidays"`
}

func createHandler(svc *storesvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req createReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			httpx.Fail(w, http.StatusBadRequest, "invalid_json", nil)
			return
		}
		if req.ShopID <= 0 || req.Name == "" {
			httpx.Fail(w, http.StatusBadRequest, "shop_id_and_name_required", nil)
			return
		}

		item, err := svc.Create(r.Context(), storesvc.CreateInput{
			ShopID:     req.ShopID,
			Name:       req.Name,
			Address1:   req.Address1,
			Address2:   req.Address2,
			PostalCode: req.PostalCode,
			City:       req.City,
			Country:    req.Country,
			Timezone:   req.Timezone,
			IsActive:   req.IsActive,
		})
		if err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "create_store_failed", err.Error())
			return
		}

		parsed, err := parseOpeningTimes(req.OpeningTimes)
		if err != nil {
			httpx.Fail(w, http.StatusBadRequest, "invalid_opening_times", nil)
			return
		}
		if len(parsed) > 0 {
			if err := svc.ReplaceOpeningTimes(r.Context(), item.ID, parsed); err != nil {
				httpx.Fail(w, http.StatusInternalServerError, "save_opening_times_failed", err.Error())
				return
			}
		}
		parsedHolidays, err := parseHolidays(req.Holidays)
		if err != nil {
			httpx.Fail(w, http.StatusBadRequest, "invalid_holidays", nil)
			return
		}
		if len(parsedHolidays) > 0 {
			if err := svc.ReplaceHolidays(r.Context(), item.ID, parsedHolidays); err != nil {
				httpx.Fail(w, http.StatusInternalServerError, "save_holidays_failed", err.Error())
				return
			}
		}

		openingTimes, err := svc.ListOpeningTimes(r.Context(), item.ID)
		if err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "list_store_opening_times_failed", err.Error())
			return
		}
		holidays, err := svc.ListHolidays(r.Context(), item.ID)
		if err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "list_store_holidays_failed", err.Error())
			return
		}

		httpx.JSON(w, http.StatusCreated, storeResponse{
			Store:        item,
			OpeningTimes: toOpeningTimeResponses(openingTimes),
			Holidays:     toHolidayResponses(holidays),
		})
	}
}

type updateReq struct {
	Name         *string            `json:"name"`
	Address1     *string            `json:"address1"`
	Address2     *string            `json:"address2"`
	PostalCode   *string            `json:"postal_code"`
	City         *string            `json:"city"`
	Country      *string            `json:"country"`
	Timezone     *string            `json:"timezone"`
	IsActive     *bool              `json:"is_active"`
	OpeningTimes []openingTimeInput `json:"opening_times"`
	Holidays     []holidayInput     `json:"holidays"`
}

func updateHandler(svc *storesvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := strconv.ParseInt(chi.URLParam(r, "storeID"), 10, 64)
		if err != nil || id <= 0 {
			httpx.Fail(w, http.StatusBadRequest, "invalid_id", nil)
			return
		}
		var req updateReq
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			httpx.Fail(w, http.StatusBadRequest, "invalid_json", nil)
			return
		}

		item, err := svc.Update(r.Context(), storesvc.UpdateInput{
			ID:         id,
			Name:       req.Name,
			Address1:   req.Address1,
			Address2:   req.Address2,
			PostalCode: req.PostalCode,
			City:       req.City,
			Country:    req.Country,
			Timezone:   req.Timezone,
			IsActive:   req.IsActive,
		})
		if err != nil {
			if err == storesvc.ErrNotFound {
				httpx.Fail(w, http.StatusNotFound, "store_not_found", nil)
			} else {
				httpx.Fail(w, http.StatusInternalServerError, "update_store_failed", err.Error())
			}
			return
		}

		parsed, err := parseOpeningTimes(req.OpeningTimes)
		if err != nil {
			httpx.Fail(w, http.StatusBadRequest, "invalid_opening_times", nil)
			return
		}
		if req.OpeningTimes != nil {
			if err := svc.ReplaceOpeningTimes(r.Context(), item.ID, parsed); err != nil {
				httpx.Fail(w, http.StatusInternalServerError, "save_opening_times_failed", err.Error())
				return
			}
		}
		parsedHolidays, err := parseHolidays(req.Holidays)
		if err != nil {
			httpx.Fail(w, http.StatusBadRequest, "invalid_holidays", nil)
			return
		}
		if req.Holidays != nil {
			if err := svc.ReplaceHolidays(r.Context(), item.ID, parsedHolidays); err != nil {
				httpx.Fail(w, http.StatusInternalServerError, "save_holidays_failed", err.Error())
				return
			}
		}

		openingTimes, err := svc.ListOpeningTimes(r.Context(), item.ID)
		if err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "list_store_opening_times_failed", err.Error())
			return
		}
		holidays, err := svc.ListHolidays(r.Context(), item.ID)
		if err != nil {
			httpx.Fail(w, http.StatusInternalServerError, "list_store_holidays_failed", err.Error())
			return
		}

		httpx.JSON(w, http.StatusOK, storeResponse{
			Store:        item,
			OpeningTimes: toOpeningTimeResponses(openingTimes),
			Holidays:     toHolidayResponses(holidays),
		})
	}
}

func deleteHandler(svc *storesvc.Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := strconv.ParseInt(chi.URLParam(r, "storeID"), 10, 64)
		if err != nil || id <= 0 {
			httpx.Fail(w, http.StatusBadRequest, "invalid_id", nil)
			return
		}

		item, err := svc.Delete(r.Context(), id)
		if err != nil {
			if err == storesvc.ErrNotFound {
				httpx.Fail(w, http.StatusNotFound, "store_not_found", nil)
				return
			}
			log.Printf("delete_store_failed id=%d: %v", id, err)
			httpx.Fail(w, http.StatusInternalServerError, "delete_store_failed", err.Error())
			return
		}
		httpx.JSON(w, http.StatusOK, item)
	}
}

func parseOpeningTimes(items []openingTimeInput) ([]storesvc.OpeningTimeInput, error) {
	if items == nil {
		return nil, nil
	}
	parsed := make([]storesvc.OpeningTimeInput, 0, len(items))
	for _, item := range items {
		if item.DayOfWeek < 0 || item.DayOfWeek > 6 {
			return nil, strconv.ErrSyntax
		}
		if item.IsClosed {
			parsed = append(parsed, storesvc.OpeningTimeInput{
				DayOfWeek: item.DayOfWeek,
				IsClosed:  true,
			})
			continue
		}
		if item.OpensAt == nil || item.ClosesAt == nil {
			return nil, strconv.ErrSyntax
		}
		openAt, err := time.Parse("15:04", *item.OpensAt)
		if err != nil {
			return nil, err
		}
		closeAt, err := time.Parse("15:04", *item.ClosesAt)
		if err != nil {
			return nil, err
		}
		if !openAt.Before(closeAt) {
			return nil, strconv.ErrSyntax
		}
		parsed = append(parsed, storesvc.OpeningTimeInput{
			DayOfWeek: item.DayOfWeek,
			OpensAt:   &openAt,
			ClosesAt:  &closeAt,
			IsClosed:  false,
		})
	}
	return parsed, nil
}

func toOpeningTimeResponses(items []db.StoreOpeningTime) []openingTimeResponse {
	out := make([]openingTimeResponse, 0, len(items))
	for _, item := range items {
		var opensAt *string
		var closesAt *string
		if item.OpensAt.Valid {
			v := item.OpensAt.String
			opensAt = &v
		}
		if item.ClosesAt.Valid {
			v := item.ClosesAt.String
			closesAt = &v
		}
		out = append(out, openingTimeResponse{
			DayOfWeek: item.DayOfWeek,
			OpensAt:   opensAt,
			ClosesAt:  closesAt,
			IsClosed:  item.IsClosed,
		})
	}
	return out
}

func parseHolidays(items []holidayInput) ([]storesvc.HolidayInput, error) {
	if items == nil {
		return nil, nil
	}
	out := make([]storesvc.HolidayInput, 0, len(items))
	for _, item := range items {
		startDate, err := time.Parse("2006-01-02", item.StartDate)
		if err != nil {
			return nil, err
		}
		endDate, err := time.Parse("2006-01-02", item.EndDate)
		if err != nil {
			return nil, err
		}
		if endDate.Before(startDate) {
			return nil, strconv.ErrSyntax
		}
		out = append(out, storesvc.HolidayInput{
			StartDate: startDate,
			EndDate:   endDate,
			Note:      item.Note,
		})
	}
	return out, nil
}

func toHolidayResponses(items []db.StoreHoliday) []holidayResponse {
	out := make([]holidayResponse, 0, len(items))
	for _, item := range items {
		var note *string
		if item.Note.Valid {
			v := item.Note.String
			note = &v
		}
		out = append(out, holidayResponse{
			StartDate: item.StartDate.Format("2006-01-02"),
			EndDate:   item.EndDate.Format("2006-01-02"),
			Note:      note,
		})
	}
	return out
}
