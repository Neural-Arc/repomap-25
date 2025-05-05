import { toast } from "sonner";

interface GitHubFile {
  path: string;
  type: "file" | "dir";
  url: string;
  sha: string;
}

interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
}

interface GitHubRepository {
  name: string;
  full_name: string;
  description: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  created_at: string;
  updated_at: string;
  language: string;
  default_branch: string;
}

interface GitHubContributor {
  login: string;
  contributions: number;
  avatar_url: string;
  html_url: string;
}

export interface RepoData {
  repo: GitHubRepository;
  branches: GitHubBranch[];
  files: Record<string, GitHubFile[]>;
  contributors: GitHubContributor[];
  mainBranch: string;
  fileStats?: {
    totalSize: number;
    byExtension: Record<string, { count: number, size: number }>;
  };
}

export interface RepoNode {
  id: string;
  label: string;
  type: "directory" | "file" | "function";
  children: RepoNode[];
  collapsed?: boolean;
  path?: string;
}

export interface RepoStats {
  stars: number;
  forks: number;
  issues: number;
  contributors: number;
  created: string;
  updated: string;
  language: string;
  branches: number;
  totalFiles: number;
  description: string;
  repo?: {
    name: string;
    full_name: string;
  };
  commits?: number;
}

// Type for progress tracking callback - now with optional phase parameter
type ProgressCallback = (completed: number, total: number, phase?: number) => void;

/**
 * Extract repository owner and name from GitHub URL
 */
export const parseGitHubUrl = (url: string): { owner: string; repo: string } | null => {
  // Handle URLs like https://github.com/username/repo or github.com/username/repo
  const gitHubRegex = /(?:https?:\/\/)?github\.com\/([^\/]+)\/([^\/]+)/;
  const match = url.match(gitHubRegex);

  if (!match) {
    return null;
  }

  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, ""), // Remove .git if present
  };
};

/**
 * Fetch repository information from GitHub API with enhanced progress tracking
 */
export const fetchRepositoryData = async (
  repoUrl: string,
  apiKey: string | null,
  progressCallback?: ProgressCallback
): Promise<RepoData | null> => {
  const repoInfo = parseGitHubUrl(repoUrl);
  if (!repoInfo) {
    toast.error("Invalid GitHub repository URL");
    return null;
  }

  const { owner, repo } = repoInfo;
  const headers: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
  };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  // Track API calls for progress reporting
  let apiCallsCompleted = 0;
  let estimatedTotalApiCalls = 3; // Start with base API calls (repo, branches, contributors)
  
  // Additional tracking information
  let repositorySize = 0; // Will be updated once we have repo data
  
  // Helper function to make API calls with progress tracking
  const fetchWithProgress = async <T>(url: string): Promise<T | null> => {
    try {
      const response = await fetch(url, { headers });
      
      // Update progress after each API call
      apiCallsCompleted++;
      if (progressCallback) {
        // Always pass phase 0 for repository structure fetching
        progressCallback(apiCallsCompleted, estimatedTotalApiCalls, 0);
      }
      
      if (!response.ok) {
        if (response.status === 404) {
          toast.error("Resource not found. Make sure the repository exists and is public.");
          return null;
        } else if (response.status === 403 && response.headers.get("X-RateLimit-Remaining") === "0") {
          toast.error("GitHub API rate limit exceeded. Try adding a GitHub API key in settings.");
          return null;
        } else {
          toast.error(`Error fetching data: ${response.statusText}`);
          return null;
        }
      }
      
      return await response.json() as T;
    } catch (error) {
      console.error("API call error:", error);
      return null;
    }
  };

  try {
    // Fetch basic repository information
    const repoData = await fetchWithProgress<GitHubRepository>(
      `https://api.github.com/repos/${owner}/${repo}`
    );
    
    if (!repoData) return null;
    const mainBranch = repoData.default_branch;

    // Update repository size based on repo data
    // In a real API, we might get size info here - simulating for now
    repositorySize = repoData.stargazers_count * 10; // Just a heuristic for demo purposes
    
    // Adjust estimated API calls based on repository size
    const sizeFactor = repositorySize > 1000 ? 2 : 
                      repositorySize > 500 ? 1.5 : 1;
    estimatedTotalApiCalls = Math.ceil(estimatedTotalApiCalls * sizeFactor);

    // Fetch branches
    const branches = await fetchWithProgress<GitHubBranch[]>(
      `https://api.github.com/repos/${owner}/${repo}/branches`
    ) || [];
    
    // Update estimated total API calls based on repository size
    estimatedTotalApiCalls += Math.min(branches.length, 10); // Limit to 10 branches for estimation
    if (progressCallback) {
      progressCallback(apiCallsCompleted, estimatedTotalApiCalls, 0);
    }

    // Fetch contributors
    const contributors = await fetchWithProgress<GitHubContributor[]>(
      `https://api.github.com/repos/${owner}/${repo}/contributors`
    ) || [];

    // Fetch file structure recursively for the main branch
    const filesMap: Record<string, GitHubFile[]> = {};
    
    // Get root directory content
    const rootContent = await fetchWithProgress<GitHubFile[]>(
      `https://api.github.com/repos/${owner}/${repo}/contents?ref=${mainBranch}`
    );
    
    if (!rootContent) return null;
    filesMap[""] = rootContent;
    
    // Estimate additional API calls based on directory count
    const dirCount = rootContent.filter(item => item.type === "dir").length;
    
    // More accurate estimation based on directory count and repo size
    const depthFactor = repositorySize > 1000 ? 4 : 
                       repositorySize > 500 ? 3 : 2;
    estimatedTotalApiCalls += Math.min(dirCount * depthFactor, 50); 
    
    if (progressCallback) {
      progressCallback(apiCallsCompleted, estimatedTotalApiCalls, 0);
    }
    
    // Fetch directories recursively (with a reasonable limit)
    const fetchDirectoryContent = async (path: string, depth = 0) => {
      if (depth > 3) return; // Limit depth to prevent excessive API calls
      
      const dirContent = filesMap[path]?.filter(item => item.type === "dir") || [];
      
      for (const dir of dirContent) {
        const dirPath = dir.path;
        const files = await fetchWithProgress<GitHubFile[]>(
          `https://api.github.com/repos/${owner}/${repo}/contents/${dirPath}?ref=${mainBranch}`
        );
        
        if (files) {
          filesMap[dirPath] = files;
          await fetchDirectoryContent(dirPath, depth + 1);
        }
      }
    };
    
    try {
      await fetchDirectoryContent("", 0);
    } catch (error) {
      console.error("Error while fetching directory contents:", error);
    }

    // Gather file statistics
    const fileStats = {
      totalSize: 0,
      byExtension: {} as Record<string, { count: number, size: number }>
    };

    // Process file statistics from the collected data
    Object.values(filesMap).forEach(fileList => {
      fileList.forEach(file => {
        if (file.type === "file") {
          const extension = file.path.split('.').pop() || "unknown";
          
          // Initialize extension stats if needed
          if (!fileStats.byExtension[extension]) {
            fileStats.byExtension[extension] = { count: 0, size: 0 };
          }
          
          // Update counts
          fileStats.byExtension[extension].count++;
          
          // We don't have file size in the basic content API
          // In a full implementation, we would fetch each file's details
        }
      });
    });

    // Final progress update - completed all API calls
    if (progressCallback) {
      progressCallback(estimatedTotalApiCalls, estimatedTotalApiCalls, 0);
    }

    return {
      repo: repoData,
      branches,
      files: filesMap,
      contributors,
      mainBranch,
      fileStats
    };
  } catch (error) {
    console.error("Error fetching repository data:", error);
    toast.error("Failed to fetch repository data");
    return null;
  }
};

/**
 * Convert GitHub API data to a mind map node structure
 */
export const convertRepoDataToNodes = (repoData: RepoData): RepoNode => {
  const { repo, files } = repoData;
  
  // Create root node
  const rootNode: RepoNode = {
    id: "root",
    label: repo.name,
    type: "directory",
    collapsed: false,
    children: [],
    path: ""
  };
  
  // Process root files
  const rootFiles = files[""] || [];
  
  // Sort files and directories (directories first)
  const sortedRootFiles = [...rootFiles].sort((a, b) => {
    if (a.type === b.type) {
      return a.path.localeCompare(b.path);
    }
    return a.type === "dir" ? -1 : 1;
  });
  
  // Process each file in the root directory
  sortedRootFiles.forEach(file => {
    const node: RepoNode = {
      id: file.path,
      label: file.path.split("/").pop() || file.path,
      type: file.type === "dir" ? "directory" : "file",
      collapsed: file.type === "dir",
      children: [],
      path: file.path
    };
    
    // If it's a directory, process its children
    if (file.type === "dir" && files[file.path]) {
      addChildrenToNode(node, files, file.path);
    }
    
    rootNode.children.push(node);
  });
  
  return rootNode;
};

/**
 * Recursively add children to a node
 */
const addChildrenToNode = (
  node: RepoNode,
  files: Record<string, GitHubFile[]>,
  path: string
): void => {
  const dirFiles = files[path] || [];
  
  // Sort files (directories first)
  const sortedFiles = [...dirFiles].sort((a, b) => {
    if (a.type === b.type) {
      return a.path.localeCompare(b.path);
    }
    return a.type === "dir" ? -1 : 1;
  });
  
  sortedFiles.forEach(file => {
    const childPath = file.path;
    const fileName = childPath.split("/").pop() || childPath;
    
    const childNode: RepoNode = {
      id: childPath,
      label: fileName,
      type: file.type === "dir" ? "directory" : "file",
      collapsed: file.type === "dir",
      children: [],
      path: childPath
    };
    
    // If it's a directory, process its children
    if (file.type === "dir" && files[childPath]) {
      addChildrenToNode(childNode, files, childPath);
    }
    
    node.children.push(childNode);
  });
};

/**
 * Extract repository statistics
 */
export const extractRepoStats = (repoData: RepoData): RepoStats => {
  const { repo, branches, contributors, files } = repoData;
  
  // Count total number of files
  let totalFiles = 0;
  Object.values(files).forEach(fileList => {
    totalFiles += fileList.filter(file => file.type === "file").length;
  });
  
  // Generate a mock commits count (since we don't have a real one in the API response)
  const mockCommits = contributors.reduce((sum, contributor) => sum + contributor.contributions, 0);
  
  return {
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    issues: repo.open_issues_count,
    contributors: contributors.length,
    created: new Date(repo.created_at).toLocaleDateString(),
    updated: new Date(repo.updated_at).toLocaleDateString(),
    language: repo.language || "Not specified",
    branches: branches.length,
    totalFiles,
    description: repo.description || "No description provided",
    repo: {
      name: repo.name,
      full_name: repo.full_name
    },
    commits: mockCommits
  };
};

/**
 * Generate a download URL for the repository
 */
export const getRepoDownloadUrl = (repoUrl: string, branch: string = "main"): string | null => {
  const repoInfo = parseGitHubUrl(repoUrl);
  if (!repoInfo) return null;
  
  const { owner, repo } = repoInfo;
  return `https://github.com/${owner}/${repo}/archive/refs/heads/${branch}.zip`;
};

/**
 * Calculate repository health score based on various metrics
 */
export const calculateRepoHealth = (repoData: RepoData): { score: number, details: Record<string, number> } => {
  const { repo, contributors, branches } = repoData;
  
  // Define weights for different factors
  const weights = {
    stars: 0.2,
    activity: 0.3,
    contributors: 0.2,
    issues: 0.15,
    branchCount: 0.15
  };
  
  // Calculate scores for individual factors (0-10 scale)
  const details: Record<string, number> = {
    // Stars score (logarithmic scale)
    stars: Math.min(10, Math.log10(repo.stargazers_count + 1) * 3),
    
    // Activity score based on last update
    activity: calculateActivityScore(repo.updated_at),
    
    // Contributors score (logarithmic scale)
    contributors: Math.min(10, Math.log10(contributors.length + 1) * 5),
    
    // Issues management score (inverse - fewer open issues is better)
    issues: 10 * Math.exp(-repo.open_issues_count / 100),
    
    // Branch count score (ideally not too many, not too few)
    branchCount: calculateBranchScore(branches.length)
  };
  
  // Calculate weighted average
  const score = Object.entries(details).reduce(
    (sum, [key, value]) => sum + value * weights[key as keyof typeof weights],
    0
  );
  
  return { score, details };
};

/**
 * Calculate activity score based on last update date
 */
const calculateActivityScore = (updatedAt: string): number => {
  const lastUpdate = new Date(updatedAt);
  const now = new Date();
  const daysSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
  
  // Score decreases as days since update increases
  if (daysSinceUpdate < 7) {
    return 10; // Updated within a week
  } else if (daysSinceUpdate < 30) {
    return 8; // Updated within a month
  } else if (daysSinceUpdate < 90) {
    return 6; // Updated within 3 months
  } else if (daysSinceUpdate < 180) {
    return 4; // Updated within 6 months
  } else if (daysSinceUpdate < 365) {
    return 2; // Updated within a year
  } else {
    return 1; // Updated more than a year ago
  }
};

/**
 * Calculate branch count score
 */
const calculateBranchScore = (branchCount: number): number => {
  if (branchCount === 0) {
    return 0; // No branches is bad
  } else if (branchCount <= 5) {
    return 10; // 1-5 branches is ideal
  } else if (branchCount <= 10) {
    return 8; // 6-10 branches is good
  } else if (branchCount <= 20) {
    return 6; // 11-20 branches is okay
  } else if (branchCount <= 50) {
    return 4; // 21-50 branches is getting messy
  } else {
    return 2; // More than 50 branches is very messy
  }
};
