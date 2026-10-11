-- name: CreateSession :one
INSERT INTO sessions (
    user_id,
    token_hash,
    expires_at
) VALUES (
    sqlc.arg(user_id),
    sqlc.arg(token_hash),
    sqlc.arg(expires_at)
)
RETURNING
    id,
    user_id,
    token_hash,
    expires_at,
    created_at,
    updated_at;


-- name: GetSessionByTokenHash :one
SELECT
    id,
    user_id,
    token_hash,
    expires_at,
    created_at,
    updated_at
FROM sessions
WHERE token_hash = sqlc.arg(token_hash)
  AND expires_at > now();


-- name: DeleteSessionByTokenHash :exec
DELETE FROM sessions
WHERE token_hash = sqlc.arg(token_hash);


-- name: DeleteSessionsByUserID :exec
DELETE FROM sessions
WHERE user_id = sqlc.arg(user_id);
