import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Cloud, 
  Database, 
  HardDrive, 
  Settings, 
  Copy, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  Rocket, 
  Shield, 
  FileText,
  ExternalLink,
  Terminal,
  Zap,
  Globe,
  Key,
  Server
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WizardStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

interface EnvironmentVariable {
  name: string;
  value: string;
  description: string;
  required: boolean;
  placeholder: string;
}

interface ReplitDeploymentWizardProps {
  onComplete?: () => void;
  autoOpen?: boolean;
}

export function ReplitDeploymentWizard({ onComplete, autoOpen = false }: ReplitDeploymentWizardProps) {
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [currentStep, setCurrentStep] = useState(0);
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [selectedDatabaseOption, setSelectedDatabaseOption] = useState<string>("replit");
  const { toast } = useToast();

  const steps: WizardStep[] = [
    {
      id: "overview",
      title: "Welcome to Replit Deployment",
      description: "Let's get your PelangiManager running smoothly on Replit",
      completed: false
    },
    {
      id: "database",
      title: "Choose Your Database",
      description: "Select the best database option for your needs",
      completed: false
    },
    {
      id: "environment",
      title: "Environment Variables",
      description: "Configure essential settings for production",
      completed: false
    },
    {
      id: "deployment",
      title: "Deploy & Test",
      description: "Final steps to get your app running",
      completed: false
    }
  ];

  const environmentVariables: EnvironmentVariable[] = [
    {
      name: "DATABASE_URL",
      value: envVars.DATABASE_URL || "",
      description: "Your PostgreSQL database connection string",
      required: true,
      placeholder: "postgresql://username:password@host:port/database"
    },
    {
      name: "JWT_SECRET",
      value: envVars.JWT_SECRET || "",
      description: "Secret key for JWT authentication (generate a strong random string)",
      required: true,
      placeholder: "your-super-secret-jwt-key-here"
    },
    {
      name: "PORT",
      value: envVars.PORT || "5000",
      description: "Port number for your application (Replit usually uses 5000)",
      required: false,
      placeholder: "5000"
    },
    {
      name: "NODE_ENV",
      value: envVars.NODE_ENV || "production",
      description: "Environment mode (keep as 'production' for Replit)",
      required: false,
      placeholder: "production"
    },
    {
      name: "PRIVATE_OBJECT_DIR",
      value: envVars.PRIVATE_OBJECT_DIR || "",
      description: "Replit Object Storage bucket for file uploads (optional but recommended)",
      required: false,
      placeholder: "gs://your-bucket-name"
    }
  ];

  const databaseOptions = [
    {
      id: "replit",
      title: "Replit PostgreSQL Database",
      description: "Built-in PostgreSQL database provided by Replit",
      icon: Cloud,
      pros: ["Free with Replit", "Easy setup", "Integrated", "No external accounts"],
      cons: ["Limited storage", "Data resets on repl deletion"],
      setupSteps: [
        "1. In Replit, go to 'Tools' → 'Database'",
        "2. Click 'Create Database' and select PostgreSQL",
        "3. Copy the connection string",
        "4. Paste it in the DATABASE_URL field below"
      ]
    },
    {
      id: "neon",
      title: "Neon Database (External)",
      description: "Free cloud PostgreSQL database with generous limits",
      icon: Database,
      pros: ["Free tier available", "Persistent data", "Better performance", "No data loss"],
      cons: ["External service", "Requires account setup"],
      setupSteps: [
        "1. Go to neon.tech and create free account",
        "2. Create new project and database",
        "3. Copy connection string",
        "4. Paste it in the DATABASE_URL field below"
      ]
    },
    {
      id: "memory",
      title: "Memory Storage (Testing Only)",
      description: "In-memory storage for development and testing",
      icon: HardDrive,
      pros: ["Instant setup", "No configuration needed", "Good for testing"],
      cons: ["Data resets on every restart", "Not suitable for production"],
      setupSteps: [
        "1. Leave DATABASE_URL empty",
        "2. Your app will automatically use memory storage",
        "3. Perfect for testing features quickly"
      ]
    }
  ];

  const handleEnvVarChange = (name: string, value: string) => {
    setEnvVars(prev => ({ ...prev, [name]: value }));
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Please copy manually",
        variant: "destructive",
      });
    }
  };

  const generateJWTSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    handleEnvVarChange('JWT_SECRET', result);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isStepValid = (stepIndex: number): boolean => {
    switch (stepIndex) {
      case 0: return true; // Overview always valid
      case 1: return selectedDatabaseOption !== ""; // Database selection
      case 2: {
        // Check required environment variables
        const requiredVars = environmentVariables.filter(v => v.required);
        return requiredVars.every(v => envVars[v.name] && envVars[v.name].trim() !== "");
      }
      case 3: return true; // Deployment always valid
      default: return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Rocket className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Ready to Deploy on Replit?</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                This wizard will guide you through setting up your database and environment variables 
                to make your PelangiManager deployment smooth and hassle-free.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="text-center p-4">
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <Database className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="font-semibold text-gray-900">Database Setup</h4>
                <p className="text-sm text-gray-600">Choose between Replit DB, Neon, or memory storage</p>
              </Card>
              
              <Card className="text-center p-4">
                <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                  <Settings className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900">Environment Config</h4>
                <p className="text-sm text-gray-600">Set up all required environment variables</p>
              </Card>
              
              <Card className="text-center p-4">
                <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3">
                  <Zap className="w-6 h-6 text-purple-600" />
                </div>
                <h4 className="font-semibold text-gray-900">Deploy & Test</h4>
                <p className="text-sm text-gray-600">Get your app running and verify everything works</p>
              </Card>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Pro Tip:</strong> This wizard will generate all the commands and configuration 
                you need. You can always come back to it later from the settings page.
              </AlertDescription>
            </Alert>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Choose Your Database Strategy</h3>
              <p className="text-gray-600">Select the option that best fits your needs and budget</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {databaseOptions.map((option) => (
                <Card 
                  key={option.id}
                  className={`cursor-pointer transition-all ${
                    selectedDatabaseOption === option.id 
                      ? 'ring-2 ring-blue-500 bg-blue-50' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedDatabaseOption(option.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        selectedDatabaseOption === option.id ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        <option.icon className={`w-6 h-6 ${
                          selectedDatabaseOption === option.id ? 'text-blue-600' : 'text-gray-600'
                        }`} />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-gray-900">{option.title}</h4>
                          {selectedDatabaseOption === option.id && (
                            <CheckCircle className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <p className="text-gray-600 mb-3">{option.description}</p>
                        
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <h5 className="font-medium text-green-700 text-sm mb-1">✅ Pros</h5>
                            <ul className="text-xs text-green-600 space-y-1">
                              {option.pros.map((pro, idx) => (
                                <li key={idx}>• {pro}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h5 className="font-medium text-red-700 text-sm mb-1">⚠️ Cons</h5>
                            <ul className="text-xs text-red-600 space-y-1">
                              {option.cons.map((con, idx) => (
                                <li key={idx}>• {con}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <h5 className="font-medium text-gray-900 text-sm mb-2">Setup Steps:</h5>
                          <ol className="text-xs text-gray-700 space-y-1">
                            {option.setupSteps.map((step, idx) => (
                              <li key={idx}>{step}</li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {selectedDatabaseOption === "replit" && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Replit Database:</strong> This is the easiest option. Your database will be 
                  automatically created and managed by Replit. Perfect for getting started quickly!
                </AlertDescription>
              </Alert>
            )}

            {selectedDatabaseOption === "neon" && (
              <Alert>
                <ExternalLink className="h-4 w-4" />
                <AlertDescription>
                  <strong>Neon Database:</strong> You'll need to create an account at{' '}
                  <a href="https://neon.tech" target="_blank" rel="noopener noreferrer" 
                     className="text-blue-600 hover:underline font-medium">
                    neon.tech
                  </a>{' '}
                  first, then come back here to configure the connection.
                </AlertDescription>
              </Alert>
            )}

            {selectedDatabaseOption === "memory" && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Memory Storage:</strong> This is great for testing but remember that all 
                  data will be lost when you restart your app. Not recommended for production use.
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Configure Environment Variables</h3>
              <p className="text-gray-600">
                Set up the essential configuration for your Replit deployment. 
                Required fields are marked with a red asterisk (*).
              </p>
            </div>

            <div className="space-y-4">
              {environmentVariables.map((envVar) => (
                <Card key={envVar.name} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={envVar.name} className="font-medium">
                        {envVar.name}
                        {envVar.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      {envVar.name === "JWT_SECRET" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={generateJWTSecret}
                          className="h-6 px-2 text-xs"
                        >
                          Generate
                        </Button>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600">{envVar.description}</p>
                    
                    {envVar.name === "DATABASE_URL" && selectedDatabaseOption === "replit" && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>For Replit Database:</strong> After creating your database in Replit, 
                          you'll get a connection string that looks like: 
                          <code className="block mt-1 p-2 bg-blue-100 rounded text-xs">
                            postgresql://username:password@host:port/database
                          </code>
                        </p>
                      </div>
                    )}
                    
                    {envVar.name === "DATABASE_URL" && selectedDatabaseOption === "neon" && (
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-sm text-green-800">
                          <strong>For Neon Database:</strong> Copy the connection string from your Neon dashboard. 
                          It should look like: 
                          <code className="block mt-1 p-2 bg-green-100 rounded text-xs">
                            postgresql://username:password@host:port/database?sslmode=require
                          </code>
                        </p>
                      </div>
                    )}
                    
                    {envVar.name === "DATABASE_URL" && selectedDatabaseOption === "memory" && (
                      <div className="bg-yellow-50 p-3 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          <strong>For Memory Storage:</strong> Leave this field empty. Your app will 
                          automatically use in-memory storage.
                        </p>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Input
                        id={envVar.name}
                        type={envVar.name === "JWT_SECRET" ? "password" : "text"}
                        placeholder={envVar.placeholder}
                        value={envVar.value}
                        onChange={(e) => handleEnvVarChange(envVar.name, e.target.value)}
                        className="flex-1"
                      />
                      {envVar.value && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(envVar.value, envVar.name)}
                          className="px-3"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Security Note:</strong> Never commit your JWT_SECRET or database credentials to 
                version control. These environment variables are automatically kept secure by Replit.
              </AlertDescription>
            </Alert>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Ready to Deploy!</h3>
              <p className="text-gray-600">
                Here's your complete deployment checklist and next steps
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Terminal className="w-5 h-5" />
                    Environment Variables
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {environmentVariables.map((envVar) => (
                      <div key={envVar.name} className="flex items-center justify-between text-sm">
                        <span className="font-medium">{envVar.name}</span>
                        <Badge variant={envVar.value ? "default" : "destructive"}>
                          {envVar.value ? "Set" : "Missing"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="w-5 h-5" />
                    Deployment Steps
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">1</span>
                      <span>Set environment variables in Replit</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">2</span>
                      <span>Install dependencies: <code className="bg-gray-100 px-1 rounded">npm install</code></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">3</span>
                      <span>Build the app: <code className="bg-gray-100 px-1 rounded">npm run build</code></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">4</span>
                      <span>Start production: <code className="bg-gray-100 px-1 rounded">npm start</code></span>
                    </li>
                  </ol>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Environment Variables for Replit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                  <div className="mb-2 text-gray-400"># Copy these to Replit Environment Variables:</div>
                  {environmentVariables
                    .filter(envVar => envVar.value && envVar.value.trim() !== "")
                    .map((envVar) => (
                      <div key={envVar.name}>
                        {envVar.name}={envVar.value}
                      </div>
                    ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3"
                  onClick={() => {
                    const envString = environmentVariables
                      .filter(envVar => envVar.value && envVar.value.trim() !== "")
                      .map(envVar => `${envVar.name}=${envVar.value}`)
                      .join('\n');
                    copyToClipboard(envString, "Environment variables");
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy All Environment Variables
                </Button>
              </CardContent>
            </Card>

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>You're all set!</strong> After setting the environment variables in Replit, 
                your app should deploy successfully. Use the database selector in the navigation to 
                switch between storage types if needed.
              </AlertDescription>
            </Alert>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          id="replit-wizard-trigger"
          variant="outline" 
          size="sm" 
          className="text-xs px-2 py-1 h-7 gap-1"
        >
          <Rocket className="w-3 h-3" />
          <span className="hidden sm:inline">Replit Setup</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5" />
            Replit Deployment Wizard
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index <= currentStep 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-1 mx-2 ${
                    index < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          
          <div className="text-center">
            <h3 className="font-semibold text-gray-900">{steps[currentStep].title}</h3>
            <p className="text-sm text-gray-600">{steps[currentStep].description}</p>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Step Content */}
        <div className="min-h-[400px]">
          {renderStepContent()}
        </div>

        <Separator className="my-6" />

        {/* Navigation */}
        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" onClick={prevStep}>
                Previous
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            {currentStep < steps.length - 1 ? (
              <Button 
                onClick={nextStep}
                disabled={!isStepValid(currentStep)}
              >
                Next
              </Button>
            ) : (
              <Button onClick={() => {
                setIsOpen(false);
                onComplete?.();
              }}>
                Complete Setup
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
