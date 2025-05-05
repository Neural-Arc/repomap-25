
import { RepoData } from "./githubService";

type AIAgent = "alphaCodeExpert" | "mindMapSpecialist" | "integrationExpert";

interface AIMessage {
  agent: AIAgent;
  content: string;
}

// Type for progress tracking callback
type ProgressCallback = (progress: number) => void;

/**
 * Generate AI conversation about the repository
 */
export const generateAIConversation = async (
  repoUrl: string, 
  repoData: RepoData, 
  apiKey: string | null,
  progressCallback?: ProgressCallback
): Promise<AIMessage[]> => {
  // In a real implementation, this would use the Gemini API or similar to generate the conversation
  // For now, we'll simulate a conversation with mock data
  
  // Progress simulation
  const updateProgress = (progress: number) => {
    if (progressCallback) {
      progressCallback(progress);
    }
  };
  
  // Extract repository name
  const repoName = repoData.repo.name;
  const repoOwner = repoData.repo.full_name.split('/')[0];
  const branchCount = repoData.branches.length;
  const fileCount = Object.values(repoData.files).reduce((count, files) => 
    count + files.filter(f => f.type === 'file').length, 0);
  const dirCount = Object.values(repoData.files).reduce((count, files) => 
    count + files.filter(f => f.type === 'dir').length, 0);
  
  // Simulate time delay for AI analysis
  await new Promise(resolve => setTimeout(resolve, 1500));
  updateProgress(20);
  
  // First part of analysis
  await new Promise(resolve => setTimeout(resolve, 1000));
  updateProgress(40);
  
  // Middle part of analysis
  await new Promise(resolve => setTimeout(resolve, 1000));
  updateProgress(60);
  
  // Final part of analysis
  await new Promise(resolve => setTimeout(resolve, 1000));
  updateProgress(80);
  
  // Complete analysis
  await new Promise(resolve => setTimeout(resolve, 500));
  updateProgress(100);

  // Create a conversation
  const conversation: AIMessage[] = [
    {
      agent: "integrationExpert",
      content: `I've completed my analysis of the ${repoOwner}/${repoName} repository. Here's what I found.`
    },
    {
      agent: "alphaCodeExpert",
      content: `This repository has ${fileCount} files across ${dirCount} directories, with ${branchCount} branches. The primary language is ${repoData.repo.language || "not specified"}.`
    },
    {
      agent: "mindMapSpecialist",
      content: `I've created a visual mind map of the repository structure. You can explore the file hierarchy, understand code organization, and identify key components.`
    },
    {
      agent: "integrationExpert",
      content: `You can now view the mind map or browse the documentation tab for more details about this repository's structure.`
    }
  ];

  return conversation;
};
