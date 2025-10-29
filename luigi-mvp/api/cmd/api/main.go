package main

import (
  "database/sql"
  "fmt"
  "log"
  "net/http"
  "os"
  "time"

  "github.com/go-chi/chi/v5"
  _ "github.com/jackc/pgx/v5/stdlib"
)

func env(k string) string {
  v := os.Getenv(k)
  if v == "" { log.Fatalf("missing env %s", k) }
  return v
}

func main() {
  inst := env("DB_INSTANCE")
  user := env("DB_USER")
  pass := env("DB_PASSWORD")
  name := env("DB_NAME")

  dsn := fmt.Sprintf(
	"host=/cloudsql/%s user=%s password=%s dbname=%s sslmode=disable",
	 inst, user, pass, name
	)
  db, err := sql.Open("pgx", dsn)
  if err != nil { log.Fatal(err) }
  defer db.Close()
  db.SetMaxOpenConns(5)
  db.SetConnMaxIdleTime(5 * time.Minute)

  r := chi.NewRouter()
  r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) { w.Write([]byte("ok")) })
  r.Get("/v1/products", func(w http.ResponseWriter, req *http.Request) {
    rows, err := db.QueryContext(req.Context(), `SELECT id, name FROM products ORDER BY id`)
    if err != nil { http.Error(w, err.Error(), 500); return }
    defer rows.Close()
    w.Header().Set("Content-Type", "application/json")
    w.Write([]byte("["))
    first := true
    for rows.Next() {
      var id int; var name string
      rows.Scan(&id, &name)
      if !first { w.Write([]byte(",")) }; first = false
      w.Write([]byte(fmt.Sprintf(`{"id":%d,"name":%q}`, id, name)))
    }
    w.Write([]byte("]"))
  })

  log.Fatal(http.ListenAndServe(":8080", r))
}
