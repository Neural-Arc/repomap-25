
import React, { createContext, useState, useContext, useEffect } from "react";

interface ApiContextType {
  geminiApiKey: string | null;
  gitHubApiKey: string | null;
  setGeminiApiKey: (key: string) => void;
  setGitHubApiKey: (key: string) => void;
  clearGeminiApiKey: () => void;
  clearGitHubApiKey: () => void;
  hasApiKeys: () => boolean;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export const ApiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [geminiApiKey, setGeminiApiKeyState] = useState<string | null>(null);
  const [gitHubApiKey, setGitHubApiKeyState] = useState<string | null>(null);

  // Load API keys from localStorage on mount
  useEffect(() => {
    try {
      const storedGeminiKey = localStorage.getItem("alphacode_gemini_api_key");
      if (storedGeminiKey) {
        setGeminiApiKeyState(storedGeminiKey);
      }
      
      const storedGitHubKey = localStorage.getItem("alphacode_github_api_key");
      if (storedGitHubKey) {
        setGitHubApiKeyState(storedGitHubKey);
      }
      
      console.log("API keys loaded from localStorage");
    } catch (error) {
      console.error("Error loading API keys from localStorage:", error);
    }
  }, []);

  const setGeminiApiKey = (key: string) => {
    try {
      // Trim whitespace from key
      const trimmedKey = key.trim();
      localStorage.setItem("alphacode_gemini_api_key", trimmedKey);
      setGeminiApiKeyState(trimmedKey);
      console.log("Gemini API key saved");
    } catch (error) {
      console.error("Error saving Gemini API key:", error);
    }
  };

  const setGitHubApiKey = (key: string) => {
    try {
      // Trim whitespace from key
      const trimmedKey = key.trim();
      localStorage.setItem("alphacode_github_api_key", trimmedKey);
      setGitHubApiKeyState(trimmedKey);
      console.log("GitHub API key saved");
    } catch (error) {
      console.error("Error saving GitHub API key:", error);
    }
  };

  const clearGeminiApiKey = () => {
    try {
      localStorage.removeItem("alphacode_gemini_api_key");
      setGeminiApiKeyState(null);
      console.log("Gemini API key cleared");
    } catch (error) {
      console.error("Error clearing Gemini API key:", error);
    }
  };

  const clearGitHubApiKey = () => {
    try {
      localStorage.removeItem("alphacode_github_api_key");
      setGitHubApiKeyState(null);
      console.log("GitHub API key cleared");
    } catch (error) {
      console.error("Error clearing GitHub API key:", error);
    }
  };

  const hasApiKeys = () => {
    return !!geminiApiKey || !!gitHubApiKey;
  };

  return (
    <ApiContext.Provider 
      value={{ 
        geminiApiKey, 
        gitHubApiKey,
        setGeminiApiKey, 
        setGitHubApiKey,
        clearGeminiApiKey, 
        clearGitHubApiKey,
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
