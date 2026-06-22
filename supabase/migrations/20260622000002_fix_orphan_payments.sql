-- ============================================================
-- Fix orphan payments: link NULL enrollment_id + create missing
-- Part A: Link or delete orphan payments
-- Part B: Create payments for enrollments that have none
-- ============================================================

DO $$ DECLARE v RECORD; eid UUID; p NUMERIC; sch BOOLEAN; st TEXT; lnk INTEGER := 0; del INTEGER := 0; cre INTEGER := 0; BEGIN

  -- For each NULL-enrollment_id payment, find an enrollment WITHOUT payment
  FOR v IN SELECT p.id, p.profile_id, p.created_at FROM payments p WHERE p.enrollment_id IS NULL ORDER BY p.profile_id, p.created_at LOOP

    -- Prefer enrollments with no existing payment, closest in time to the payment
    SELECT e.id INTO eid FROM enrollments e
    WHERE e.profile_id = v.profile_id
      AND NOT EXISTS (SELECT 1 FROM payments p2 WHERE p2.enrollment_id = e.id)
    ORDER BY ABS(EXTRACT(EPOCH FROM (e.created_at - v.created_at)))
    LIMIT 1;

    IF eid IS NOT NULL THEN
      SELECT COALESCE(c.price, 1.54) INTO p FROM courses c, enrollments e WHERE e.id = eid AND c.id = e.course_id;
      SELECT COALESCE(pr.scholarship, false) INTO sch FROM profiles pr WHERE pr.id = v.profile_id;
      IF p = 0 OR p IS NULL THEN st := 'paid';
      ELSIF sch THEN st := 'scholarship';
      ELSE st := 'pending';
      END IF;
      UPDATE payments SET enrollment_id = eid, type = (SELECT type FROM enrollments WHERE id = eid), amount = p, status = st WHERE id = v.id;
      lnk := lnk + 1;
    ELSE
      DELETE FROM payments WHERE id = v.id;
      del := del + 1;
    END IF;
  END LOOP;

  -- Create payments for enrollments that still have none
  FOR v IN SELECT e.id, e.profile_id, e.course_id, e.type FROM enrollments e
    WHERE NOT EXISTS (SELECT 1 FROM payments p WHERE p.enrollment_id = e.id)
  LOOP
    SELECT COALESCE(c.price, 1.54) INTO p FROM courses c WHERE c.id = v.course_id;
    SELECT COALESCE(pr.scholarship, false) INTO sch FROM profiles pr WHERE pr.id = v.profile_id;
    IF p = 0 OR p IS NULL THEN st := 'paid';
    ELSIF sch THEN st := 'scholarship';
    ELSE st := 'pending';
    END IF;
    INSERT INTO payments (profile_id, enrollment_id, type, amount, status)
    VALUES (v.profile_id, v.id, v.type, p, st);
    cre := cre + 1;
  END LOOP;

  RAISE NOTICE 'Result: % linked, % deleted (orphan), % created', lnk, del, cre;
END $$;
