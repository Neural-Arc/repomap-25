
import React, { createContext, useState, useContext, useEffect } from "react";

interface ApiContextType {
  geminiApiKey: string | null;
  gitHubApiKey: string | null;
  setGeminiApiKey: (key: string) => void;
  setGitHubApiKey: (key: string) => void;
  clearGeminiApiKey: () => void;
  clearGitHubApiKey: () => void;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export const ApiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [geminiApiKey, setGeminiApiKeyState] = useState<string | null>(null);
  const [gitHubApiKey, setGitHubApiKeyState] = useState<string | null>(null);

  // Load API keys from localStorage on mount
  useEffect(() => {
    const storedGeminiKey = localStorage.getItem("alphacode_gemini_api_key");
    if (storedGeminiKey) {
      setGeminiApiKeyState(storedGeminiKey);
    }
    
    const storedGitHubKey = localStorage.getItem("alphacode_github_api_key");
    if (storedGitHubKey) {
      setGitHubApiKeyState(storedGitHubKey);
    }
  }, []);

  const setGeminiApiKey = (key: string) => {
    // Trim whitespace from key
    const trimmedKey = key.trim();
    localStorage.setItem("alphacode_gemini_api_key", trimmedKey);
    setGeminiApiKeyState(trimmedKey);
  };

  const setGitHubApiKey = (key: string) => {
    // Trim whitespace from key
    const trimmedKey = key.trim();
    localStorage.setItem("alphacode_github_api_key", trimmedKey);
    setGitHubApiKeyState(trimmedKey);
  };

  const clearGeminiApiKey = () => {
    localStorage.removeItem("alphacode_gemini_api_key");
    setGeminiApiKeyState(null);
  };

  const clearGitHubApiKey = () => {
    localStorage.removeItem("alphacode_github_api_key");
    setGitHubApiKeyState(null);
  };

  return (
    <ApiContext.Provider 
      value={{ 
        geminiApiKey, 
        gitHubApiKey,
        setGeminiApiKey, 
        setGitHubApiKey,
        clearGeminiApiKey, 
        clearGitHubApiKey 
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
