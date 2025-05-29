import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase';
import { PromptPipelineManager } from '@/components/prompts';

export default async function PromptsPage() {
  const supabase = await createSupabaseServerClient();
  
  // Check authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect('/auth/login');
  }

  // Get user profile with role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, display_name, role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    redirect('/auth/login');
  }

  // Check if user has access (managers and admins can create, analysts can view)
  const hasAccess = ['admin', 'manager', 'analyst'].includes(profile.role);
  if (!hasAccess) {
    redirect('/unauthorized');
  }

  return (
    <PromptPipelineManager 
      userRole={profile.role}
      userId={profile.id}
      userEmail={profile.email}
      displayName={profile.display_name}
    />
  );
} 