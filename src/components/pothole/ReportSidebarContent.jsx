import React from 'react';
import DuplicateWarning from './DuplicateWarning';
import ReportForm from './ReportForm';

function ReportSidebarContent({
  duplicateCandidate,
  duplicatePin,
  newPin,
  jurisdictionInfo,
  isLoadingJurisdiction,
  distanceFt,
  onConfirmDuplicate,
  onReportAnyway,
  onDismissDuplicate,
  onSubmit,
  onCancel,
}) {
  return (
    <>
      {duplicateCandidate && !newPin && (
        <DuplicateWarning
          candidate={duplicateCandidate}
          pin={duplicatePin}
          distanceFt={distanceFt}
          onConfirm={onConfirmDuplicate}
          onReportAnyway={onReportAnyway}
          onDismiss={onDismissDuplicate}
        />
      )}
      {newPin && !duplicateCandidate && (
        <ReportForm
          pin={newPin}
          jurisdictionInfo={jurisdictionInfo}
          isLoadingJurisdiction={isLoadingJurisdiction}
          onSubmit={onSubmit}
          onCancel={onCancel}
        />
      )}
    </>
  );
}

export default React.memo(ReportSidebarContent);