import { supabase } from './supabase';

export async function fetchUserProjects(userId: string) {
  const { data: memberProjects, error: memberProjectsError } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', userId);

  const memberProjectIds = memberProjects?.map((pm: any) => pm.project_id) || [];
  
  const { data, error } = await supabase
    .from('projects')
    .select('id, name')
    .in('id', memberProjectIds);

  const memberProjectsData = data ?? [];

  return memberProjectsData;
}

export async function fetchOwnedProjects(userId: string){
  const { data, error } = await supabase
    .from('projects')
    .select('id, name')
    .eq('owner_id', userId);

  if (error) {
    throw error;
  }

  return data ?? [];
}