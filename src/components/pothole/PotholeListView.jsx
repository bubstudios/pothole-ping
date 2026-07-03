import React from 'react';
import { Input } from '@/components/ui/input';
import { Search, AlertTriangle } from 'lucide-react';
import MobileSelect from '@/components/ui/mobile-select';
import PotholeListItem from '@/components/pothole/PotholeListItem';
import RecentlyFixed from '@/components/pothole/RecentlyFixed';
import PullToRefresh from '@/components/PullToRefresh';

function PotholeListView({
  searchQuery,
  setSearchQuery,
  listSortBy,
  setListSortBy,
  listSeverityFilter,
  setListSeverityFilter,
  potholes,
  filteredPotholes,
  handlePotholeClick,
  loadPotholes,
  potholeOffset,
  hasMorePotholes,
  loadingMorePotholes,
  setLoadingMorePotholes,
}) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="p-3 border-b space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by address, city, or description..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 text-xs">
          <MobileSelect value={listSortBy} onValueChange={setListSortBy} options={[{value:'newest',label:'Newest First'},{value:'oldest',label:'Oldest First'},{value:'most_confirmed',label:'Most Confirmed'}]} placeholder="Sort by" className="flex-1" />
          <MobileSelect value={listSeverityFilter} onValueChange={setListSeverityFilter} options={[{value:'all',label:'All Severities'},{value:'minor',label:'Minor'},{value:'moderate',label:'Moderate'},{value:'severe',label:'Severe'},{value:'dangerous',label:'Dangerous'}]} placeholder="All Severities" className="flex-1" />
        </div>
      </div>
      <PullToRefresh onRefresh={() => loadPotholes(0)} className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-2 pb-14 sm:pb-0">
          <RecentlyFixed potholes={potholes} />
          {filteredPotholes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No potholes found</p>
            </div>
          ) : (
            <>
              {filteredPotholes.map((p) => (
                <PotholeListItem key={p.id} pothole={p} onClick={handlePotholeClick} />
              ))}
              {hasMorePotholes && (
                <button
                  onClick={() => {
                    setLoadingMorePotholes(true);
                    loadPotholes(potholeOffset);
                  }}
                  disabled={loadingMorePotholes}
                  className="w-full py-3 mt-2 text-sm font-medium text-primary hover:bg-muted rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingMorePotholes ? 'Loading...' : 'Load More'}
                </button>
              )}
            </>
          )}
        </div>
      </PullToRefresh>
    </div>
  );
}

export default React.memo(PotholeListView);