import { RepoData, RepoStats, extractRepoStats, ProgressCallback } from "./githubService";

type AIAgent = "alphaCodeExpert" | "mindMapSpecialist" | "integrationExpert";

interface AIMessage {
  agent: AIAgent;
  content: string;
}

/**
 * Generate AI conversation about the repository using Gemini API when available
 */
export const generateAIConversation = async (
  repoUrl: string, 
  repoData: RepoData, 
  apiKey: string | null,
  progressCallback?: ProgressCallback
): Promise<AIMessage[]> => {
  // Progress tracking with enhanced parameters
  const updateProgress = (progress: number, phase: number = 1) => {
    if (progressCallback) {
      // Convert single progress value to the expected callback format (completed, total, phase)
      const total = 100;
      const completed = Math.floor(progress);
      progressCallback(completed, total, phase);
    }
  };
  
  // Extract repository information
  const repoName = repoData.repo.name;
  const repoOwner = repoData.repo.full_name.split('/')[0];
  const repoStats = extractRepoStats(repoData);
  
  try {
    console.log("Starting AI conversation generation");
    // Use environment variable API key if available, or fall back to provided key
    const geminiApiKey = apiKey || import.meta.env.VITE_GEMINI_API_KEY || null;
    
    // If we have a Gemini API key, use it to generate the conversation
    if (geminiApiKey) {
      updateProgress(20, 1); // Start progress at 20% for phase 1
      
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
      
      updateProgress(40, 1); // Update progress to 40%
      console.log("Calling Gemini API");
      
      // Call Gemini API with the environment variable or provided key
      const response = await callGeminiAPI(geminiApiKey, repoSummary);
      updateProgress(80, 1); // Update progress to 80%
      console.log("Gemini API response received");
      
      // Parse the response or use fallback if needed
      const messages = parseGeminiResponse(response, repoSummary);
      
      // Complete analysis
      updateProgress(100, 1); // Complete progress
      console.log("AI conversation generation complete");
      return messages;
    } else {
      // No API key provided, generate mock conversation
      updateProgress(30, 1); // Start at 30% for mock data
      console.log("No API key provided, using mock data");
      
      // Simulate API delay for more natural experience
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateProgress(60, 1); // Update to 60%
      
      // Get mock data
      const mockMessages = generateEnhancedMockConversation(repoData);
      
      // Simulate more processing
      await new Promise(resolve => setTimeout(resolve, 800));
      updateProgress(100, 1); // Complete progress
      console.log("Mock AI conversation generation complete");
      return mockMessages;
    }
  } catch (error) {
    console.error("Error generating AI conversation:", error);
    // Fall back to mock data in case of error
    updateProgress(50, 1); // Show some progress 
    
    // Small delay before returning mock data to prevent jarring UI transition
    await new Promise(resolve => setTimeout(resolve, 800));
    updateProgress(100, 1); // Complete progress
    console.log("Error in AI generation, falling back to mock data");
    
    return generateEnhancedMockConversation(repoData);
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
            text: `Analyze this GitHub repository and provide detailed insights about its structure, code organization, and potential improvements. Format your response as a conversation between three AI agents:
            
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
            
            Make the conversation informative, detailed, and professional. Provide specific insights about the repository structure, potential code quality issues, and recommendations for improvements. The conversation should have 4-6 messages total.`
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
          // Ensure every message has the required fields and correct agent type
          const validMessages = parsedMessages.filter(
            (msg: any) => msg.agent && msg.content
          ).map((msg: any) => ({
            agent: msg.agent as AIAgent, // Ensure type compatibility
            content: msg.content
          }));
          
          if (validMessages.length > 0) {
            return validMessages;
          }
        }
      }
    }
    
    // If we couldn't parse proper messages, fall back to mock data
    console.warn("Could not parse valid messages from Gemini API response, using fallback");
    return generateEnhancedMockConversation(repoSummary);
  } catch (error) {
    console.error("Error parsing Gemini API response:", error);
    return generateEnhancedMockConversation(repoSummary);
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
 * Generate enhanced mock conversation with more detailed analysis
 */
const generateEnhancedMockConversation = (repoData: RepoData | any): AIMessage[] => {
  // Extract repo name and other details from either RepoData or summary object
  const repoName = repoData.repo?.name || repoData.name || "repository";
  const repoOwner = repoData.repo?.full_name?.split('/')[0] || repoData.owner || "user";
  const fileCount = typeof repoData.stats?.totalFiles === 'number' ? repoData.stats.totalFiles : 
                    (Object.values(repoData.files || {}).reduce((count: number, files: any) => 
                      count + (Array.isArray(files) ? files.filter((f: any) => f.type === 'file').length : 0), 0));
  
  const branchCount = Array.isArray(repoData.branches) ? repoData.branches.length : 
                     (typeof repoData.branchCount === 'number' ? repoData.branchCount : 1);
  
  const language = repoData.repo?.language || repoData.topLanguage || "not specified";
  const description = repoData.repo?.description || "No description available";
  
  // Count directories
  const dirCount = Object.keys(repoData.files || {}).length;
  
  // Check for common files
  const hasReadme = Object.values(repoData.files || {}).some((files: any) => 
    Array.isArray(files) && files.some((f: any) => f.path.toLowerCase().includes('readme'))
  );
  
  const hasTests = Object.values(repoData.files || {}).some((files: any) => 
    Array.isArray(files) && files.some((f: any) => f.path.toLowerCase().includes('test') || f.path.toLowerCase().includes('spec'))
  );
  
  // Return a more structured conversation with proper agent types
  return [
    {
      agent: "integrationExpert",
      content: `I've completed my analysis of the ${repoOwner}/${repoName} repository. This ${language} project contains ${fileCount} files across ${dirCount} directories, with ${branchCount} ${branchCount === 1 ? 'branch' : 'branches'}. The repository ${description !== "No description available" ? `is described as: "${description}"` : "doesn't have a description"}.`
    },
    {
      agent: "alphaCodeExpert",
      content: `Looking at the code structure, I notice ${hasReadme ? "a README file which provides documentation" : "no README file, which would help with documentation"}. ${hasTests ? "I found test files, which is good for code quality." : "I didn't find any test files, which might indicate limited testing practices."} The primary language is ${language}, and the codebase appears to be ${fileCount > 50 ? "moderately complex" : "relatively simple"} based on file count. ${fileCount > 100 ? "Given the large number of files, I'd recommend reviewing the code organization for potential refactoring opportunities." : ""}`
    },
    {
      agent: "mindMapSpecialist",
      content: `I've created a visual mind map of the repository structure that you can explore. The visualization shows the file hierarchy, directory organization, and key components. ${dirCount > 5 ? `I've noticed that the repository has ${dirCount} directories, which provides good separation of concerns.` : "The directory structure is relatively flat, which might make navigation easier but could potentially limit organization as the project grows."} You can click on any node in the mind map to see more details about each file or directory.`
    },
    {
      agent: "alphaCodeExpert",
      content: `Based on the file extensions, I can see that this is ${language === "JavaScript" || language === "TypeScript" ? "a web application project" : language === "Python" ? "a Python-based project, likely for data science or backend services" : `a project primarily using ${language}`}. ${hasTests ? "The presence of tests indicates a focus on code quality and reliability." : "Adding tests would improve the code reliability."} I recommend exploring the documentation tab for more detailed information on the repository structure and component relationships.`
    },
    {
      agent: "integrationExpert",
      content: `To summarize our findings: this is a ${fileCount > 50 ? "medium-sized" : "small"} ${language} repository with ${branchCount} ${branchCount === 1 ? 'branch' : 'branches'} and ${fileCount} files organized across ${dirCount} directories. ${hasReadme ? "It has documentation in the form of a README file." : "It would benefit from better documentation."} ${hasTests ? "It includes tests, which is a good practice." : "It lacks tests, which would improve code quality."} You can now browse the detailed mind map or view the documentation tab for more insights about the repository structure.`
    }
  ];
};

export default generateAIConversation;
