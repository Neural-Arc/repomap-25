
import React, { useState } from "react";
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

  const isValidGithubUrl = (url: string): boolean => {
    const regex = /^https?:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/;
    return regex.test(url);
  };

  const handleSubmit = () => {
    if (!geminiApiKey) {
      setIsSettingsOpen(true);
      toast.error("Please configure your Gemini API key first");
      return;
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

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border p-4">
        <div className="container flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight">AlphaCode</h1>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsSettingsOpen(true)}
            className="rounded-full"
          >
            <Settings size={20} />
          </Button>
        </div>
      </header>

      <main className="flex-grow flex flex-col">
        {appState === "input" && (
          <div className="container py-16 flex flex-col items-center justify-center flex-grow">
            <div className="max-w-3xl w-full text-center space-y-8">
              <h2 className="text-4xl font-bold tracking-tight">
                Visualize GitHub Repositories
              </h2>
              <p className="text-xl text-muted-foreground">
                Paste a GitHub repository URL to generate an interactive mind map
              </p>

              <div className="flex flex-col space-y-4 w-full">
                <Input
                  className="h-16 text-lg bg-secondary border-border"
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
                  className="text-lg h-12"
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
              defaultValue="mindmap" 
              value={activeTab} 
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="mb-6">
                <TabsTrigger value="mindmap">Mind Map</TabsTrigger>
                <TabsTrigger value="documentation">Documentation</TabsTrigger>
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
                className="text-muted-foreground"
              >
                Analyze Another Repository
              </Button>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-border p-4">
        <div className="container text-center text-sm text-muted-foreground">
          AlphaCode - GitHub Repository Mind Mapper
        </div>
      </footer>

      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </div>
  );
};

export default Index;
