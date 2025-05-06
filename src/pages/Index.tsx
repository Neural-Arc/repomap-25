
import React, { useState, useEffect } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApi } from "@/contexts/ApiContext";
import SettingsDialog from "@/components/SettingsDialog";
import AiConversation from "@/components/AiConversation";
import MindMap from "@/components/MindMap";
import RepoDocumentation from "@/components/RepoDocumentation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

type AppState = "input" | "analyzing" | "result";

const Index = () => {
  const { geminiApiKey, gitHubApiKey } = useApi();
  const [repoUrl, setRepoUrl] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [appState, setAppState] = useState<AppState>("input");
  const [analyzedRepo, setAnalyzedRepo] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("mindmap");

  // Check for missing API keys when component mounts
  useEffect(() => {
    if (!geminiApiKey && !gitHubApiKey) {
      setIsSettingsOpen(true);
      toast.info("Please configure your API keys to get started.");
    }
  }, [geminiApiKey, gitHubApiKey]);

  const isValidGithubUrl = (url: string): boolean => {
    const regex = /^https?:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/;
    return regex.test(url);
  };

  const handleSubmit = () => {
    if (!gitHubApiKey) {
      toast.info("No GitHub API key provided. Repository analysis may be limited due to API rate limits.");
    }

    if (!isValidGithubUrl(repoUrl)) {
      toast.error("Please enter a valid GitHub repository URL");
      return;
    }

    setAnalyzedRepo(repoUrl);
    setAppState("analyzing");
  };

  const handleAnalysisComplete = () => {
    setAppState("result");
  };

  const handleApiKeyChange = () => {
    // If we're already showing results, no need to prompt the user
    if (appState === "result" && analyzedRepo) {
      toast.info("API key updated. Refreshing repository data.");
      // Force a small delay before re-analysis to ensure the key is saved
      setTimeout(() => {
        setAppState("analyzing");
        setTimeout(() => {
          setAppState("result");
        }, 100);
      }, 100);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-background/95">
      <header className="border-b border-border/40 p-4 bg-gradient-to-r from-background to-muted/20 backdrop-blur-sm">
        <div className="container flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-500 text-transparent bg-clip-text">AlphaCode</h1>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsSettingsOpen(true)}
            className="rounded-full hover:bg-muted transition-colors"
          >
            <Settings size={20} />
          </Button>
        </div>
      </header>

      <main className="flex-grow flex flex-col">
        {appState === "input" && (
          <div className="container py-16 flex flex-col items-center justify-center flex-grow">
            <div className="max-w-3xl w-full text-center space-y-8">
              <h2 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-500 text-transparent bg-clip-text animate-fade-in">
                Visualize GitHub Repositories
              </h2>
              <p className="text-xl text-muted-foreground animate-fade-in" style={{animationDelay: "0.2s"}}>
                Paste a GitHub repository URL to generate an interactive mind map
              </p>

              <div className="flex flex-col space-y-4 w-full animate-fade-in" style={{animationDelay: "0.4s"}}>
                <Input
                  className="h-16 text-lg bg-secondary/50 backdrop-blur-sm border-border/40 transition-all focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-0"
                  placeholder="https://github.com/username/repository"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSubmit();
                  }}
                />
                <Button
                  onClick={handleSubmit}
                  size="lg"
                  className="text-lg h-12 bg-gradient-to-r from-blue-600/90 to-blue-700/90 hover:from-blue-600 hover:to-blue-800 backdrop-blur-sm border border-blue-500/20 transition-all"
                  disabled={!repoUrl}
                >
                  Analyze Repository
                </Button>
              </div>
              
              {!gitHubApiKey && (
                <p className="text-amber-500 text-sm animate-fade-in" style={{animationDelay: "0.6s"}}>
                  Note: Adding a GitHub API key in settings is recommended to avoid rate limits.
                </p>
              )}
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
              defaultValue="mindmap" 
              value={activeTab} 
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="mb-6 bg-muted/30 backdrop-blur-sm border border-border/30 p-1">
                <TabsTrigger value="mindmap" className="data-[state=active]:bg-background/60 data-[state=active]:backdrop-blur-md">Mind Map</TabsTrigger>
                <TabsTrigger value="documentation" className="data-[state=active]:bg-background/60 data-[state=active]:backdrop-blur-md">Documentation</TabsTrigger>
              </TabsList>
              <TabsContent value="mindmap" className="mt-0 flex-grow">
                <MindMap repoUrl={analyzedRepo} />
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
          AlphaCode - GitHub Repository Mind Mapper
        </div>
      </footer>

      <SettingsDialog 
        open={isSettingsOpen} 
        onOpenChange={setIsSettingsOpen} 
        onApiKeyChange={handleApiKeyChange} 
      />
    </div>
  );
};

export default Index;
