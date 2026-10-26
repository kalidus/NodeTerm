import React from 'react';
import LocalHostPanel from './LocalHostPanel';

export default function NeighborsAlias(props) {
  return <LocalHostPanel {...props} initialView="neighbors" />;
}
