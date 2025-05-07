import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Download, Terminal, Package, GitBranch, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface InstallationTabProps {
  repoUrl: string;
  defaultBranch: string;
  dependencies: {
    name: string;
    version: string;
  }[];
  installationSteps: string[];
}

const InstallationTab: React.FC<InstallationTabProps> = ({
  repoUrl,
  defaultBranch,
  dependencies = [],
  installationSteps = []
}) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-background to-blue-500/10">
        <div className="flex items-center">
          <Download className="mr-2 h-5 w-5 text-blue-500" />
          <CardTitle>Installation Guide</CardTitle>
        </div>
        <CardDescription>Setup and installation instructions</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-muted/20 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <GitBranch className="h-4 w-4 mr-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Repository</p>
              </div>
              <div className="flex items-center justify-between">
                <a 
                  href={repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:underline break-all"
                >
                  {repoUrl}
                </a>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(repoUrl)}
                  className="h-8 w-8"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="bg-muted/20 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <GitBranch className="h-4 w-4 mr-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Default Branch</p>
              </div>
              <p className="font-medium">{defaultBranch}</p>
            </div>
          </div>
          
          <Separator />
          
          <div>
            <h3 className="text-lg font-medium mb-3">Installation Steps</h3>
            {installationSteps && installationSteps.length > 0 ? (
              <div className="space-y-4">
                {installationSteps.map((step, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-500">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{step}</p>
                      {step.includes("git clone") && (
                        <div className="mt-2 bg-muted/50 p-3 rounded-md font-mono text-sm flex items-center justify-between">
                          <code>{step.split(": ")[1]}</code>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyToClipboard(step.split(": ")[1])}
                            className="h-8 w-8"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">No installation steps available</p>
              </div>
            )}
          </div>
          
          <Separator />
          
          <div>
            <h3 className="text-lg font-medium mb-3">Dependencies</h3>
            {dependencies && dependencies.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dependencies.map((dep, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-center">
                      <Package className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="font-medium">{dep.name}</span>
                    </div>
                    <Badge variant="outline">{dep.version}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">No dependencies listed</p>
              </div>
            )}
          </div>
          
          <div className="p-4 bg-muted/30 rounded-md">
            <h4 className="font-medium mb-2">Quick Start</h4>
            <div className="bg-muted/50 p-3 rounded-md font-mono text-sm">
              <div className="flex items-center mb-2">
                <Terminal className="h-4 w-4 mr-2 text-muted-foreground" />
                <span>Terminal</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <code>git clone {repoUrl}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(`git clone ${repoUrl}`)}
                    className="h-8 w-8"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <code>cd {repoUrl.split('/').pop()?.replace('.git', '')}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(`cd ${repoUrl.split('/').pop()?.replace('.git', '')}`)}
                    className="h-8 w-8"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {dependencies.length > 0 && (
                  <div className="flex items-center justify-between">
                    <code>{dependencies[0].name === 'package.json' ? 'npm install' : 
                           dependencies[0].name === 'requirements.txt' ? 'pip install -r requirements.txt' :
                           dependencies[0].name === 'Gemfile' ? 'bundle install' :
                           dependencies[0].name === 'pom.xml' ? 'mvn install' :
                           dependencies[0].name === 'composer.json' ? 'composer install' :
                           dependencies[0].name === 'go.mod' ? 'go mod download' :
                           dependencies[0].name === 'Cargo.toml' ? 'cargo build' :
                           'npm install'}</code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(
                        dependencies[0].name === 'package.json' ? 'npm install' : 
                        dependencies[0].name === 'requirements.txt' ? 'pip install -r requirements.txt' :
                        dependencies[0].name === 'Gemfile' ? 'bundle install' :
                        dependencies[0].name === 'pom.xml' ? 'mvn install' :
                        dependencies[0].name === 'composer.json' ? 'composer install' :
                        dependencies[0].name === 'go.mod' ? 'go mod download' :
                        dependencies[0].name === 'Cargo.toml' ? 'cargo build' :
                        'npm install'
                      )}
                      className="h-8 w-8"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InstallationTab; 