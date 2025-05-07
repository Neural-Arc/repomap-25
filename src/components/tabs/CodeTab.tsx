import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FileCode } from "lucide-react";
import { RepoStats } from "@/services/githubService";

interface CodeTabProps {
  stats: RepoStats | null;
  fileTypes: Array<{
    extension: string;
    count: number;
    percentage: number;
    color: string;
  }>;
  readmeContent: string | null;
  codeQualityScore: number;
}

const CodeTab: React.FC<CodeTabProps> = ({
  stats,
  fileTypes,
  readmeContent,
  codeQualityScore
}) => {
  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-background to-blue-500/10">
        <div className="flex items-center">
          <FileCode className="mr-2 h-5 w-5 text-blue-500" />
          <CardTitle>Code Structure & Analysis</CardTitle>
        </div>
        <CardDescription>Code organization and quality metrics</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-muted/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Primary Language</p>
              <p className="text-xl font-semibold">{stats?.language || "Unknown"}</p>
            </div>
            <div className="bg-muted/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Complexity</p>
              <p className="text-xl font-semibold">
                {stats?.totalFiles && stats.totalFiles > 100 ? "High" : stats?.totalFiles && stats.totalFiles > 50 ? "Medium" : "Low"}
              </p>
            </div>
            <div className="bg-muted/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">File Organization</p>
              <p className="text-xl font-semibold">
                {stats?.dirCount && stats.dirCount > 10 ? "Complex" : stats?.dirCount && stats.dirCount > 5 ? "Moderate" : "Simple"}
              </p>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <h3 className="text-lg font-medium mb-3">File Distribution</h3>
            <div className="space-y-4">
              {fileTypes.slice(0, 5).map((type, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-sm mr-2" 
                        style={{ backgroundColor: type.color }} 
                      />
                      <span>{type.extension}</span>
                    </div>
                    <span>{type.count} files ({type.percentage.toFixed(1)}%)</span>
                  </div>
                  <Progress value={type.percentage} className="h-1" 
                    style={{ backgroundColor: `${type.color}25` }}>
                    <div className="h-full" style={{ backgroundColor: type.color, width: `${type.percentage}%` }} />
                  </Progress>
                </div>
              ))}
            </div>
          </div>
          
          <Separator />
          
          <div>
            <h3 className="text-lg font-medium mb-3">Best Practices Analysis</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full ${readmeContent ? "bg-green-500" : "bg-amber-500"} mr-2`} />
                  <span>Documentation</span>
                </div>
                <Badge variant={readmeContent ? "outline" : "destructive"}>
                  {readmeContent ? "Present" : "Missing"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full ${codeQualityScore > 70 ? "bg-green-500" : "bg-amber-500"} mr-2`} />
                  <span>Testing</span>
                </div>
                <Badge variant={codeQualityScore > 70 ? "outline" : "destructive"}>
                  {codeQualityScore > 70 ? "Present" : "Limited/Missing"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full ${stats?.issues !== undefined ? "bg-green-500" : "bg-amber-500"} mr-2`} />
                  <span>Issue Tracking</span>
                </div>
                <Badge variant={stats?.issues !== undefined ? "outline" : "destructive"}>
                  {stats?.issues !== undefined ? `${stats.issues} Issues` : "No Data"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full ${stats?.contributors && stats.contributors > 1 ? "bg-green-500" : "bg-amber-500"} mr-2`} />
                  <span>Collaboration</span>
                </div>
                <Badge variant={stats?.contributors && stats.contributors > 1 ? "outline" : "destructive"}>
                  {stats?.contributors && stats.contributors > 1 ? `${stats.contributors} Contributors` : "Single Contributor"}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-muted/30 rounded-md">
            <h4 className="font-medium mb-2">Help & Tips</h4>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>• View the <strong>Mind Map</strong> tab for a visual representation of the repository structure</p>
              <p>• Check the <strong>Contributors</strong> tab to see who has worked on this repository</p>
              <p>• Installation instructions can be found in the <strong>Installation</strong> tab</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CodeTab; 