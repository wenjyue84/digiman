import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Sparkles, Users, Brain, Shield, CreditCard, CheckCircle, Home, HelpCircle, Save, RotateCcw, Eye, Code, AlertCircle, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

/**
 * Rainbow Knowledge Base Admin Page with Inline Editing
 * Progressive Disclosure System inspired by OpenClaw
 */

const KB_FILES = [
  {
    id: "AGENTS.md",
    name: "AGENTS.md",
    icon: Sparkles,
    description: "Entry Point — LLM reads this FIRST (routing table)",
    color: "text-purple-600",
    category: "core",
    priority: "always"
  },
  {
    id: "soul.md",
    name: "soul.md",
    icon: Sparkles,
    description: "Rainbow's identity (personality, voice, boundaries)",
    color: "text-pink-600",
    category: "core",
    priority: "always"
  },
  {
    id: "users.md",
    name: "users.md",
    icon: Users,
    description: "Guest profiles, needs, and user journey",
    color: "text-blue-600",
    category: "core",
    priority: "ondemand"
  },
  {
    id: "memory.md",
    name: "memory.md",
    icon: Brain,
    description: "Memory system architecture (how Rainbow remembers)",
    color: "text-indigo-600",
    category: "system",
    priority: "internal"
  },
  {
    id: "houserules.md",
    name: "houserules.md",
    icon: Shield,
    description: "House rules and policies",
    color: "text-red-600",
    category: "knowledge",
    priority: "ondemand"
  },
  {
    id: "payment.md",
    name: "payment.md",
    icon: CreditCard,
    description: "Pricing, payment methods, and refunds",
    color: "text-green-600",
    category: "knowledge",
    priority: "ondemand"
  },
  {
    id: "checkin.md",
    name: "checkin.md",
    icon: CheckCircle,
    description: "Check-in process and procedures",
    color: "text-cyan-600",
    category: "knowledge",
    priority: "ondemand"
  },
  {
    id: "facilities.md",
    name: "facilities.md",
    icon: Home,
    description: "Facilities, amenities, and services",
    color: "text-orange-600",
    category: "knowledge",
    priority: "ondemand"
  },
  {
    id: "faq.md",
    name: "faq.md",
    icon: HelpCircle,
    description: "Frequently asked questions",
    color: "text-yellow-600",
    category: "knowledge",
    priority: "ondemand"
  }
];

export default function AdminRainbowKB() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [originalContent, setOriginalContent] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
  const { toast } = useToast();

  const coreFiles = KB_FILES.filter(f => f.category === "core");
  const systemFiles = KB_FILES.filter(f => f.category === "system");
  const knowledgeFiles = KB_FILES.filter(f => f.category === "knowledge");

  // Load file content when selected
  const loadFile = async (filename: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/rainbow-kb/files/${filename}`);
      if (!response.ok) throw new Error('Failed to load file');

      const data = await response.json();
      setFileContent(data.content);
      setOriginalContent(data.content);
      setSelectedFile(filename);
      setIsEditing(false);
      setViewMode("edit");
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to load ${filename}`,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Save file content
  const saveFile = async () => {
    if (!selectedFile) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/rainbow-kb/files/${selectedFile}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: fileContent })
      });

      if (!response.ok) throw new Error('Failed to save file');

      const data = await response.json();
      setOriginalContent(fileContent);
      setIsEditing(false);

      toast({
        title: "Success",
        description: `${selectedFile} saved successfully. Backup: ${data.backup}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to save ${selectedFile}`,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to original content
  const resetContent = () => {
    setFileContent(originalContent);
    setIsEditing(false);
    toast({
      title: "Reset",
      description: "Content reset to last saved version"
    });
  };

  // Handle content change
  const handleContentChange = (value: string) => {
    setFileContent(value);
    setIsEditing(value !== originalContent);
  };

  const selectedFileInfo = KB_FILES.find(f => f.id === selectedFile);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Rainbow Knowledge Base</h1>
              <p className="text-sm text-muted-foreground">
                Progressive disclosure system with inline editing
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* File Browser Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-4">
            <h2 className="font-semibold mb-3">Knowledge Base Files</h2>

            <Tabs defaultValue="core">
              <TabsList className="grid w-full grid-cols-4 mb-3">
                <TabsTrigger value="core">Core</TabsTrigger>
                <TabsTrigger value="system">System</TabsTrigger>
                <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
                <TabsTrigger value="help">Help</TabsTrigger>
              </TabsList>

              <TabsContent value="core" className="space-y-2 mt-0">
                {coreFiles.map(file => (
                  <FileListItem
                    key={file.id}
                    file={file}
                    isSelected={selectedFile === file.id}
                    onClick={() => loadFile(file.id)}
                  />
                ))}
              </TabsContent>

              <TabsContent value="system" className="space-y-2 mt-0">
                {systemFiles.map(file => (
                  <FileListItem
                    key={file.id}
                    file={file}
                    isSelected={selectedFile === file.id}
                    onClick={() => loadFile(file.id)}
                  />
                ))}
              </TabsContent>

              <TabsContent value="knowledge" className="space-y-2 mt-0">
                {knowledgeFiles.map(file => (
                  <FileListItem
                    key={file.id}
                    file={file}
                    isSelected={selectedFile === file.id}
                    onClick={() => loadFile(file.id)}
                  />
                ))}
              </TabsContent>

              <TabsContent value="help" className="mt-0">
                <HelpContent />
              </TabsContent>
            </Tabs>
          </Card>

          {/* System Overview */}
          <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <h3 className="font-semibold mb-2 text-sm flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-600" />
              Progressive Disclosure
            </h3>
            <p className="text-xs text-muted-foreground">
              LLM loads only what it needs:
            </p>
            <ul className="text-xs text-muted-foreground mt-2 space-y-1">
              <li>1. Read AGENTS.md (routing table)</li>
              <li>2. Load soul.md (voice)</li>
              <li>3. Load specific files per question type</li>
              <li>4. Answer in Rainbow's voice</li>
            </ul>
            <div className="mt-3 p-2 bg-white rounded border border-purple-200">
              <p className="text-xs font-semibold text-purple-700">
                Token Savings: ~60-70%
              </p>
            </div>
          </Card>
        </div>

        {/* Editor Panel */}
        <div className="lg:col-span-8">
          {!selectedFile ? (
            <Card className="p-12 text-center">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No File Selected</h3>
              <p className="text-muted-foreground">
                Select a file from the sidebar to view and edit
              </p>
            </Card>
          ) : (
            <Card className="p-0 overflow-hidden">
              {/* Editor Header */}
              <div className="p-4 border-b bg-muted/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedFileInfo && (
                    <>
                      <selectedFileInfo.icon className={`h-5 w-5 ${selectedFileInfo.color}`} />
                      <div>
                        <h3 className="font-semibold">{selectedFile}</h3>
                        <p className="text-xs text-muted-foreground">
                          {selectedFileInfo.description}
                        </p>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 border rounded-lg p-1">
                    <Button
                      variant={viewMode === "edit" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("edit")}
                      className="h-7 px-2"
                    >
                      <Code className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant={viewMode === "preview" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("preview")}
                      className="h-7 px-2"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Preview
                    </Button>
                  </div>
                  {isEditing && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetContent}
                        disabled={isSaving}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Reset
                      </Button>
                      <Button
                        size="sm"
                        onClick={saveFile}
                        disabled={isSaving}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        {isSaving ? "Saving..." : "Save"}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Unsaved Changes Warning */}
              {isEditing && (
                <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200 flex items-center gap-2 text-sm text-yellow-800">
                  <AlertCircle className="h-4 w-4" />
                  <span>You have unsaved changes</span>
                </div>
              )}

              {/* Editor Content */}
              <div className="p-4">
                {isLoading ? (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Loading {selectedFile}...</p>
                    </div>
                  </div>
                ) : viewMode === "edit" ? (
                  <Textarea
                    value={fileContent}
                    onChange={(e) => handleContentChange(e.target.value)}
                    className="min-h-[600px] font-mono text-sm"
                    placeholder="File content will appear here..."
                  />
                ) : (
                  <div className="prose prose-sm max-w-none min-h-[600px] p-4 bg-muted/20 rounded">
                    <MarkdownPreview content={fileContent} />
                  </div>
                )}
              </div>

              {/* Editor Footer */}
              <div className="px-4 py-2 border-t bg-muted/50 flex items-center justify-between text-xs text-muted-foreground">
                <div>
                  {fileContent.split('\n').length} lines • {fileContent.length} characters
                </div>
                {isEditing && (
                  <div className="text-yellow-600 font-medium">
                    Modified • Not saved
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function FileListItem({ file, isSelected, onClick }: {
  file: typeof KB_FILES[0];
  isSelected: boolean;
  onClick: () => void;
}) {
  const Icon = file.icon;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition-all ${
        isSelected
          ? 'bg-purple-50 border-purple-300 shadow-sm'
          : 'bg-white hover:bg-muted/50 border-border'
      }`}
    >
      <div className="flex items-start gap-2">
        <Icon className={`h-4 w-4 ${file.color} mt-0.5 shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{file.name}</div>
          <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {file.description}
          </div>
        </div>
      </div>
    </button>
  );
}

function HelpContent() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggle = (key: string) =>
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => toggle(id)}
        className="w-full text-left p-3 font-medium text-sm flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        {title}
        <span className="text-muted-foreground">{openSections[id] ? "−" : "+"}</span>
      </button>
      {openSections[id] && (
        <div className="px-3 pb-3 text-sm text-muted-foreground space-y-2">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="h-4 w-4 text-blue-600" />
        <span className="font-semibold text-sm">How It Works</span>
      </div>

      <Section id="progressive" title="Progressive Disclosure">
        <p>Instead of loading ALL knowledge base files into every LLM prompt, Rainbow uses <strong>progressive disclosure</strong>:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li><strong>AGENTS.md</strong> is the entry point (always loaded with every message)</li>
          <li><strong>soul.md</strong> defines Rainbow's personality (always loaded)</li>
          <li>Topic files (payment.md, checkin.md, etc.) loaded <strong>ONLY when relevant</strong></li>
          <li>Keyword detection selects which files to load per message</li>
          <li>Result: <strong>60-70% fewer tokens</strong> per LLM call</li>
        </ul>
      </Section>

      <Section id="sysprompt" title="System Prompt vs Knowledge Base">
        <ul className="list-disc pl-4 space-y-1">
          <li><strong>System Prompt</strong> (Settings page) = HOW Rainbow behaves (tone, rules, boundaries, escalation)</li>
          <li><strong>Knowledge Base</strong> (this page) = WHAT Rainbow knows (facts, prices, policies, procedures)</li>
        </ul>
        <p className="mt-2 italic">Rule: If it could change without changing behavior, put it in KB. If it defines behavior, put it in System Prompt.</p>
      </Section>

      <Section id="files" title="File Organization">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1 pr-2">File</th>
                <th className="text-left py-1 pr-2">Loaded When</th>
                <th className="text-left py-1">Contains</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr><td className="py-1 pr-2 font-mono">AGENTS.md</td><td className="py-1 pr-2">Always</td><td className="py-1">Entry point, routing table</td></tr>
              <tr><td className="py-1 pr-2 font-mono">soul.md</td><td className="py-1 pr-2">Always</td><td className="py-1">Personality, voice, boundaries</td></tr>
              <tr><td className="py-1 pr-2 font-mono">payment.md</td><td className="py-1 pr-2">Price/payment keywords</td><td className="py-1">Rates, methods, refunds</td></tr>
              <tr><td className="py-1 pr-2 font-mono">checkin.md</td><td className="py-1 pr-2">Check-in/out keywords</td><td className="py-1">Procedures, times, door codes</td></tr>
              <tr><td className="py-1 pr-2 font-mono">facilities.md</td><td className="py-1 pr-2">Facility/wifi keywords</td><td className="py-1">Amenities, services, wifi</td></tr>
              <tr><td className="py-1 pr-2 font-mono">houserules.md</td><td className="py-1 pr-2">Rules keywords</td><td className="py-1">Policies, quiet hours, smoking</td></tr>
              <tr><td className="py-1 pr-2 font-mono">faq.md</td><td className="py-1 pr-2">Default/directions</td><td className="py-1">Common questions, location</td></tr>
              <tr><td className="py-1 pr-2 font-mono">users.md</td><td className="py-1 pr-2">On demand</td><td className="py-1">Guest profiles, user context</td></tr>
              <tr><td className="py-1 pr-2 font-mono">memory.md</td><td className="py-1 pr-2">Internal only</td><td className="py-1">Memory system architecture</td></tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="tips" title="Tips for Writing Good KB Content">
        <ul className="list-disc pl-4 space-y-1">
          <li>Use clear headings (<code>## Section</code>, <code>### Subsection</code>)</li>
          <li>Include Q&A pairs for common questions</li>
          <li>State exact figures (RM45/night, not "affordable")</li>
          <li>Keep each section self-contained (don't reference "see above")</li>
          <li>Use multilingual keywords in headings when possible</li>
          <li>Mark temporary/seasonal info clearly with dates</li>
        </ul>
      </Section>

      <Section id="newfiles" title="Adding New KB Files">
        <ol className="list-decimal pl-4 space-y-1">
          <li>Create a new <code>.md</code> file in the <code>.rainbow-kb/</code> directory</li>
          <li>Add keyword patterns in <code>knowledge-base.ts</code> TOPIC_FILE_MAP</li>
          <li>The file will appear in this editor automatically</li>
          <li>Update AGENTS.md routing table to include the new file</li>
        </ol>
      </Section>
    </div>
  );
}

function MarkdownPreview({ content }: { content: string }) {
  // Simple markdown-to-HTML preview (you can enhance this with a proper markdown library)
  const renderMarkdown = (text: string) => {
    // Basic heading conversion
    let html = text
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br />');

    return html;
  };

  return (
    <div
      className="markdown-preview"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}
