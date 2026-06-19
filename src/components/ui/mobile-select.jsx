import React, { useState, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MobileSelect({
  value,
  onValueChange,
  options,
  triggerClassName,
  placeholder = 'Select...',
  className,
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const selectedOption = options.find((o) => o.value === value);

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className={cn(
            'flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm',
            className,
            triggerClassName
          )}
        >
          <span className={selectedOption ? '' : 'text-muted-foreground'}>
            {selectedOption?.label || placeholder}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
        </button>
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{placeholder}</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-8 space-y-1 max-h-[60vh] overflow-y-auto">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onValueChange(option.value);
                    setDrawerOpen(false);
                  }}
                  className={cn(
                    'w-full text-left px-4 py-3 rounded-lg text-sm transition-colors',
                    option.value === value
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-muted'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={cn(className, triggerClassName)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="z-[9999]">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}