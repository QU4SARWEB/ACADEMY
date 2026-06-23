UPDATE schedules SET day_of_week = CASE WHEN day_of_week = 0 THEN 6 ELSE day_of_week - 1 END;
