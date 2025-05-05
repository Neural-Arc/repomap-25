
import React, { useState, useEffect } from "react";
import { Download, FileText, Code, TestTube, BarChart, Folder, Book } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useApi } from "@/contexts/ApiContext";
import { fetchRepositoryData, extractRepoStats, getRepoDownloadUrl, RepoStats } from "@/services/githubService";

interface RepoDocumentationProps {
  repoUrl: string;
}

const RepoDocumentation: React.FC<RepoDocumentationProps> = ({ repoUrl }) => {
  const { gitHubApiKey } = useApi();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<RepoStats | null>(null);
  const [readmeContent, setReadmeContent] = useState<string | null>(null);
  const [mainBranch, setMainBranch] = useState("main");

  useEffect(() => {
    const fetchRepoData = async () => {
      setLoading(true);
      setError(null);

      try {
        const repoData = await fetchRepositoryData(repoUrl, gitHubApiKey);
        
        if (repoData) {
          const stats = extractRepoStats(repoData);
          setStats(stats);
          setMainBranch(repoData.mainBranch);
          
          // Try to find README content
          const rootFiles = repoData.files[""] || [];
          const readmeFile = rootFiles.find(file => 
            file.path.toLowerCase().includes('readme') && file.type === "file"
          );
          
          if (readmeFile) {
            try {
              const readmeResponse = await fetch(readmeFile.url);
              if (readmeResponse.ok) {
                const data = await readmeResponse.json();
                // GitHub returns content as base64
                if (data.content && data.encoding === "base64") {
                  const decodedContent = atob(data.content);
                  setReadmeContent(decodedContent);
                }
              }
            } catch (err) {
              console.error("Error fetching README:", err);
            }
          }
        } else {
          setError("Failed to fetch repository data");
        }
      } catch (err) {
        console.error("Error in RepoDocumentation:", err);
        setError("An error occurred while loading repository information");
      } finally {
        setLoading(false);
      }
    };

    fetchRepoData();
  }, [repoUrl, gitHubApiKey]);

  const handleDownload = () => {
    const downloadUrl = getRepoDownloadUrl(repoUrl, mainBranch);
    
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
      toast.success("Download started!");
    } else {
      toast.error("Could not generate download link");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading repository documentation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center text-center">
          <p className="text-destructive text-lg mb-4">{error}</p>
          <p className="text-muted-foreground">
            Please make sure the repository exists and is public, or try adding a GitHub API key in settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Repository Overview */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Repository Overview</CardTitle>
              <CardDescription>Key statistics and information</CardDescription>
            </div>
            <Button onClick={handleDownload} className="flex items-center">
              <Download size={16} className="mr-2" />
              Download Repository
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Stars</p>
              <p className="text-2xl font-bold">{stats?.stars || 0}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Forks</p>
              <p className="text-2xl font-bold">{stats?.forks || 0}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Issues</p>
              <p className="text-2xl font-bold">{stats?.issues || 0}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Contributors</p>
              <p className="text-2xl font-bold">{stats?.contributors || 0}</p>
            </div>
          </div>
          <Separator className="my-6" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Created</p>
              <p className="text-md font-semibold">{stats?.created || "Unknown"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
              <p className="text-md font-semibold">{stats?.updated || "Unknown"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Main Language</p>
              <p className="text-md font-semibold">{stats?.language || "Not specified"}</p>
            </div>
          </div>
          <Separator className="my-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Branches</p>
              <p className="text-2xl font-bold">{stats?.branches || 0}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Files</p>
              <p className="text-2xl font-bold">{stats?.totalFiles || 0}</p>
            </div>
          </div>
          <Separator className="my-6" />
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
            <p className="text-md">{stats?.description || "No description available"}</p>
          </div>
        </CardContent>
      </Card>

      {/* README Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <Book className="mr-2" size={20} />
            <CardTitle>README</CardTitle>
          </div>
          <CardDescription>README content from the repository</CardDescription>
        </CardHeader>
        <CardContent>
          {readmeContent ? (
            <div className="p-4 bg-secondary rounded-md overflow-auto max-h-[400px]">
              <pre className="whitespace-pre-wrap font-mono text-sm">
                {readmeContent}
              </pre>
            </div>
          ) : (
            <p className="text-muted-foreground">No README file found in this repository.</p>
          )}
        </CardContent>
      </Card>

      {/* Structure Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <Folder className="mr-2" size={20} />
            <CardTitle>Repository Structure</CardTitle>
          </div>
          <CardDescription>Top-level organization of the repository</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>
              This repository contains {stats?.totalFiles || 0} files across {stats?.branches || 0} branches.
              The default branch is <span className="font-semibold">{mainBranch}</span>.
            </p>
            <p className="text-muted-foreground">
              View the visual mind map in the "Mind Map" tab for a complete overview of the repository structure.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Code Quality - Estimated */}
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <Code className="mr-2" size={20} />
            <CardTitle>Code Quality</CardTitle>
          </div>
          <CardDescription>Estimated code quality metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8 text-muted-foreground">
            <p className="text-center">
              To analyze code quality in detail, consider using dedicated analysis tools like SonarQube or CodeClimate with this repository.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RepoDocumentation;
