import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase';
import { PromptPipelineManager } from '@/components/prompts/PromptPipelineManager';

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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Prompt & Pipeline Management</h1>
          <p className="text-gray-600 mt-2">
            Create and manage AI prompts and multi-stage analysis pipelines
          </p>
        </div>
        
        <PromptPipelineManager 
          userRole={profile.role}
          userId={profile.id}
          userEmail={profile.email}
          displayName={profile.display_name}
        />
      </div>
    </div>
  );
} 