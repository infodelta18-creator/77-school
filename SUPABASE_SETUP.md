# Supabase setup

## 1. Create a Supabase project
- Open Supabase and create a new project.
- Note the Project URL and the anon/publishable key from Project Settings > API.

## 2. Configure local environment
Create a local `.env` file in the project root using the values from `.env.example`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Do not add any service_role key to frontend code or `.env` files used by the browser.

## 3. Apply the SQL migration
In Supabase SQL Editor, run the migration from:
- `supabase/migrations/20260708000000_initial_backend_foundation.sql`

This creates the schema, constraints, triggers, and RLS policies for the initial backend foundation.

## 4. Create the first Auth user manually
- In Supabase Auth, create the first user manually with an email and temporary password.
- Confirm the user in Supabase Auth.

## 5. Assign the initial super_admin role
After the user exists, insert a matching row into `public.profiles`:

```sql
insert into public.profiles (id, full_name, role)
values (
  '<auth-user-id>',
  'Super Admin',
  'super_admin'
);
```

This gives the initial user the required `super_admin` role.

## 6. What remains for Phase 3B
Phase 3B will add real authentication UI, protected admin routes, and secure server-side account creation for `admin` and `editor` roles.
