## Item Availability
Inventory item is AVAILABLE if no overlap with:
- maintenance_windows.time_range && desired_range
- reservation_items.padded_range && padded_desired_range   (or desired_range)
- holds.hold_range && desired_range AND holds.expires_at > now()


## Reservation Flows
