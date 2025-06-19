
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage settings" ON public.settings;
DROP POLICY IF EXISTS "Admins can view all quotes" ON public.quotes;
DROP POLICY IF EXISTS "Admins can update all quotes" ON public.quotes;

-- Create a security definer function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Recreate admin policies using the security definer function
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can manage settings" ON public.settings
  FOR ALL USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can view all quotes" ON public.quotes
  FOR SELECT USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Admins can update all quotes" ON public.quotes
  FOR UPDATE USING (public.get_current_user_role() = 'admin');
