import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  back?: ReactNode;
}

export default function PageHeader({ title, description, action, back }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-8">
      <div className="flex items-start gap-3 min-w-0">
        {back}
        <div>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}
