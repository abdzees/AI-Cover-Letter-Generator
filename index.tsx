
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx'; // Explicitly add .tsx extension
import * as pdfjsLib from 'pdfjs-dist';

// Set up pdf.js worker
// Use the version of pdf.js that is currently loaded from esm.sh.
// The worker can be found in the `build` directory of the `pdfjs-dist` package.
// We use the .mjs version for ES module compatibility.
if (pdfjsLib.version) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;
} else {
  // Fallback if pdfjsLib.version is somehow not available, though it's highly unlikely.
  // This uses a specific version known from the import map as a last resort.
  console.warn('pdfjsLib.version was not available. Using a pinned version for pdf.worker.mjs. This might lead to issues if versions mismatch.');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@5.3.31/build/pdf.worker.mjs`;
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);