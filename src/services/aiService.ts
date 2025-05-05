
import { RepoData, parseGitHubUrl } from './githubService';

type AIAgent = "alphaCodeExpert" | "mindMapSpecialist" | "integrationExpert";

interface Message {
  agent: AIAgent;
  content: string;
}

/**
 * Generate initial conversation messages based on repository URL
 */
export const generateInitialMessages = (repoUrl: string): Message[] => {
  const repoInfo = parseGitHubUrl(repoUrl);
  const repoName = repoInfo ? `${repoInfo.owner}/${repoInfo.repo}` : repoUrl;
  
  return [
    {
      agent: "integrationExpert",
      content: `Starting analysis of ${repoName}. Connecting to GitHub API...`
    },
    {
      agent: "mindMapSpecialist",
      content: "Preparing visualization framework for repository structure mapping."
    },
    {
      agent: "alphaCodeExpert",
      content: "Standing by to analyze code patterns and architecture."
    }
  ];
};

/**
 * Generate AI conversation based on repository data
 */
export const generateAIConversation = async (
  repoUrl: string,
  repoData: RepoData,
  apiKey: string | null
): Promise<Message[]> => {
  const repoInfo = parseGitHubUrl(repoUrl);
  const repoName = repoInfo ? `${repoInfo.owner}/${repoInfo.repo}` : repoUrl;
  
  // If no API key provided, return static but customized messages
  if (!apiKey) {
    return generateStaticConversation(repoData);
  }

  try {
    // In a real implementation, this would call the Gemini API
    // For now, we'll use an enhanced static conversation with real repo data
    return generateEnhancedStaticConversation(repoData);
  } catch (error) {
    console.error("Error generating AI conversation:", error);
    return [
      {
        agent: "integrationExpert",
        content: `Analysis error: ${error instanceof Error ? error.message : "Unknown error occurred"}`
      }
    ];
  }
};

/**
 * Generate a static conversation with real repository data
 */
const generateStaticConversation = (repoData: RepoData): Message[] => {
  const { repo, branches, files, contributors, mainBranch } = repoData;
  
  // Count total files
  let totalFiles = 0;
  Object.values(files).forEach(fileList => {
    totalFiles += fileList.filter(file => file.type === "file").length;
  });
  
  // Count directories
  let totalDirs = 0;
  Object.values(files).forEach(fileList => {
    totalDirs += fileList.filter(file => file.type === "dir").length;
  });
  
  // Analyze file types
  const fileExtensions: Record<string, number> = {};
  Object.values(files).forEach(fileList => {
    fileList.forEach(file => {
      if (file.type === "file") {
        const extension = file.path.split('.').pop() || "unknown";
        fileExtensions[extension] = (fileExtensions[extension] || 0) + 1;
      }
    });
  });
  
  // Get primary language
  const primaryLanguage = repo.language || "Not specified";
  
  // Generate top contributors
  const topContributors = contributors
    .slice(0, 3)
    .map(c => `${c.login} (${c.contributions} contributions)`)
    .join(", ");
  
  return [
    {
      agent: "integrationExpert",
      content: `Analysis of ${repo.full_name} initiated. Fetching repository structure with ${branches.length} branches and ${totalFiles} files across ${totalDirs} directories.`
    },
    {
      agent: "alphaCodeExpert",
      content: `Repository ${repo.name} uses ${primaryLanguage} as its primary language. It has ${repo.stargazers_count} stars and ${repo.forks_count} forks. Created on ${new Date(repo.created_at).toLocaleDateString()}.`
    },
    {
      agent: "mindMapSpecialist",
      content: `I'm mapping the structure of ${totalFiles} files organized in ${totalDirs} directories. Preparing visualization with collapsible nodes.`
    },
    {
      agent: "integrationExpert",
      content: `The default branch is "${mainBranch}". I've detected ${Object.keys(fileExtensions).length} different file types in the codebase.`
    },
    {
      agent: "alphaCodeExpert",
      content: `I'm analyzing code patterns and architecture. The repository has ${contributors.length} contributors, with top contributors being ${topContributors}.`
    },
    {
      agent: "mindMapSpecialist",
      content: `Mind map construction in progress. Creating relationship nodes between key components and visualizing dependencies.`
    },
    {
      agent: "integrationExpert",
      content: `Repository analysis is nearing completion. I've mapped all ${branches.length} branches and prepared documentation structured for optimal exploration.`
    },
    {
      agent: "alphaCodeExpert",
      content: `Code analysis complete. This ${primaryLanguage} repository has ${repo.open_issues_count} open issues and was last updated on ${new Date(repo.updated_at).toLocaleDateString()}.`
    },
    {
      agent: "mindMapSpecialist",
      content: `Mind map visualization is ready! You can now explore the repository structure through an interactive view with expandable components and file relationships.`
    }
  ];
};

/**
 * Generate an enhanced conversation with additional insights from repository data
 */
const generateEnhancedStaticConversation = (repoData: RepoData): Message[] => {
  // Start with the basic conversation
  const baseConversation = generateStaticConversation(repoData);
  
  // Add more technical insights based on files
  const { files } = repoData;
  
  // Look for specific file types and add insights
  const hasPackageJson = Object.values(files).some(fileList => 
    fileList.some(file => file.path === "package.json")
  );
  
  const hasTsConfig = Object.values(files).some(fileList => 
    fileList.some(file => file.path.includes("tsconfig.json"))
  );
  
  const hasDockerfile = Object.values(files).some(fileList => 
    fileList.some(file => file.path.includes("Dockerfile"))
  );
  
  const hasGithubActions = Object.values(files).some(fileList => 
    fileList.some(file => file.path.includes(".github/workflows/"))
  );
  
  const enhancedMessages: Message[] = [...baseConversation];
  
  if (hasPackageJson) {
    enhancedMessages.splice(3, 0, {
      agent: "alphaCodeExpert",
      content: "I've detected a package.json file, indicating this is a Node.js project. Analyzing dependencies and scripts."
    });
  }
  
  if (hasTsConfig) {
    enhancedMessages.splice(5, 0, {
      agent: "alphaCodeExpert",
      content: "The project uses TypeScript for type safety. Examining type definitions and configurations."
    });
  }
  
  if (hasDockerfile) {
    enhancedMessages.splice(4, 0, {
      agent: "integrationExpert",
      content: "Found a Dockerfile in the repository. This project is containerized, which improves deployment consistency."
    });
  }
  
  if (hasGithubActions) {
    enhancedMessages.splice(6, 0, {
      agent: "integrationExpert",
      content: "GitHub Actions workflows detected. This repository has CI/CD pipelines for automated testing and deployment."
    });
  }
  
  return enhancedMessages;
};
