
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Share } from "lucide-react";
import { toast } from "sonner";

interface MindMapProps {
  repoUrl: string;
}

interface Node {
  id: string;
  label: string;
  type: "directory" | "file" | "function";
  children: Node[];
  collapsed?: boolean;
}

// Mock data generation for demonstration purposes
const generateMockData = (repoUrl: string): Node => {
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

const NodeComponent: React.FC<{ 
  node: Node, 
  level: number, 
  onToggle: (id: string) => void 
}> = ({ node, level, onToggle }) => {
  const getNodeColor = () => {
    switch (node.type) {
      case 'directory':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'file':
        return 'bg-green-500/20 text-green-300 border-green-500/40';
      case 'function':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/40';
    }
  };

  const getNodeIcon = () => {
    switch (node.type) {
      case 'directory':
        return '📁';
      case 'file':
        return '📄';
      case 'function':
        return '⚙️';
      default:
        return '📎';
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.children.length > 0) {
      onToggle(node.id);
    }
  };

  return (
    <div className="flex flex-col" style={{ marginLeft: `${level * 20}px` }}>
      <div 
        className={`flex items-center p-2 my-1 rounded-md cursor-pointer border ${getNodeColor()} transition-colors hover:bg-opacity-30`}
        onClick={handleToggle}
      >
        {node.children.length > 0 && (
          <span className="mr-2 text-xs">{node.collapsed ? '▶️' : '🔽'}</span>
        )}
        <span className="mr-2">{getNodeIcon()}</span>
        <span>{node.label}</span>
      </div>
      
      {!node.collapsed && node.children.map(childNode => (
        <NodeComponent 
          key={childNode.id} 
          node={childNode} 
          level={level + 1} 
          onToggle={onToggle} 
        />
      ))}
    </div>
  );
};

const MindMap: React.FC<MindMapProps> = ({ repoUrl }) => {
  const [rootNode, setRootNode] = useState<Node | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Simulating data loading
    setLoading(true);
    setTimeout(() => {
      const mockData = generateMockData(repoUrl);
      setRootNode(mockData);
      setLoading(false);
    }, 1000);
  }, [repoUrl]);

  const handleNodeToggle = (nodeId: string) => {
    const toggleNode = (node: Node): Node => {
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
      setRootNode(toggleNode(rootNode));
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

      <div className="overflow-auto flex-grow p-4">
        {rootNode && (
          <div className="min-w-[600px]">
            <NodeComponent 
              node={rootNode} 
              level={0} 
              onToggle={handleNodeToggle} 
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MindMap;
