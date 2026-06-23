UPDATE enrollments SET final_grade = ROUND(final_grade / 5) WHERE final_grade IS NOT NULL;
