
import React, { createContext, useState, useContext, useEffect } from "react";

interface ApiContextType {
  geminiApiKey: string | null;
  gitHubApiKey: string | null;
  hasApiKeys: () => boolean;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export const ApiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [geminiApiKey, setGeminiApiKey] = useState<string | null>(null);
  const [gitHubApiKey, setGitHubApiKey] = useState<string | null>(null);

  // Load API keys from environment variables on mount
  useEffect(() => {
    try {
      // Access environment variables via import.meta.env (Vite's approach)
      const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || null;
      const githubKey = import.meta.env.VITE_GITHUB_API_KEY || null;
      
      setGeminiApiKey(geminiKey);
      setGitHubApiKey(githubKey);
      
      console.log("API keys loaded from environment variables");
    } catch (error) {
      console.error("Error loading API keys from environment variables:", error);
    }
  }, []);

  const hasApiKeys = () => {
    return !!geminiApiKey || !!gitHubApiKey;
  };

  return (
    <ApiContext.Provider 
      value={{ 
        geminiApiKey, 
        gitHubApiKey,
        hasApiKeys
      }}
    >
      {children}
    </ApiContext.Provider>
  );
};

export const useApi = () => {
  const context = useContext(ApiContext);
  if (context === undefined) {
    throw new Error("useApi must be used within an ApiProvider");
  }
  return context;
};
