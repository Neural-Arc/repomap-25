
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useApi } from "@/contexts/ApiContext";
import { Button } from "@/components/ui/button";
import AiConversation from "@/components/AiConversation";
import RepositoryVisualizer from "@/components/RepositoryVisualizer";
import RepoDocumentation from "@/components/RepoDocumentation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

type AppState = "input" | "analyzing" | "result";

const Index = () => {
  const { gitHubApiKey, hasApiKeys } = useApi();
  const [repoUrl, setRepoUrl] = useState("");
  const [appState, setAppState] = useState<AppState>("input");
  const [analyzedRepo, setAnalyzedRepo] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("visualization");

  // Check for missing API keys when component mounts
  useEffect(() => {
    if (!hasApiKeys()) {
      toast.error("API keys not found in environment variables. Please add them to your .env file.");
    }
  }, [hasApiKeys]);

  const isValidGithubUrl = (url: string): boolean => {
    const regex = /^https?:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/;
    return regex.test(url);
  };

  const handleSubmit = () => {
    if (!isValidGithubUrl(repoUrl)) {
      toast.error("Please enter a valid GitHub repository URL");
      return;
    }

    if (!gitHubApiKey) {
      toast.warning("GitHub API key not found in environment variables. Repository analysis may be limited due to API rate limits.");
    }

    console.log("Starting analysis for repository:", repoUrl);
    setAnalyzedRepo(repoUrl);
    setAppState("analyzing");
  };

  const handleAnalysisComplete = () => {
    console.log("Analysis complete, moving to results view");
    setAppState("result");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background/80 to-background via-background/40">
      <header className="border-b border-border/40 p-4 bg-gradient-to-r from-background to-muted/20 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-transparent bg-clip-text">
            AlphaCode Explorer
          </h1>
        </div>
      </header>

      <main className="flex-grow flex flex-col">
        {appState === "input" && (
          <div className="container py-16 flex flex-col items-center justify-center flex-grow">
            <div className="max-w-3xl w-full text-center space-y-8">
              <h2 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-500 to-pink-400 text-transparent bg-clip-text animate-fade-in">
                Explore GitHub Repositories
              </h2>
              <p className="text-xl text-muted-foreground animate-fade-in" style={{animationDelay: "0.2s"}}>
                Enter a GitHub repository URL to visualize its structure and explore its insights
              </p>

              <div className="flex flex-col space-y-4 w-full animate-fade-in" style={{animationDelay: "0.4s"}}>
                <div className="relative">
                  <Input
                    className="h-16 text-lg bg-secondary/50 backdrop-blur-sm border-border/40 transition-all focus-visible:ring-2 focus-visible:ring-purple-500/50 focus-visible:ring-offset-0 pl-4 pr-12"
                    placeholder="https://github.com/username/repository"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSubmit();
                    }}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="24" 
                      height="24" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      className="lucide lucide-github"
                    >
                      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                      <path d="M9 18c-4.51 2-5-2-7-2" />
                    </svg>
                  </div>
                </div>

                <Button
                  onClick={handleSubmit}
                  size="lg"
                  className="text-lg h-12 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 backdrop-blur-sm border border-indigo-500/20 transition-all shadow-md hover:shadow-lg hover:shadow-indigo-500/20"
                  disabled={!repoUrl}
                >
                  Analyze Repository
                </Button>
              </div>
            </div>
          </div>
        )}

        {appState === "analyzing" && analyzedRepo && (
          <div className="container flex-grow overflow-y-auto py-8">
            <AiConversation repoUrl={analyzedRepo} onComplete={handleAnalysisComplete} />
          </div>
        )}

        {appState === "result" && analyzedRepo && (
          <div className="container flex-grow flex flex-col py-8">
            <Tabs 
              defaultValue="visualization" 
              value={activeTab} 
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="mb-6 bg-muted/30 backdrop-blur-sm border border-border/30 p-1">
                <TabsTrigger value="visualization" className="data-[state=active]:bg-background/60 data-[state=active]:backdrop-blur-md">
                  Repository Visualization
                </TabsTrigger>
                <TabsTrigger value="documentation" className="data-[state=active]:bg-background/60 data-[state=active]:backdrop-blur-md">
                  Documentation
                </TabsTrigger>
              </TabsList>
              <TabsContent value="visualization" className="mt-0 flex-grow">
                <RepositoryVisualizer repoUrl={analyzedRepo} />
              </TabsContent>
              <TabsContent value="documentation" className="mt-0 flex-grow overflow-y-auto">
                <RepoDocumentation repoUrl={analyzedRepo} />
              </TabsContent>
            </Tabs>

            <div className="mt-8 text-center">
              <Button 
                variant="outline" 
                onClick={() => setAppState("input")}
                className="text-muted-foreground hover:bg-muted/50 transition-colors backdrop-blur-sm border-border/40"
              >
                Analyze Another Repository
              </Button>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-border/40 p-4 bg-gradient-to-r from-background to-muted/20 backdrop-blur-sm">
        <div className="container text-center text-sm text-muted-foreground">
          AlphaCode Explorer — Visualize and understand GitHub repositories with AI
        </div>
      </footer>
    </div>
  );
};

export default Index;
