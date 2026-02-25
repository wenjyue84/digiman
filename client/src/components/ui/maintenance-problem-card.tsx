import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  User, 
  Calendar, 
  ChevronDown, 
  ChevronUp,
  Wrench,
  MessageSquare
} from 'lucide-react';
import type { UnitProblem } from '@shared/schema';

interface MaintenanceProblemCardProps {
  problem: UnitProblem;
  onResolve: (problemId: string, notes?: string) => void;
  isResolving?: boolean;
  className?: string;
}

export function MaintenanceProblemCard({ 
  problem, 
  onResolve, 
  isResolving = false,
  className = '' 
}: MaintenanceProblemCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusInfo = () => {
    if (problem.isResolved) {
      return {
        icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
        label: 'Resolved',
        variant: 'outline' as const,
        className: 'bg-green-50 text-green-700 border-green-200',
        cardClass: 'border-green-200 bg-green-50',
        badgeClass: 'bg-green-600 text-white'
      };
    }
    
    return {
      icon: <AlertTriangle className="h-4 w-4 text-orange-600" />,
      label: 'Active',
      variant: 'destructive' as const,
      className: 'bg-orange-50 text-orange-700 border-orange-200',
      cardClass: 'border-orange-200 bg-orange-50',
      badgeClass: 'bg-orange-600 text-white'
    };
  };

  const statusInfo = getStatusInfo();

  const handleResolve = () => {
    if (problem.isResolved) return;
    onResolve(problem.id, resolutionNotes);
    setResolutionNotes('');
  };

  return (
    <Card className={`${statusInfo.cardClass} ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">{problem.unitNumber}</h3>
            <Badge 
              variant={statusInfo.variant}
              className={statusInfo.badgeClass}
            >
              {statusInfo.icon}
              <span className="ml-1">{statusInfo.label}</span>
            </Badge>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0 hover:bg-white/50"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        <div className="space-y-2 mb-4">
          <p className="text-sm text-gray-700">{problem.description}</p>
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="h-4 w-4" />
            <span>Reported by {problem.reportedBy}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>Reported {formatDate(problem.reportedAt)}</span>
          </div>
          
          {problem.isResolved && problem.resolvedAt && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>Resolved {formatDate(problem.resolvedAt)}</span>
            </div>
          )}
          
          {problem.isResolved && problem.resolvedBy && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Wrench className="h-4 w-4" />
              <span>By {problem.resolvedBy}</span>
            </div>
          )}
          
          {problem.isResolved && problem.notes && (
            <div className="flex items-start gap-2 text-sm text-green-600">
              <MessageSquare className="h-4 w-4 mt-0.5" />
              <span className="flex-1">{problem.notes}</span>
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-center">
          <div className="text-xs text-gray-500">
            {problem.isResolved ? 'Issue resolved' : 'Requires attention'}
          </div>
          
          {!problem.isResolved && (
            <Button
              size="sm"
              onClick={handleResolve}
              disabled={isResolving}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isResolving ? (
                <Clock className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-1" />
              )}
              {isResolving ? 'Resolving...' : 'Mark Resolved'}
            </Button>
          )}
        </div>
        
        {/* Expandable Resolution Section */}
        {isExpanded && !problem.isResolved && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Label htmlFor={`notes-${problem.id}`} className="text-xs font-medium">
              Resolution Notes (Optional)
            </Label>
            <Textarea
              id={`notes-${problem.id}`}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Add any notes about the resolution..."
              className="mt-1 min-h-[80px] text-sm"
            />
            <Button
              size="sm"
              onClick={handleResolve}
              disabled={isResolving || !resolutionNotes.trim()}
              className="mt-2 bg-green-600 hover:bg-green-700 text-white"
            >
              {isResolving ? (
                <Clock className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-1" />
              )}
              {isResolving ? 'Resolving...' : 'Resolve Issue'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


