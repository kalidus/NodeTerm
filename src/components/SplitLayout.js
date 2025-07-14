import React, { useRef } from 'react';
import SplitPane from 'react-split-pane';
import TerminalComponent from './TerminalComponent';

const SplitLayout = ({ 
  leftTerminal, 
  rightTerminal, 
  fontFamily, 
  fontSize, 
  theme, 
  onContextMenu, 
  sshStatsByTabId,
  terminalRefs
}) => {
  const leftTerminalRef = useRef(null);
  const rightTerminalRef = useRef(null);

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, minHeight: 0 }}>
      <SplitPane
        split="horizontal"
        minSize={50}
        defaultSize="50%"
        style={{ position: 'relative', height: '100%', width: '100%' }}
        paneStyle={{ display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}
        pane1Style={{ display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}
        pane2Style={{ display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}
        allowResize
      >
        <TerminalComponent
          ref={el => {
            leftTerminalRef.current = el;
            if (terminalRefs) terminalRefs.current[leftTerminal.key] = el;
          }}
          tabId={leftTerminal.key}
          sshConfig={leftTerminal.sshConfig}
          fontFamily={fontFamily}
          fontSize={fontSize}
          theme={theme}
          onContextMenu={onContextMenu}
          active={true}
          stats={sshStatsByTabId[leftTerminal.key]}
          hideStatusBar={true}
        />
        <TerminalComponent
          ref={el => {
            rightTerminalRef.current = el;
            if (terminalRefs) terminalRefs.current[rightTerminal.key] = el;
          }}
          tabId={rightTerminal.key}
          sshConfig={rightTerminal.sshConfig}
          fontFamily={fontFamily}
          fontSize={fontSize}
          theme={theme}
          onContextMenu={onContextMenu}
          active={true}
          stats={sshStatsByTabId[rightTerminal.key]}
          hideStatusBar={true}
        />
      </SplitPane>
    </div>
  );
};

export default SplitLayout; 