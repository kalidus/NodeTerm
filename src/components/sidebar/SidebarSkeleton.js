import React from 'react';

/** Skeleton loader para simular árbol de directorios. */
const SidebarSkeleton = () => {
  return (
    <div className="sidebar-skeleton">
      {[...Array(6)].map((_, idx) => {
        let indent = '0px';
        if (idx === 1 || idx === 4) indent = '16px';
        else if (idx === 2) indent = '32px';

        let width = '70%';
        if (idx === 1) width = '50%';
        else if (idx === 2) width = '60%';
        else if (idx === 4) width = '55%';
        else if (idx === 5) width = '40%';

        return (
          <div key={idx} className="sidebar-skeleton-item" style={{ paddingLeft: indent }}>
            <div className="sidebar-skeleton-icon" />
            <div className="sidebar-skeleton-text" style={{ width }} />
          </div>
        );
      })}
    </div>
  );
};

export default SidebarSkeleton;
