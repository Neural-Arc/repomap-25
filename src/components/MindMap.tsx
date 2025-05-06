
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { useApi } from "@/contexts/ApiContext";
import { fetchRepositoryData } from "@/services/githubService";
import RadialMindMap from "./RadialMindMap";
import { Skeleton } from "@/components/ui/skeleton";

interface MindMapProps {
  repoUrl: string;
}

const MindMap: React.FC<MindMapProps> = ({ repoUrl }) => {
  const { gitHubApiKey } = useApi();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [repoData, setRepoData] = useState<any>(null);

  useEffect(() => {
    // Fetch real data from GitHub API
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const repoData = await fetchRepositoryData(repoUrl, gitHubApiKey);
        
        if (repoData) {
          setRepoData(repoData);
        } else {
          setError("Failed to fetch repository data");
        }
      } catch (error) {
        console.error("Error in MindMap component:", error);
        setError("An error occurred while processing repository data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [repoUrl, gitHubApiKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[600px]">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Fetching repository structure...</p>
          <div className="mt-8 space-y-4 w-96">
            <Skeleton className="h-8 w-full" />
            <div className="flex space-x-4">
              <Skeleton className="h-36 w-36 rounded-md" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-6 w-5/6" />
              </div>
            </div>
            <Skeleton className="h-36 w-full rounded-md" />
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <div className="flex flex-col items-center text-center">
          <p className="text-destructive text-lg mb-4">{error}</p>
          <p className="text-muted-foreground">
            Please make sure the repository exists and is public, or check that the GitHub API key is correct in your .env file.
          </p>
        </div>
      </div>
    );
  }

  return <RadialMindMap repoUrl={repoUrl} repoData={repoData} />;
};

export default MindMap;
