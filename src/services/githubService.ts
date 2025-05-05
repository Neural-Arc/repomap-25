
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
}

export interface RepoData {
  repo: GitHubRepository;
  branches: GitHubBranch[];
  files: Record<string, GitHubFile[]>;
  contributors: GitHubContributor[];
  mainBranch: string;
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
}

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
 * Fetch repository information from GitHub API
 */
export const fetchRepositoryData = async (
  repoUrl: string,
  apiKey: string | null
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

  try {
    // Fetch basic repository information
    const repoResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      { headers }
    );

    if (!repoResponse.ok) {
      if (repoResponse.status === 404) {
        toast.error("Repository not found. Make sure the repository exists and is public.");
      } else if (repoResponse.status === 403 && repoResponse.headers.get("X-RateLimit-Remaining") === "0") {
        toast.error("GitHub API rate limit exceeded. Try adding a GitHub API key in settings.");
      } else {
        toast.error(`Error fetching repository: ${repoResponse.statusText}`);
      }
      return null;
    }

    const repoData: GitHubRepository = await repoResponse.json();
    const mainBranch = repoData.default_branch;

    // Fetch branches
    const branchesResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/branches`,
      { headers }
    );
    const branches: GitHubBranch[] = branchesResponse.ok ? await branchesResponse.json() : [];

    // Fetch contributors
    const contributorsResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contributors`,
      { headers }
    );
    const contributors: GitHubContributor[] = contributorsResponse.ok ? await contributorsResponse.json() : [];

    // Fetch file structure recursively for the main branch
    const filesMap: Record<string, GitHubFile[]> = {};
    
    // Get root directory content
    const contentResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents?ref=${mainBranch}`,
      { headers }
    );
    
    if (!contentResponse.ok) {
      toast.error(`Error fetching repository content: ${contentResponse.statusText}`);
      return null;
    }
    
    const rootContent: GitHubFile[] = await contentResponse.json();
    filesMap[""] = rootContent;
    
    // Fetch directories recursively (with a reasonable limit)
    const fetchDirectoryContent = async (path: string, depth = 0) => {
      if (depth > 3) return; // Limit depth to prevent excessive API calls
      
      const dirContent = filesMap[path].filter(item => item.type === "dir");
      
      for (const dir of dirContent) {
        const dirPath = dir.path;
        const dirResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${dirPath}?ref=${mainBranch}`,
          { headers }
        );
        
        if (dirResponse.ok) {
          const files: GitHubFile[] = await dirResponse.json();
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

    return {
      repo: repoData,
      branches,
      files: filesMap,
      contributors,
      mainBranch
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
    description: repo.description || "No description provided"
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
