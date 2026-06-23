UPDATE exams SET passing_score = ROUND(passing_score / 5);
UPDATE exam_attempts SET score = ROUND(score / 5) WHERE score IS NOT NULL;
