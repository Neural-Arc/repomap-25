
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { 
  Download, Share, Folder, File, FileCode, Search, 
  Filter, ArrowDown, ArrowRight, Code, Calendar, 
  User, Clock, GitCommit, X, ZoomIn, ZoomOut, Maximize
} from "lucide-react";
import { toast } from "sonner";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeProps,
  Panel,
  NodeMouseHandler,
  BackgroundVariant,
  MarkerType,
  useReactFlow,
  ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useApi } from "@/contexts/ApiContext";
import { RepoNode, fetchRepositoryData, convertRepoDataToNodes, getRepoDownloadUrl } from "@/services/githubService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

interface MindMapProps {
  repoUrl: string;
}

interface NodeData {
  label: string;
  type: string;
  path?: string;
  extension?: string;
  size?: number;
  language?: string;
  lastCommitDate?: string;
  contributors?: string[];
  description?: string;
}

interface FileDetailProps {
  node: Node<NodeData>;
  onClose: () => void;
}

// Custom node components
const DirectoryNode = ({ data, isConnectable, id }: NodeProps) => {
  return (
    <div className="group">
      <div className="px-4 py-3 shadow-md rounded-md border-2 border-blue-500/80 bg-gradient-to-br from-blue-800/30 to-blue-900/30 backdrop-blur-sm transition-all duration-300 group-hover:shadow-lg group-hover:shadow-blue-500/20 group-hover:scale-105 min-w-[120px]">
        <div className="flex items-center gap-2">
          <Folder className="text-blue-400 w-5 h-5" />
          <span className="font-medium text-sm text-blue-100">{data.label}</span>
          {data.type === 'directory' && (
            <Badge variant="outline" className="text-[0.65rem] bg-blue-950/40 text-blue-200">
              dir
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

const FileNode = ({ data, isConnectable, id }: NodeProps) => {
  const extension = data.path?.split('.').pop() || '';
  
  // Determine color based on file extension
  const getFileColor = () => {
    switch(extension) {
      case 'js':
      case 'jsx':
        return 'text-yellow-400';
      case 'ts':
      case 'tsx':
        return 'text-blue-400';
      case 'css':
      case 'scss':
        return 'text-pink-400';
      case 'json':
        return 'text-green-400';
      case 'md':
        return 'text-purple-400';
      case 'html':
        return 'text-orange-400';
      default:
        return 'text-gray-400';
    }
  };
  
  const fileColor = getFileColor();
  
  return (
    <div className="group">
      <div className="px-4 py-3 shadow-md rounded-md border-2 border-green-500/50 bg-gradient-to-br from-green-800/30 to-green-900/30 backdrop-blur-sm transition-all duration-300 group-hover:shadow-lg group-hover:shadow-green-500/20 group-hover:scale-105 min-w-[120px]">
        <div className="flex items-center gap-2">
          <FileCode className={`${fileColor} w-5 h-5`} />
          <span className="font-medium text-sm text-green-100">{data.label}</span>
          {extension && (
            <Badge variant="outline" className="text-[0.65rem] bg-green-950/40 text-green-200">
              {extension}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

const FunctionNode = ({ data, isConnectable, id }: NodeProps) => {
  return (
    <div className="group">
      <div className="px-4 py-3 shadow-md rounded-md border-2 border-purple-500/50 bg-gradient-to-br from-purple-800/30 to-purple-900/30 backdrop-blur-sm transition-all duration-300 group-hover:shadow-lg group-hover:shadow-purple-500/20 group-hover:scale-105 min-w-[120px]">
        <div className="flex items-center gap-2">
          <Code className="text-purple-400 w-5 h-5" />
          <span className="font-medium text-sm text-purple-100">{data.label}</span>
          <Badge variant="outline" className="text-[0.65rem] bg-purple-950/40 text-purple-200">
            func
          </Badge>
        </div>
      </div>
    </div>
  );
};

const FileDetailsPanel: React.FC<FileDetailProps> = ({ node, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");
  
  // Mock data for file details - in a real implementation, this would come from API
  const mockData = useMemo(() => ({
    lastModified: "3 days ago",
    contributors: ["John Doe", "Jane Smith"],
    commits: Math.floor(Math.random() * 20) + 1,
    size: Math.floor(Math.random() * 2000) + 100 + " KB",
    lines: Math.floor(Math.random() * 1000) + 50,
    quality: Math.floor(Math.random() * 30) + 70,
    description: node.data.type === "directory" 
      ? `This directory contains ${Math.floor(Math.random() * 10) + 1} files and handles ${node.data.label} functionality.` 
      : `This file is responsible for ${node.data.label} functionality. It defines core logic for working with this feature.`
  }), [node]);
  
  useEffect(() => {
    if (node.data.type === "file") {
      setLoading(true);
      // Simulate loading content
      setTimeout(() => {
        setContent(`// Sample content for ${node.data.label}\n\n// This is a simplified representation of what might be in this file\n\nfunction example() {\n  console.log("This is an example");\n  return true;\n}`);
        setLoading(false);
      }, 500);
    }
  }, [node]);
  
  return (
    <ScrollArea className="h-full max-h-[calc(100vh-150px)]">
      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center">
            {node.data.type === "directory" ? (
              <Folder className="mr-2 h-6 w-6 text-primary" />
            ) : (
              <FileCode className="mr-2 h-6 w-6 text-primary" />
            )}
            <div>
              <h2 className="text-xl font-semibold">{node.data.label}</h2>
              <p className="text-muted-foreground">{node.data.path || "Unknown path"}</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Last Modified</div>
              <div className="flex items-center">
                <Clock className="mr-1 h-3 w-3 text-muted-foreground" />
                <span className="text-sm">{mockData.lastModified}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Commits</div>
              <div className="flex items-center">
                <GitCommit className="mr-1 h-3 w-3 text-muted-foreground" />
                <span className="text-sm">{mockData.commits}</span>
              </div>
            </div>
            {node.data.type === "file" && (
              <>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Size</div>
                  <span className="text-sm">{mockData.size}</span>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Lines</div>
                  <span className="text-sm">{mockData.lines}</span>
                </div>
              </>
            )}
          </div>
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Contributors</h4>
            <div className="flex flex-wrap gap-2">
              {mockData.contributors.map((contributor, idx) => (
                <div key={idx} className="flex items-center gap-1 bg-muted/30 px-2 py-1 rounded text-xs">
                  <User className="h-3 w-3" />
                  {contributor}
                </div>
              ))}
            </div>
          </div>
          
          {node.data.type === "file" && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Code Quality</h4>
              <div className="flex justify-between text-xs">
                <span>Quality Score</span>
                <span>{mockData.quality}%</span>
              </div>
              <Progress value={mockData.quality} className="h-1" />
            </div>
          )}
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Description</h4>
            <p className="text-sm text-muted-foreground">{mockData.description}</p>
          </div>
          
          {node.data.type === "file" && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">File Preview</h4>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                </div>
              ) : (
                <div className="bg-muted/40 p-3 rounded-md overflow-auto max-h-48">
                  <pre className="text-xs whitespace-pre-wrap">{content}</pre>
                </div>
              )}
            </div>
          )}
          
          <div className="pt-4 flex justify-between">
            <Badge variant="outline">{node.data.type}</Badge>
            {node.data.extension && <Badge>{node.data.extension}</Badge>}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};

// Convert RepoNode structure to ReactFlow nodes and edges with enhanced styling
const convertToFlowElements = (repoData: RepoNode | null): { nodes: Node[], edges: Edge[] } => {
  if (!repoData) return { nodes: [], edges: [] };
  
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  
  // Helper function to recursively process nodes
  const processNode = (node: RepoNode, position: { x: number, y: number }, level: number = 0): void => {
    // Add the current node
    const nodeType = getNodeType(node.type);
    const extension = node.path ? node.path.split('.').pop() : undefined;
    
    nodes.push({
      id: node.id,
      data: { 
        label: node.label, 
        type: node.type,
        path: node.path,
        extension
      },
      type: nodeType,
      position,
      style: {
        width: getNodeWidth(node.label, node.type),
      }
    });
    
    // If node has children and isn't collapsed, process them
    if (node.children && node.children.length > 0 && !node.collapsed) {
      const childCount = node.children.length;
      const horizontalGap = 280; // Increased spacing between nodes horizontally
      const verticalGap = 180; // Increased spacing between nodes vertically
      
      // Calculate starting position for children
      let startX = position.x - ((childCount - 1) * horizontalGap) / 2;
      const childY = position.y + verticalGap;
      
      node.children.forEach((child, index) => {
        const childPos = { x: startX + index * horizontalGap, y: childY };
        processNode(child, childPos, level + 1);
        
        // Add edge from parent to child with enhanced styling
        edges.push({
          id: `e${node.id}-${child.id}`,
          source: node.id,
          target: child.id,
          animated: child.type === "function",
          style: { 
            stroke: getEdgeColor(child.type),
            strokeWidth: 2,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: getEdgeColor(child.type),
            width: 20,
            height: 20,
          }
        });
      });
    }
  };
  
  // Start processing from the root node
  processNode(repoData, { x: 0, y: 0 });
  
  return { nodes, edges };
};

// Helper functions for node styling
const getNodeType = (type: string): string => {
  switch (type) {
    case "directory": return "directory";
    case "file": return "file";
    case "function": return "function";
    default: return "default";
  }
};

const getNodeWidth = (label: string, type: string): number => {
  const baseWidth = 140;
  const charWidth = 8;
  return Math.max(baseWidth, label.length * charWidth);
};

const getEdgeColor = (type: string): string => {
  switch (type) {
    case "directory": return "#3b82f6";
    case "file": return "#10b981";
    case "function": return "#8b5cf6";
    default: return "#94a3b8";
  }
};

// The main component that uses React Flow hooks
const MindMapContent: React.FC<MindMapProps> = ({ repoUrl }) => {
  const { gitHubApiKey } = useApi();
  const [rootNode, setRootNode] = useState<RepoNode | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [visibleFileTypes, setVisibleFileTypes] = useState<Set<string>>(new Set());
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const reactFlowInstance = useReactFlow();

  useEffect(() => {
    // Fetch real data from GitHub API
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const repoData = await fetchRepositoryData(repoUrl, gitHubApiKey);
        
        if (repoData) {
          const rootNode = convertRepoDataToNodes(repoData);
          setRootNode(rootNode);
          
          // Collect all file extensions
          const allTypes = new Set<string>();
          Object.values(repoData.files).flat().forEach(file => {
            if (file.type === 'file') {
              const extension = file.path.split('.').pop() || 'unknown';
              allTypes.add(extension);
            }
          });
          setVisibleFileTypes(allTypes);
          
          // Convert to ReactFlow format
          const flowElements = convertToFlowElements(rootNode);
          setNodes(flowElements.nodes);
          setEdges(flowElements.edges);

          // Give a small delay to ensure nodes are rendered before fitting view
          setTimeout(() => {
            reactFlowInstance.fitView({
              padding: 0.5,
              duration: 1000,
              minZoom: 0.5,
              maxZoom: 2,
            });
          }, 300);
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
  }, [repoUrl, gitHubApiKey, setNodes, setEdges, reactFlowInstance]);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({
      ...connection,
      animated: true,
      style: { stroke: '#9b87f5', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#9b87f5',
      }
    }, eds)),
    [setEdges]
  );

  const handleToggleNode = useCallback((nodeId: string) => {
    const toggleNode = (node: RepoNode): RepoNode => {
      if (node.id === nodeId) {
        return { ...node, collapsed: !node.collapsed };
      }
      
      if (node.children.length > 0) {
        return {
          ...node,
          children: node.children.map(child => toggleNode(child))
        };
      }
      
      return node;
    };
    
    if (rootNode) {
      const updatedRootNode = toggleNode(rootNode);
      setRootNode(updatedRootNode);
      
      // Update flow elements
      const flowElements = convertToFlowElements(updatedRootNode);
      setNodes(flowElements.nodes);
      setEdges(flowElements.edges);
      
      // Re-fit view after toggling with a smoother animation
      setTimeout(() => {
        reactFlowInstance.fitView({
          padding: 0.4,
          duration: 800
        });
      }, 100);
    }
  }, [rootNode, setNodes, setEdges, reactFlowInstance]);

  const handleDownload = () => {
    const downloadUrl = getRepoDownloadUrl(repoUrl);
    
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
      toast.success("Download started!");
    } else {
      toast.error("Could not generate download link");
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Share link copied to clipboard!");
  };

  const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
    setSelectedNode(node);
    
    // If the node is clicked with Alt key, expand/collapse
    if (event.altKey && node.data.type === 'directory') {
      handleToggleNode(node.id);
    } else {
      // Open detailed view
      setIsDetailSheetOpen(true);
    }
  }, [handleToggleNode]);

  const zoomToNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      reactFlowInstance.fitView({ 
        nodes: [node],
        duration: 800,
        padding: 0.3
      });
    }
  }, [nodes, reactFlowInstance]);
  
  const handleZoomIn = () => {
    reactFlowInstance.zoomIn({ duration: 300 });
    setZoomLevel(prev => Math.min(prev + 0.25, reactFlowInstance.getZoom()));
  };
  
  const handleZoomOut = () => {
    reactFlowInstance.zoomOut({ duration: 300 });
    setZoomLevel(prev => Math.max(prev - 0.25, reactFlowInstance.getZoom()));
  };
  
  const handleResetView = () => {
    reactFlowInstance.fitView({ duration: 800, padding: 0.4 });
    setZoomLevel(reactFlowInstance.getZoom());
  };

  // Filter nodes based on search term and filter type
  const filteredNodes = useMemo(() => {
    if (!searchTerm && !filterType) return nodes;
    
    return nodes.filter(node => {
      // Filter by search term
      const matchesSearch = searchTerm ? 
        node.data.label.toLowerCase().includes(searchTerm.toLowerCase()) : 
        true;
      
      // Filter by file type
      const matchesFilter = filterType ? 
        (filterType === 'directory' ? node.data.type === 'directory' : 
         node.data.extension === filterType) : 
        true;
        
      return matchesSearch && matchesFilter;
    });
  }, [nodes, searchTerm, filterType]);

  // Register custom node types
  const nodeTypes = useMemo(() => ({
    directory: DirectoryNode,
    file: FileNode,
    function: FunctionNode
  }), []);

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
            Please make sure the repository exists and is public, or try adding a GitHub API key in settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-4 border-b border-muted mb-4">
        <h2 className="text-lg font-semibold">Repository Structure</h2>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDownload}
            className="flex items-center"
          >
            <Download size={16} className="mr-2" />
            Download
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleShare}
            className="flex items-center"
          >
            <Share size={16} className="mr-2" />
            Share
          </Button>
        </div>
      </div>

      <div className="flex-grow h-[700px] border rounded-md relative overflow-hidden">
        <ReactFlow
          nodes={filteredNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{
            padding: 0.5,
            minZoom: 0.4,
            maxZoom: 2,
            duration: 1000,
          }}
          attributionPosition="bottom-right"
          minZoom={0.2}
          maxZoom={3}
          defaultEdgeOptions={{ 
            type: 'smoothstep',
            animated: true,
            style: { strokeWidth: 2 }
          }}
          className="bg-gradient-to-br from-black/30 to-primary/5"
        >
          <Panel position="top-left" className="bg-background/90 p-3 rounded-md shadow-md border border-border">
            <div className="flex items-center space-x-2 mb-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex items-center space-x-1 flex-wrap gap-1">
              <Filter className="h-4 w-4 text-muted-foreground mr-1" />
              <Button
                variant={!filterType ? "secondary" : "outline"}
                size="sm"
                onClick={() => setFilterType(null)}
                className="text-xs py-0 h-6"
              >
                All
              </Button>
              <Button
                variant={filterType === 'directory' ? "secondary" : "outline"}
                size="sm"
                onClick={() => setFilterType('directory')}
                className="text-xs py-0 h-6"
              >
                <Folder className="h-3 w-3 mr-1" />Dirs
              </Button>
              {Array.from(visibleFileTypes).slice(0, 5).map(ext => (
                <Button
                  key={ext}
                  variant={filterType === ext ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setFilterType(ext)}
                  className="text-xs py-0 h-6"
                >
                  <File className="h-3 w-3 mr-1" />.{ext}
                </Button>
              ))}
              {visibleFileTypes.size > 5 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" className="text-xs py-0 h-6">
                        +{visibleFileTypes.size - 5}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="p-1 grid grid-cols-3 gap-1">
                        {Array.from(visibleFileTypes).slice(5).map(ext => (
                          <Badge 
                            key={ext} 
                            variant="outline" 
                            className="cursor-pointer"
                            onClick={() => setFilterType(ext)}
                          >
                            .{ext}
                          </Badge>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </Panel>

          {selectedNode && !isDetailSheetOpen && (
            <Panel position="bottom-center" className="bg-background/90 p-4 rounded-md shadow-md border border-border max-w-lg mb-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold">{selectedNode.data.label}</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0" 
                  onClick={() => setSelectedNode(null)}
                >
                  <X size={14} />
                </Button>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <Badge variant={selectedNode.data.type === 'directory' ? "secondary" : "outline"}>
                    {selectedNode.data.type}
                  </Badge>
                </div>
                
                {selectedNode.data.path && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Path:</span>
                    <span className="text-xs bg-muted px-2 py-1 rounded">{selectedNode.data.path}</span>
                  </div>
                )}
                
                {selectedNode.data.extension && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Extension:</span>
                    <Badge>.{selectedNode.data.extension}</Badge>
                  </div>
                )}
                
                <div className="flex justify-between gap-2 mt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs h-7 flex-1"
                    onClick={() => zoomToNode(selectedNode.id)} 
                  >
                    Focus
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs h-7 flex-1"
                    onClick={() => setIsDetailSheetOpen(true)} 
                  >
                    View Details
                  </Button>
                  
                  {selectedNode.data.type === 'directory' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs h-7 flex-1"
                      onClick={() => handleToggleNode(selectedNode.id)} 
                    >
                      {rootNode?.collapsed ? (
                        <ArrowRight className="h-3 w-3 mr-1" />
                      ) : (
                        <ArrowDown className="h-3 w-3 mr-1" />
                      )}
                      {rootNode?.collapsed ? 'Expand' : 'Collapse'}
                    </Button>
                  )}
                </div>
              </div>
            </Panel>
          )}
          
          {/* Custom zoom controls */}
          <Panel position="bottom-right" className="bg-background/90 p-2 rounded-md shadow-md border border-border mb-12 mr-12">
            <div className="flex gap-1">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8" 
                onClick={handleZoomIn}
              >
                <ZoomIn size={16} />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8" 
                onClick={handleZoomOut}
              >
                <ZoomOut size={16} />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8" 
                onClick={handleResetView}
              >
                <Maximize size={16} />
              </Button>
            </div>
          </Panel>
          
          <Controls className="bg-background/80 border border-border shadow-lg rounded-md" />
          <MiniMap 
            nodeStrokeWidth={3}
            nodeColor={(node) => {
              if (node.type === 'directory') return '#3b82f6';
              if (node.type === 'file') return '#10b981';
              if (node.type === 'function') return '#8b5cf6';
              return '#94a3b8';
            }}
            maskColor="rgba(0, 0, 0, 0.5)"
            className="!bg-background/10 !border-muted"
            style={{
              backgroundColor: 'transparent',
              width: 140,
              height: 100
            }}
          />
          <Background color="#3b3b3b" gap={24} size={1.5} variant={BackgroundVariant.Dots} />
        </ReactFlow>
      </div>
      
      {/* Details sheet that slides in from the side */}
      {selectedNode && (
        <Sheet open={isDetailSheetOpen} onOpenChange={setIsDetailSheetOpen}>
          <SheetContent side="right" className="w-full sm:max-w-lg p-0 overflow-hidden">
            <SheetHeader className="border-b bg-muted/20 p-4">
              <SheetTitle className="flex items-center gap-2">
                {selectedNode.data.type === "directory" ? (
                  <Folder className="h-5 w-5 text-primary" />
                ) : (
                  <FileCode className="h-5 w-5 text-primary" />
                )}
                {selectedNode.data.label}
              </SheetTitle>
              <SheetDescription>
                {selectedNode.data.path || "Path not available"}
              </SheetDescription>
            </SheetHeader>
            <FileDetailsPanel node={selectedNode} onClose={() => setIsDetailSheetOpen(false)} />
          </SheetContent>
        </Sheet>
      )}
      
      {/* Quick tips card */}
      <Card className="mt-6 border border-border/50 bg-muted/5">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-lg">Mind Map Tips</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="font-medium mb-1">Navigation:</p>
              <ul className="list-disc list-inside pl-2 space-y-1">
                <li>Click and drag to pan around</li>
                <li>Use scroll wheel to zoom</li>
                <li>Click on a node to see details</li>
              </ul>
            </div>
            <div>
              <p className="font-medium mb-1">Keyboard Shortcuts:</p>
              <ul className="list-disc list-inside pl-2 space-y-1">
                <li>Alt + Click on directories to expand/collapse</li>
                <li>Esc key to close any open panels</li>
                <li>Search by typing in the search box</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Wrapper component that provides the ReactFlowProvider
const MindMap: React.FC<MindMapProps> = (props) => {
  return (
    <ReactFlowProvider>
      <MindMapContent {...props} />
    </ReactFlowProvider>
  );
};

export default MindMap;
