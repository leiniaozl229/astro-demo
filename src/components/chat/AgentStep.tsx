import { cn } from '../../utils/cn';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

interface AgentStepProps {
  title: string;
  status: 'success' | 'loading' | 'pending';
}

export function AgentStep({ title, status }: AgentStepProps) {
  const icons = {
    success: (
      <div className="flex items-center justify-center w-5 h-5 bg-green-50 rounded-full">
        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
      </div>
    ),
    loading: (
      <div className="flex items-center justify-center w-5 h-5 bg-blue-50 rounded-full">
        <Loader2 className="h-3.5 w-3.5 text-blue-600 animate-spin" />
      </div>
    ),
    pending: (
      <div className="flex items-center justify-center w-5 h-5 bg-gray-100 rounded-full">
        <Circle className="h-3.5 w-3.5 text-gray-400" />
      </div>
    ),
  };

  const bgColors = {
    success: 'bg-green-50 border-green-100',
    loading: 'bg-blue-50 border-blue-100',
    pending: 'bg-gray-50 border-gray-100',
  };

  const textColors = {
    success: 'text-green-700',
    loading: 'text-blue-700',
    pending: 'text-gray-500',
  };

  return (
    <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium', bgColors[status])}>
      {icons[status]}
      <span className={cn('', textColors[status])}>{title}</span>
    </div>
  );
}
