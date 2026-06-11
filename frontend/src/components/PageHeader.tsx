import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  back?: ReactNode;
}

export default function PageHeader({ title, description, action, back }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
      <div className="flex items-start gap-3 min-w-0">
        {back}
        <div>
          <h1 className="text-lg font-medium text-gray-900 dark:text-gray-100">{title}</h1>
          {description && (
            <p className="mt-0.5 text-sm text-gray-500">{description}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}
