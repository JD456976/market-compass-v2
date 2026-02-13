/**
 * Report Template Context — provides template-aware rendering across report sections.
 * Templates: 'modern' (clean/minimal), 'executive' (full data), 'snapshot' (1-page summary).
 */

import { createContext, useContext, ReactNode } from 'react';

export type ReportTemplate = 'modern' | 'executive' | 'snapshot';

interface ReportContextValue {
  template: ReportTemplate;
  isFirstPage: boolean;
  setIsFirstPage: (v: boolean) => void;
}

const ReportCtx = createContext<ReportContextValue>({
  template: 'modern',
  isFirstPage: true,
  setIsFirstPage: () => {},
});

export const useReportTemplate = () => useContext(ReportCtx);

interface ReportProviderProps {
  template: ReportTemplate;
  children: ReactNode;
}

export function ReportProvider({ template, children }: ReportProviderProps) {
  return (
    <ReportCtx.Provider value={{ template, isFirstPage: true, setIsFirstPage: () => {} }}>
      <div className={`template-${template} report-styled space-y-6`}>
        {children}
      </div>
    </ReportCtx.Provider>
  );
}

/**
 * Conditionally renders children based on active template.
 * @param show - Array of templates that should render this content
 * @param hide - Array of templates that should NOT render this content
 */
export function TemplateSection({
  show,
  hide,
  children,
}: {
  show?: ReportTemplate[];
  hide?: ReportTemplate[];
  children: ReactNode;
}) {
  const { template } = useReportTemplate();
  if (show && !show.includes(template)) return null;
  if (hide && hide.includes(template)) return null;
  return <>{children}</>;
}
