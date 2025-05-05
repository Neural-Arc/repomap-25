
import { RepoData, RepoStats, extractRepoStats } from "./githubService";

type AIAgent = "alphaCodeExpert" | "mindMapSpecialist" | "integrationExpert";

interface AIMessage {
  agent: AIAgent;
  content: string;
}

// Type for progress tracking callback
type ProgressCallback = (progress: number) => void;

/**
 * Generate AI conversation about the repository using Gemini API when available
 */
export const generateAIConversation = async (
  repoUrl: string, 
  repoData: RepoData, 
  apiKey: string | null,
  progressCallback?: ProgressCallback
): Promise<AIMessage[]> => {
  // Progress tracking
  const updateProgress = (progress: number) => {
    if (progressCallback) {
      progressCallback(progress);
    }
  };
  
  // Extract repository information
  const repoName = repoData.repo.name;
  const repoOwner = repoData.repo.full_name.split('/')[0];
  const repoStats = extractRepoStats(repoData);
  
  // If we have a Gemini API key, use it to generate the conversation
  if (apiKey) {
    try {
      updateProgress(40);
      
      // Prepare repository data for the Gemini API
      const repoSummary = {
        name: repoName,
        owner: repoOwner,
        description: repoData.repo.description,
        stats: repoStats,
        fileCount: repoStats.totalFiles,
        topLanguage: repoStats.language,
        branchCount: repoData.branches.length,
        directoryStructure: getDirectoryStructureSummary(repoData),
      };
      
      // Call Gemini API
      const response = await callGeminiAPI(apiKey, repoSummary);
      updateProgress(80);
      
      // Parse the response or use fallback if needed
      const messages = parseGeminiResponse(response, repoSummary);
      
      // Complete analysis
      updateProgress(100);
      return messages;
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      // Fall back to mock data in case of error
      return generateMockConversation(repoData);
    }
  } else {
    // No API key provided, generate mock conversation
    return generateMockConversation(repoData);
  }
};

/**
 * Call the Gemini API with repository data
 */
const callGeminiAPI = async (apiKey: string, repoSummary: any): Promise<any> => {
  const endpoint = "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent";
  
  try {
    const response = await fetch(`${endpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Analyze this GitHub repository and provide insights about its structure, code organization, and potential improvements. Format your response as a conversation between three AI agents:
            
            Repository Information:
            Name: ${repoSummary.name}
            Owner: ${repoSummary.owner}
            Description: ${repoSummary.description || "No description provided"}
            Files: ${repoSummary.fileCount}
            Primary Language: ${repoSummary.topLanguage}
            Branches: ${repoSummary.branchCount}
            
            Directory Structure:
            ${repoSummary.directoryStructure}
            
            Create a conversation between three AI experts discussing this repository:
            1. "integrationExpert" - The lead expert who introduces the analysis
            2. "alphaCodeExpert" - An expert who analyzes code structure and patterns
            3. "mindMapSpecialist" - An expert who focuses on visualization and organization
            
            Format the conversation as JSON like this:
            [
              {"agent": "integrationExpert", "content": "..."},
              {"agent": "alphaCodeExpert", "content": "..."},
              {"agent": "mindMapSpecialist", "content": "..."},
              {"agent": "integrationExpert", "content": "..."}
            ]
            
            Keep responses concise and actionable. The conversation should have 4-5 messages total.`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Gemini API returned ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
};

/**
 * Parse the Gemini API response into AIMessages
 */
const parseGeminiResponse = (response: any, repoSummary: any): AIMessage[] => {
  try {
    // Try to extract JSON from the response
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (text) {
      // Find JSON array in the response text
      const jsonMatch = text.match(/\[\s*\{.*\}\s*\]/s);
      
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const parsedMessages = JSON.parse(jsonStr);
        
        if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
          // Ensure every message has the required fields
          const validMessages = parsedMessages.filter(
            (msg: any) => msg.agent && msg.content
          );
          
          if (validMessages.length > 0) {
            return validMessages as AIMessage[];
          }
        }
      }
    }
    
    // If we couldn't parse proper messages, fall back to mock data
    console.warn("Could not parse valid messages from Gemini API response, using fallback");
    return generateMockConversation(repoSummary);
  } catch (error) {
    console.error("Error parsing Gemini API response:", error);
    return generateMockConversation(repoSummary);
  }
};

/**
 * Generate a simplified directory structure summary for the API prompt
 */
const getDirectoryStructureSummary = (repoData: RepoData): string => {
  const maxEntries = 15; // Limit the number of entries to avoid exceeding token limits
  let summary = '';
  let count = 0;
  
  // Process root directory first
  const rootFiles = repoData.files[""] || [];
  for (const file of rootFiles) {
    if (count >= maxEntries) break;
    summary += `/${file.path} (${file.type})\n`;
    count++;
  }
  
  // Process some subdirectories
  for (const dirPath in repoData.files) {
    if (dirPath === "") continue; // Skip root directory (already processed)
    
    summary += `\n${dirPath}/\n`;
    
    const files = repoData.files[dirPath];
    for (const file of files.slice(0, 5)) { // Limit to 5 files per directory
      if (count >= maxEntries) break;
      const relativePath = file.path.split(dirPath + '/')[1];
      if (relativePath) {
        summary += `  - ${relativePath} (${file.type})\n`;
        count++;
      }
    }
    
    if (count >= maxEntries) {
      summary += "... (truncated for brevity)";
      break;
    }
  }
  
  return summary;
};

/**
 * Generate mock conversation when API is not available
 */
const generateMockConversation = (repoData: RepoData | any): AIMessage[] => {
  // Extract repo name and other details from either RepoData or summary object
  const repoName = repoData.repo?.name || repoData.name || "repository";
  const repoOwner = repoData.repo?.full_name?.split('/')[0] || repoData.owner || "user";
  const fileCount = typeof repoData.stats?.totalFiles === 'number' ? repoData.stats.totalFiles : 
                    (Object.values(repoData.files || {}).reduce((count: number, files: any) => 
                      count + (Array.isArray(files) ? files.filter((f: any) => f.type === 'file').length : 0), 0));
  
  const branchCount = Array.isArray(repoData.branches) ? repoData.branches.length : 
                     (typeof repoData.branchCount === 'number' ? repoData.branchCount : 1);
  
  const language = repoData.repo?.language || repoData.topLanguage || "not specified";
  
  // Create a conversation
  return [
    {
      agent: "integrationExpert",
      content: `I've completed my analysis of the ${repoOwner}/${repoName} repository. Here's what I found.`
    },
    {
      agent: "alphaCodeExpert",
      content: `This repository has ${fileCount} files across multiple directories, with ${branchCount} ${branchCount === 1 ? 'branch' : 'branches'}. The primary language is ${language}.`
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
};
