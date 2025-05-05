
import React, { useState, useEffect } from "react";
import { Download, FileText, Code, TestTube, BarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface RepoDocumentationProps {
  repoUrl: string;
}

interface RepoStats {
  stars: number;
  forks: number;
  issues: number;
  contributors: number;
  created: string;
  updated: string;
  language: string;
}

const RepoDocumentation: React.FC<RepoDocumentationProps> = ({ repoUrl }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<RepoStats | null>(null);

  useEffect(() => {
    // Mock data fetching
    setLoading(true);
    setTimeout(() => {
      // Generate mock repository stats
      setStats({
        stars: Math.floor(Math.random() * 1000),
        forks: Math.floor(Math.random() * 500),
        issues: Math.floor(Math.random() * 100),
        contributors: Math.floor(Math.random() * 50),
        created: "2023-01-15",
        updated: "2025-04-20",
        language: "TypeScript",
      });
      setLoading(false);
    }, 1500);
  }, [repoUrl]);

  const handleDownload = () => {
    // Extract repo owner and name from URL
    const urlParts = repoUrl.split('/');
    const repoOwner = urlParts[urlParts.length - 2] || "owner";
    const repoName = urlParts[urlParts.length - 1] || "repo";
    
    // Generate download URL for the zip file
    const downloadUrl = `https://github.com/${repoOwner}/${repoName}/archive/refs/heads/main.zip`;
    
    // Open the URL in a new tab
    window.open(downloadUrl, '_blank');
    toast.success("Download started!");
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
              <p className="text-2xl font-bold">{stats?.stars}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Forks</p>
              <p className="text-2xl font-bold">{stats?.forks}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Issues</p>
              <p className="text-2xl font-bold">{stats?.issues}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Contributors</p>
              <p className="text-2xl font-bold">{stats?.contributors}</p>
            </div>
          </div>
          <Separator className="my-6" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Created</p>
              <p className="text-md font-semibold">{stats?.created}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
              <p className="text-md font-semibold">{stats?.updated}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Main Language</p>
              <p className="text-md font-semibold">{stats?.language}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documentation */}
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <FileText className="mr-2" size={20} />
            <CardTitle>Documentation</CardTitle>
          </div>
          <CardDescription>Documentation extracted from the repository</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">README Highlights</h3>
            <div className="p-4 bg-secondary rounded-md">
              <p className="mb-3">
                This project demonstrates a repository visualization tool using React and a 
                mind map visualization. It allows users to analyze GitHub repositories and
                understand their structure.
              </p>
              <p>
                Main features include interactive mind maps, documentation parsing,
                and code quality analysis.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Testing Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <TestTube className="mr-2" size={20} />
            <CardTitle>Testing Information</CardTitle>
          </div>
          <CardDescription>Test coverage and parameters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Test Coverage</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>Overall</span>
                  <span className="font-semibold">78%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '78%' }} />
                </div>
                
                <div className="flex justify-between items-center">
                  <span>Components</span>
                  <span className="font-semibold">82%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '82%' }} />
                </div>
                
                <div className="flex justify-between items-center">
                  <span>Utilities</span>
                  <span className="font-semibold">65%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '65%' }} />
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Test Framework</h3>
              <p className="text-md">
                Tests are written using Jest and React Testing Library.
                E2E tests use Cypress.
              </p>
              <h4 className="text-md font-semibold mt-4 mb-2">Test Commands</h4>
              <pre className="p-3 bg-secondary rounded-md text-xs overflow-x-auto">
                <code>
                  npm test             # Run unit tests{"\n"}
                  npm run test:watch   # Run tests in watch mode{"\n"}
                  npm run test:coverage # Generate coverage report{"\n"}
                  npm run test:e2e     # Run E2E tests
                </code>
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Code Quality */}
      <Card>
        <CardHeader>
          <div className="flex items-center">
            <Code className="mr-2" size={20} />
            <CardTitle>Code Quality</CardTitle>
          </div>
          <CardDescription>Code quality metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Complexity Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-md">
                  <p className="text-sm text-muted-foreground">Average Complexity</p>
                  <p className="text-2xl font-bold">Low</p>
                </div>
                <div className="p-4 border rounded-md">
                  <p className="text-sm text-muted-foreground">Most Complex File</p>
                  <p className="text-md font-semibold">MindMap.tsx</p>
                </div>
                <div className="p-4 border rounded-md">
                  <p className="text-sm text-muted-foreground">Code Duplication</p>
                  <p className="text-2xl font-bold">3.2%</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RepoDocumentation;
