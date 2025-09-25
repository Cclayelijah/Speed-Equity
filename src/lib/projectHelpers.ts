import { supabase } from './supabase';

export async function fetchUserProjects(userId: string) {
  // Fetch projects where the user is a member
  const { data: memberProjects, error: memberProjectsError } = await supabase
    .from('project_members')
    .select('project_id')
    .eq('user_id', userId);

  const memberProjectIds = memberProjects?.map((pm: any) => pm.project_id) || [];

  // Fetch projects where the user is the owner
  const { data: ownedProjects, error: ownedProjectsError } = await supabase
    .from('projects')
    .select('id, name')
    .eq('owner_id', userId);

  // Fetch projects where the user is a member (only if there are memberProjectIds)
  let memberProjectsData: any[] = [];
  if (memberProjectIds.length > 0) {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name')
      .in('id', memberProjectIds);
    memberProjectsData = data ?? [];
  }

  // Combine and deduplicate projects
  const allProjects = [
    ...(ownedProjects ?? []),
    ...memberProjectsData
  ];
  const uniqueProjects = Array.from(
    new Map(allProjects.map(p => [p.id, p])).values()
  );

  return uniqueProjects;
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