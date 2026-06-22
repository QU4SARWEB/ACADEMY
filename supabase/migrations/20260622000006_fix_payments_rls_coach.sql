-- Allow coaches to insert payments for their students
CREATE POLICY "Coaches can insert payments" ON payments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'coach')
  );

-- Also allow coaches to view all payments
CREATE POLICY "Coaches can view all payments" ON payments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'coach')
  );
