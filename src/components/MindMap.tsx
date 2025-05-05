
import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share, ZoomIn, ZoomOut } from "lucide-react";
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
  Node
} from 'reactflow';
import 'reactflow/dist/style.css';

interface MindMapProps {
  repoUrl: string;
}

interface RepoNode {
  id: string;
  label: string;
  type: "directory" | "file" | "function";
  children: RepoNode[];
  collapsed?: boolean;
}

// Mock data generation for demonstration purposes
const generateMockData = (repoUrl: string): RepoNode => {
  const repoName = repoUrl.split("/").pop() || "repository";
  
  return {
    id: "root",
    label: repoName,
    type: "directory",
    collapsed: false,
    children: [
      {
        id: "src",
        label: "src",
        type: "directory",
        collapsed: false,
        children: [
          {
            id: "components",
            label: "components",
            type: "directory",
            collapsed: false,
            children: [
              {
                id: "Header.jsx",
                label: "Header.jsx",
                type: "file",
                children: [
                  {
                    id: "Header_function",
                    label: "Header()",
                    type: "function",
                    children: []
                  },
                  {
                    id: "toggleMenu_function",
                    label: "toggleMenu()",
                    type: "function",
                    children: []
                  }
                ]
              },
              {
                id: "Footer.jsx",
                label: "Footer.jsx",
                type: "file",
                children: [
                  {
                    id: "Footer_function",
                    label: "Footer()",
                    type: "function",
                    children: []
                  }
                ]
              }
            ]
          },
          {
            id: "utils",
            label: "utils",
            type: "directory",
            collapsed: false,
            children: [
              {
                id: "api.js",
                label: "api.js",
                type: "file",
                children: [
                  {
                    id: "fetchData_function",
                    label: "fetchData()",
                    type: "function",
                    children: []
                  },
                  {
                    id: "postData_function",
                    label: "postData()",
                    type: "function",
                    children: []
                  }
                ]
              }
            ]
          },
          {
            id: "App.jsx",
            label: "App.jsx",
            type: "file",
            children: [
              {
                id: "App_function",
                label: "App()",
                type: "function",
                children: []
              },
              {
                id: "useEffect_hook",
                label: "useEffect()",
                type: "function",
                children: []
              }
            ]
          }
        ]
      },
      {
        id: "public",
        label: "public",
        type: "directory",
        collapsed: true,
        children: [
          {
            id: "index.html",
            label: "index.html",
            type: "file",
            children: []
          },
          {
            id: "favicon.ico",
            label: "favicon.ico",
            type: "file",
            children: []
          }
        ]
      },
      {
        id: "package.json",
        label: "package.json",
        type: "file",
        children: []
      },
      {
        id: "README.md",
        label: "README.md",
        type: "file",
        children: []
      }
    ]
  };
};

// Convert RepoNode structure to ReactFlow nodes and edges
const convertToFlowElements = (repoData: RepoNode | null): { nodes: Node[], edges: Edge[] } => {
  if (!repoData) return { nodes: [], edges: [] };
  
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  
  // Helper function to recursively process nodes
  const processNode = (node: RepoNode, position: { x: number, y: number }, level: number = 0): void => {
    // Add the current node
    const nodeType = getNodeType(node.type);
    nodes.push({
      id: node.id,
      data: { label: node.label, type: node.type },
      type: nodeType,
      position,
      style: {
        width: getNodeWidth(node.label, node.type),
        padding: 10
      }
    });
    
    // If node has children and isn't collapsed, process them
    if (node.children && node.children.length > 0 && !node.collapsed) {
      const childCount = node.children.length;
      const horizontalGap = 180; // Increased spacing between nodes horizontally
      const verticalGap = 120; // Increased spacing between nodes vertically
      
      // Calculate starting position for children
      let startX = position.x - ((childCount - 1) * horizontalGap) / 2;
      const childY = position.y + verticalGap;
      
      node.children.forEach((child, index) => {
        const childPos = { x: startX + index * horizontalGap, y: childY };
        processNode(child, childPos, level + 1);
        
        // Add edge from parent to child
        edges.push({
          id: `e${node.id}-${child.id}`,
          source: node.id,
          target: child.id,
          animated: child.type === "function",
          style: { stroke: getEdgeColor(child.type) }
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
    case "directory": return "input";
    case "file": return "default";
    case "function": return "output";
    default: return "default";
  }
};

const getNodeWidth = (label: string, type: string): number => {
  const baseWidth = 100;
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

const MindMap: React.FC<MindMapProps> = ({ repoUrl }) => {
  const [rootNode, setRootNode] = useState<RepoNode | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    // Simulating data loading
    setLoading(true);
    setTimeout(() => {
      const mockData = generateMockData(repoUrl);
      setRootNode(mockData);
      
      // Convert to ReactFlow format
      const flowElements = convertToFlowElements(mockData);
      setNodes(flowElements.nodes);
      setEdges(flowElements.edges);
      
      setLoading(false);
    }, 1000);
  }, [repoUrl, setNodes, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  const handleToggleNode = (nodeId: string) => {
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
    }
  };

  const handleDownload = () => {
    // In a real implementation, this would generate and download a file
    toast.success("Mind map downloaded successfully!");
  };

  const handleShare = () => {
    // In a real implementation, this would generate a shareable link
    navigator.clipboard.writeText(window.location.href);
    toast.success("Share link copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Generating mind map...</p>
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

      <div className="flex-grow h-[650px] border rounded-md"> {/* Increased height */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          attributionPosition="bottom-right"
        >
          <Controls />
          <MiniMap />
          <Background gap={12} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
};

export default MindMap;
