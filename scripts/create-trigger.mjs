const PROJECT_REF = 'qbyvzxouutytpmldfuyo';
const PAT = 'sbp_fb9b9a361dae61429a02bfb39c519f8776152685';

const sql = `
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, status)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Sin nombre'), 'pending_payment');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
`;

async function main() {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  const text = await res.text();
  if (res.ok) {
    console.log('Trigger created successfully!');
  } else {
    console.log('Error:', text.substring(0, 500));
  }
}

main();
